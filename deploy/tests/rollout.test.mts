// Exercise deployment ordering and failures without Docker, SSH or network access.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import type { Scenario } from "./fixtures/fake-command.mts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = new URL("./fixtures/fake-command.mts", import.meta.url).href;
const isCommand = (
  call: readonly string[],
  first: string,
  second: string,
): boolean => call[0] === "docker" && call[1] === first && call[2] === second;

function parseCall(line: string): string[] {
  const value: unknown = JSON.parse(line);
  if (
    !Array.isArray(value) ||
    !value.every((part: unknown): part is string => typeof part === "string")
  ) {
    throw new Error("Malformed command log in deployment fixture");
  }
  return value;
}

function runRollout(scenario: Scenario, overrides: NodeJS.ProcessEnv = {}) {
  const directory = mkdtempSync(join(tmpdir(), "bulkbets-rollout-test-"));
  try {
    for (const command of ["docker", "curl", "date", "sleep"]) {
      // JSON escaping is for JavaScript source here; no shell command is built.
      writeFileSync(
        join(directory, command),
        `#!/usr/bin/env node\nimport(${JSON.stringify(fixture)}).then(({ runFakeCommand }) => runFakeCommand(${JSON.stringify(command)}, process.argv.slice(2)));\n`,
        { mode: 0o755 },
      );
    }
    const result = spawnSync("sh", ["deploy/rollout.sh"], {
      cwd: root,
      encoding: "utf8",
      timeout: 20_000,
      env: {
        ...process.env,
        PATH: directory + delimiter + process.env.PATH,
        BULKBETS_ROLLOUT_TEST_DIR: directory,
        BULKBETS_ROLLOUT_TEST_SCENARIO: scenario,
        GIT_COMMIT_HASH: "a".repeat(40),
        APP_HOST: "app.example.test",
        API_HOST: "api.example.test",
        DB_HOST: "infra_postgres",
        STACK_NAME: "bulkbets",
        SMTP_ADDR: "smtp.example.test:587",
        SMTP_FROM: "noreply@example.test",
        CORS_ALLOWED_ORIGINS: "",
        GOOGLE_CLIENT_ID: "",
        DB_ADMIN_USER_SECRET: "",
        DB_ADMIN_PASSWORD_SECRET: "",
        DEPLOY_TIMEOUT_SECONDS: "2",
        ...overrides,
      },
    });
    if (result.error) throw result.error;
    assert.equal(
      result.signal,
      null,
      "Deployment process was unexpectedly killed",
    );
    const log = join(directory, "calls");
    const calls = existsSync(log)
      ? readFileSync(log, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(parseCall)
      : [];
    return { ...result, calls };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const scenario of ["healthy", "new_service"] as const) {
  test(`migrate and seed before a healthy rollout: ${scenario}`, () => {
    const result = runRollout(scenario);
    assert.equal(result.status, 0, result.stderr);
    const creates = result.calls.flatMap((call, index) =>
      isCommand(call, "service", "create") ? [index] : [],
    );
    const deploy = result.calls.findIndex((call) =>
      isCommand(call, "stack", "deploy"),
    );
    assert.deepEqual(
      result.calls
        .filter((call) => isCommand(call, "service", "create"))
        .map((call) => call.at(-1)),
      ["provision", "up", "seed", "runtime-grants"],
    );
    const lastMigration = creates.at(-1);
    const deployment = result.calls[deploy];
    assert.ok(lastMigration !== undefined && lastMigration < deploy);
    assert.ok(deployment);
    assert.ok(deployment.includes("deploy/docker-stack.smtp.yml"));
    assert.ok(!deployment.includes("deploy/docker-stack.oauth.yml"));
    assert.match(result.stdout, /Deployment healthy/);
  });
}

test("restricted releases never inspect or mount infrastructure provisioner secrets", () => {
  const result = runRollout("healthy", { PROVISION_DATABASE: "false" });
  assert.equal(result.status, 0, result.stderr);
  const jobs = result.calls.filter((call) => isCommand(call, "service", "create"));
  assert.deepEqual(jobs.map((call) => call.at(-1)), ["up", "seed", "runtime-grants"]);
  assert.ok(!result.calls.flat().some((part) => /postgres_(user|password)|provisioner/.test(part)));
  for (const job of jobs) {
    assert.ok(job.includes("--read-only"));
    assert.equal(job[job.indexOf("--user") + 1], "65532:65532");
    assert.equal(job[job.indexOf("--cap-drop") + 1], "ALL");
  }
});

test("Google configuration includes its secret and overlay", () => {
  const result = runRollout("healthy", { GOOGLE_CLIENT_ID: "test-client-id" });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.calls.some((call) => call.includes("bulkbets_google_client_secret")),
  );
  assert.ok(
    result.calls.some((call) => call.includes("deploy/docker-stack.oauth.yml")),
  );
});

for (const scenario of [
  "not_manager",
  "missing_secret",
  "migration_failed",
  "provision_failed",
] as const) {
  test(`preflight or migration failure prevents deployment: ${scenario}`, () => {
    const result = runRollout(scenario);
    assert.notEqual(result.status, 0);
    assert.ok(!result.calls.some((call) => isCommand(call, "stack", "deploy")));
    if (scenario === "migration_failed" || scenario === "provision_failed") {
      assert.ok(result.calls.some((call) => isCommand(call, "service", "rm")));
      assert.ok(
        !result.calls.some(
          (call) =>
            isCommand(call, "service", "create") &&
            (call.at(-1) === "seed" ||
              (scenario === "provision_failed" && call.at(-1) === "up")),
        ),
      );
    }
  });
}

for (const scenario of [
  "paused",
  "rollback",
  "wrong_image",
  "old_tasks",
  "unhealthy",
] as const) {
  test(`an incomplete release never reports success: ${scenario}`, () => {
    const result = runRollout(scenario);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /Deployment healthy/);
  });
}

