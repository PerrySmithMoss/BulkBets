// A simulated Docker CLI and health endpoint; never contacts Docker or a VPS.
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const image = `ghcr.io/perrysmithmoss/bulkbets:${"a".repeat(40)}`;

const scenarios = [
  "healthy",
  "new_service",
  "not_manager",
  "missing_secret",
  "migration_failed",
  "provision_failed",
  "paused",
  "rollback",
  "wrong_image",
  "old_tasks",
  "unhealthy",
] as const;
export type Scenario = (typeof scenarios)[number];
type Command = "docker" | "curl" | "date" | "sleep";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing fixture setting: ${name}`);
  return value;
}

function argument(args: readonly string[], index: number): string {
  const value = args[index];
  if (value === undefined)
    throw new Error(`Missing simulated command argument at ${index}`);
  return value;
}

export function runFakeCommand(
  command: Command,
  args: readonly string[],
): void {
  const directory = requiredEnv("BULKBETS_ROLLOUT_TEST_DIR");
  const configuredScenario = requiredEnv("BULKBETS_ROLLOUT_TEST_SCENARIO");
  const scenario = scenarios.find((value) => value === configuredScenario);
  if (!scenario) throw new Error("Unknown deployment fixture scenario");
  appendFileSync(
    join(directory, "calls"),
    `${JSON.stringify([command, ...args])}\n`,
  );
  const print = (value: string | number): void => {
    process.stdout.write(`${value}\n`);
  };
  const is = (first: string, second: string): boolean =>
    args[0] === first && args[1] === second;

  if (command === "sleep") return;
  if (command === "curl") {
    if (scenario === "unhealthy") process.exitCode = 1;
    return;
  }
  if (command === "date") {
    if (args.length === 1 && args[0] === "+%s") {
      const clock = join(directory, "clock");
      const value = existsSync(clock)
        ? Number(readFileSync(clock, "utf8")) + 1
        : 1;
      writeFileSync(clock, String(value));
      print(value);
    } else {
      print("20261102120000");
    }
    return;
  }

  if (args[0] === "info") {
    print(scenario === "not_manager" ? "false" : "true");
  } else if (is("network", "inspect")) {
    return;
  } else if (is("secret", "inspect")) {
    if (scenario === "missing_secret") process.exitCode = 1;
  } else if (is("stack", "config") || is("stack", "deploy")) {
    return;
  } else if (is("service", "create")) {
    const nameIndex = args.indexOf("--name");
    if (nameIndex < 0) throw new Error("Migration job is missing --name");
    writeFileSync(
      join(directory, argument(args, nameIndex + 1)),
      argument(args, args.length - 1),
    );
  } else if (is("service", "logs") || is("service", "rm")) {
    return;
  } else if (is("service", "ps")) {
    print(
      args.at(-1) === "bulkbets_api"
        ? "api-task"
        : argument(args, args.length - 1),
    );
  } else if (args[0] === "inspect") {
    if (args.at(-1) === "api-task") {
      print(`running ${scenario === "old_tasks" ? "old-image" : image}`);
    } else {
      const action = readFileSync(
        join(directory, argument(args, args.length - 1)),
        "utf8",
      );
      print(
        (scenario === "migration_failed" && action === "up") ||
          (scenario === "provision_failed" && action === "provision")
          ? "failed"
          : "complete",
      );
    }
  } else if (is("service", "inspect")) {
    const template = argument(args, args.indexOf("--format") + 1);
    if (template.includes("ContainerSpec.Image")) {
      print(scenario === "wrong_image" ? "old-image" : `${image}@sha256:test`);
    } else if (template.includes("UpdateStatus")) {
      const states: Partial<Record<Scenario, string>> = {
        paused: "paused",
        rollback: "rollback_completed",
        new_service: "",
      };
      print(states[scenario] ?? "completed");
    } else if (template.includes("Replicas")) {
      print("1");
    } else {
      throw new Error("Unexpected service query");
    }
  } else {
    throw new Error(`Unexpected Docker call: ${JSON.stringify(args)}`);
  }
}
