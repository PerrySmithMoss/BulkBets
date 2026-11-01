import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const composeArgs = ["compose", "-p", "bulkbets-e2e", "-f", "docker-compose.e2e.yml"];
function compose(args) {
  const result = spawnSync("docker", [...composeArgs, ...args], { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`docker compose ${args.join(" ")} failed`);
}

let status = 1;
try {
  compose(["down", "--remove-orphans"]);
  compose(["up", "--build", "--wait", "--wait-timeout", "180"]);
  compose(["exec", "-T", "db", "psql", "-U", "admin", "-d", "bulk_bets", "-v", "ON_ERROR_STOP=1", "-c",
    "INSERT INTO user_balances (user_id, balance) SELECT id, 1000 FROM users WHERE email = 'admin@bulkbets.com' ON CONFLICT (user_id) DO UPDATE SET balance = 1000"]);
  const test = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
    cwd: fileURLToPath(new URL("../", import.meta.url)), stdio: "inherit",
  });
  status = test.status ?? 1;
} catch (error) {
  console.error(error);
} finally {
  try {
    if (status !== 0) compose(["logs", "--tail", "100"]);
    compose(["down", "--remove-orphans"]);
  } catch (error) { console.error(error); status = 1; }
}
process.exitCode = status;
