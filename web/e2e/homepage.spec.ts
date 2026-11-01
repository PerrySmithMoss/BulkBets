import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test("registration creates a persisted account and preserves a guest selection", async ({
  page,
  request,
}) => {
  const email = `homepage-${Date.now()}@example.test`;
  const password = "a-long-test-password-123";
  await page.goto("/");
  await page
    .getByRole("button", { name: /Select Hadi Choopan/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Or create an account" }).click();
  await page.getByLabel("First name", { exact: true }).fill("Demo");
  await page.getByLabel("Last name", { exact: true }).fill("Visitor");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Date of birth", { exact: true }).fill("1990-01-01");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Place bet", exact: true }),
  ).toBeVisible();
  const me = await (await page.request.get("/api/v1/users/me")).json();
  expect(me.data.email).toBe(email);
  expect(me.data.balance).toBe(0);
  const duplicate = await request.post("/api/v1/auth/register", {
    data: {
      first_name: "Demo",
      last_name: "Visitor",
      email,
      password,
      date_of_birth: "1990-01-01",
    },
  });
  expect(duplicate.status()).toBe(409);
  const underage = await request.post("/api/v1/auth/register", {
    data: {
      first_name: "Demo",
      last_name: "Visitor",
      email: "underage@example.test",
      password,
      date_of_birth: "2020-01-01",
    },
  });
  expect(underage.status()).toBe(400);
});

test("closed markets cannot be selected or submitted and stale prices are rejected", async ({
  page,
}) => {
  await page.goto("/");
  await page.request.post("/api/v1/auth/login", {
    data: { email: "admin@bulkbets.com", password: "e2e-password" },
  });
  await page.reload();
  await page.getByRole("button", { name: /2024 Arnold Classic/ }).click();
  await expect(
    page.getByRole("button", { name: /Select Hadi Choopan/ }),
  ).toBeDisabled();
  const before = await (await page.request.get("/api/v1/users/me")).json();
  const closed = await (await page.request.get("/api/v1/shows/2")).json();
  const division = closed.data.divisions[0];
  const athlete = closed.data.competitors[division.id][0];
  const odds = athlete.odds.find(
    (o: { bet_type: string }) => o.bet_type === "win",
  );
  const payload = {
    stakeMultiplier: 1,
    activeBets: [
      {
        showId: 2,
        divisionId: division.id,
        competitorId: athlete.id,
        betTypeId: odds.bet_type_id,
        betType: "win",
        odds: odds.odds_value,
        amount: null,
      },
    ],
  };
  const response = await page.request.post("/api/v1/bets", { data: payload });
  expect(response.status()).toBe(409);
  expect((await response.json()).error).toContain("closed");
  const opened = await (await page.request.get("/api/v1/shows/1")).json();
  const d = opened.data.divisions[0];
  const a = opened.data.competitors[d.id][0];
  const o = a.odds.find(
    (item: { bet_type: string }) => item.bet_type === "win",
  );
  const changed = await page.request.post("/api/v1/bets", {
    data: {
      stakeMultiplier: 1,
      activeBets: [
        {
          showId: 1,
          divisionId: d.id,
          competitorId: a.id,
          betTypeId: o.bet_type_id,
          betType: "win",
          odds: 999,
          amount: null,
        },
      ],
    },
  });
  expect(changed.status()).toBe(409);
  const after = await (await page.request.get("/api/v1/users/me")).json();
  expect(after.data.balance).toBe(before.data.balance);
});

test("keyboard selection works and reopening login clears previous errors", async ({
  page,
}) => {
  await page.goto("/");
  const odds = page
    .getByRole("button", { name: /Select Hadi Choopan/ })
    .first();
  await odds.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Email address").fill("missing@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Invalid email");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/forgot-password/);
});

