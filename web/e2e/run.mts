import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const composeArgs = [
  "compose",
  "-p",
  "bulkbets-e2e",
  "-f",
  "docker-compose.e2e.yaml",
];
function compose(args: readonly string[]): void {
  const result = spawnSync("docker", [...composeArgs, ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error || result.status !== 0)
    throw result.error ?? new Error(`docker compose ${args.join(" ")} failed`);
}

let status = 1;
try {
  compose(["down", "--volumes", "--remove-orphans"]);
  compose(["up", "--build", "--wait", "--wait-timeout", "180"]);
  compose(["logs", "--no-color", "provision-tests", "provision", "store-tests"]);
  compose([
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    "admin",
    "-d",
    "bulk_bets",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "INSERT INTO user_balances (user_id, balance) SELECT id, 1000 FROM users WHERE email = 'admin@bulkbets.com' ON CONFLICT (user_id) DO UPDATE SET balance = 1000",
  ]);
  // Only the isolated test database gets future dates; the app never reopens historical markets.
  compose([
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    "admin",
    "-d",
    "bulk_bets",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "UPDATE shows SET start_time = NOW() + INTERVAL '2 days', end_time = NOW() + INTERVAL '4 days', status = 'upcoming' WHERE id = 1; UPDATE divisions SET start_time = NOW() + INTERVAL '3 days', status = 'scheduled' WHERE show_id = 1;",
  ]);
  const test = spawnSync(
    "npx",
    ["playwright", "test", ...process.argv.slice(2)],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      stdio: "inherit",
    },
  );
  status = test.status ?? 1;
} catch (error) {
  console.error(error);
} finally {
  try {
    if (status !== 0) compose(["logs", "--tail", "100"]);
    compose(["down", "--volumes", "--remove-orphans"]);
  } catch (error) {
    console.error(error);
    status = 1;
  }
}
process.exitCode = status;