test("invalid hosts are rejected before remote commands", () => {
  const result = runRollout("healthy", {
    API_HOST: "https://api.example.test/path",
  });
  assert.notEqual(result.status, 0);
  assert.deepEqual(result.calls, []);
});

test("only the temporary provisioning job receives infrastructure administrator secrets", () => {
  const result = runRollout("healthy");
  assert.equal(result.status, 0, result.stderr);
  const jobs = result.calls.filter((call) =>
    isCommand(call, "service", "create"),
  );
  assert.equal(jobs.length, 4);
  for (const job of jobs) {
    const provisioning = job.at(-1) === "provision";
    assert.equal(
      job.includes("source=postgres_user,target=postgres_user"),
      provisioning,
    );
    assert.equal(
      job.includes("source=postgres_password,target=postgres_password"),
      provisioning,
    );
    assert.equal(job.includes("bulkbets_admin_password"), !provisioning);
    assert.ok(job.includes("bulkbets_db_password"));
    assert.ok(
      result.calls.some(
        (call) =>
          isCommand(call, "service", "rm") &&
          call.at(-1) === job[job.indexOf("--name") + 1],
      ),
    );
  }
});

test("dedicated provisioner secrets are checked and mounted only into provisioning", () => {
  const result = runRollout("healthy", {
    DB_ADMIN_USER_SECRET: "bulkbets_provisioner_user",
    DB_ADMIN_PASSWORD_SECRET: "bulkbets_provisioner_password",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.calls.some(
      (call) =>
        isCommand(call, "secret", "inspect") &&
        call.includes("bulkbets_provisioner_user") &&
        call.includes("bulkbets_provisioner_password"),
    ),
  );
  for (const job of result.calls.filter((call) =>
    isCommand(call, "service", "create"),
  )) {
    const provisioning = job.at(-1) === "provision";
    assert.equal(
      job.includes("source=bulkbets_provisioner_user,target=postgres_user"),
      provisioning,
    );
    assert.equal(
      job.includes(
        "source=bulkbets_provisioner_password,target=postgres_password",
      ),
      provisioning,
    );
    assert.ok(!job.includes("source=postgres_user,target=postgres_user"));
  }
});