test("password recovery delivers a single-use link through local SMTP", async ({
  page,
  request,
}) => {
  const email = `recovery-${Date.now()}@example.test`;
  const password = "initial-test-password-123";
  const newPassword = "replacement-test-password-456";
  expect(
    (
      await request.post("/api/v1/auth/register", {
        data: {
          first_name: "Recovery",
          last_name: "Test",
          email,
          password,
          date_of_birth: "1990-01-01",
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post("/api/v1/auth/login", { data: { email, password } })
    ).ok(),
  ).toBe(true);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If an account uses this email",
  );
  const messages = await (
    await request.get("http://127.0.0.1:18025/api/v1/messages")
  ).json();
  const message = messages.messages.find((m: { To: { Address: string }[] }) =>
    m.To.some((to) => to.Address === email),
  );
  expect(message).toBeTruthy();
  const detail = await (
    await request.get(`http://127.0.0.1:18025/api/v1/message/${message.ID}`)
  ).json();
  const link = detail.Text.match(/http[^\s]+reset-password#token=[a-f0-9]+/)[0];
  const adjustExpiry = (interval: string) =>
    execFileSync("docker", [
      "compose",
      "-p",
      "bulkbets-e2e",
      "-f",
      "../docker-compose.e2e.yml",
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
      `UPDATE password_resets SET expires_at = NOW() + INTERVAL '${interval}' WHERE user_id = (SELECT id FROM users WHERE email = '${email}')`,
    ]);
  adjustExpiry("-1 minute");
  expect(
    (
      await request.post("/api/v1/auth/reset-password", {
        data: { token: link.split("token=")[1], password: newPassword },
      })
    ).status(),
  ).toBe(400);
  adjustExpiry("30 minutes");
  await page.goto(link);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  expect((await request.get("/api/v1/auth/token/refresh")).status()).toBe(401);
  expect(
    (
      await request.post("/api/v1/auth/login", { data: { email, password } })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/v1/auth/login", {
        data: { email, password: newPassword },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post("/api/v1/auth/reset-password", {
        data: { token: link.split("token=")[1], password: newPassword },
      })
    ).status(),
  ).toBe(400);
});

function fixtureSQL(sql: string) {
  execFileSync("docker", [
    "compose",
    "-p",
    "bulkbets-e2e",
    "-f",
    "../docker-compose.e2e.yml",
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
    sql,
  ]);
}

test("show and athlete search, division switching and empty-state recovery", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("Columbus");
  await expect(
    page.getByRole("heading", { name: "2024 Arnold Classic", exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("Chris Bumstead");
  await expect(
    page.getByRole("cell", { name: "Chris Bumstead", exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("not-a-real-show");
  await expect(
    page.getByRole("heading", { name: "No matching shows or athletes" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page
    .getByRole("group", { name: "Select division" })
    .getByRole("button", { name: "Classic Physique", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Chris Bumstead", exact: true }),
  ).toBeVisible();
});

test("newly published shows appear without hardcoded IDs and missing divisions have an empty state", async ({
  page,
}) => {
  const name = "E2E Newly Published Show";
  fixtureSQL(
    `INSERT INTO shows (name,location,is_two_day_show,start_time,end_time,status) VALUES ('${name}','London',false,NOW()+INTERVAL '20 days',NOW()+INTERVAL '21 days','upcoming')`,
  );
  try {
    await page.goto("/");
    await page.getByRole("searchbox").fill(name);
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "There are no divisions for this show yet. Choose another show to explore its markets.",
      ),
    ).toBeVisible();
  } finally {
    fixtureSQL(`DELETE FROM shows WHERE name='${name}'`);
  }
});

test("historical markets stay playable for a demo visitor", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /2024 Arnold Classic/ }).click();
  await expect(page.getByText("EVENT REPLAY")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Select Hadi Choopan/ }),
  ).toBeEnabled();
  await expect(
    page.getByText("Betting closed. Prices below are historical."),
  ).toHaveCount(0);
});

test("show service failure displays a useful retry and recovers", async ({
  page,
  request,
}) => {
  const compose = (args: string[]) =>
    execFileSync("docker", [
      "compose",
      "-p",
      "bulkbets-e2e",
      "-f",
      "../docker-compose.e2e.yml",
      ...args,
    ]);
  compose(["stop", "-t", "1", "api"]);
  try {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Shows are temporarily unavailable" }),
    ).toBeVisible();
  } finally {
    execFileSync("docker", ["start", "bulkbets-e2e-api-1"]);
  }
  await expect
    .poll(async () => {
      try {
        return (await request.get("/api/v1/health")).ok();
      } catch {
        return false;
      }
    })
    .toBe(true);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
});

test("a guest selection survives a page reload", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Select Hadi Choopan/ })
    .first()
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Remove Hadi Choopan/ }).first(),
  ).toHaveAttribute("aria-pressed", "true");
});

test("legacy single stakes are restored into the visible stake field", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Select Hadi Choopan/ }).click();
  await page.evaluate(() => {
    const slip = JSON.parse(localStorage.getItem("bets")!);
    slip.stakeMultiplierRawValue = "12";
    slip.activeBets[0].amount = "";
    localStorage.setItem("bets", JSON.stringify(slip));
  });
  await page.reload();
  await expect(page.getByLabel("Stake for Hadi Choopan")).toHaveValue("12");
  await expect(
    page.getByRole("complementary", { name: "Bet slip" }),
  ).toContainText("£33.00");
});
