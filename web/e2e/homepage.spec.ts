import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import type { ShowDetailsResponse } from "../src/types/api/show/show-details-response";

test("market directory includes complete line-ups in show-list order", async ({ request }) => {
  const response = await request.get("/api/v1/shows/directory");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const { data }: { data: { shows: ShowDetailsResponse["data"][]; partial: boolean } } = await response.json();
  const list = (await (await request.get("/api/v1/shows")).json()).data;
  expect(data.partial).toBe(false);
  expect(data.shows.map((details) => details.show.id)).toEqual(
    list.map((show: { id: number }) => show.id),
  );
  for (const details of data.shows) {
    const individual = await request.get(`/api/v1/shows/${details.show.id}`);
    expect(details).toEqual((await individual.json()).data);
  }
});

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
    page.getByRole("button", { name: "Place demo bet", exact: true }),
  ).toBeVisible();
  const me = await (await page.request.get("/api/v1/users/me")).json();
  expect(me.data.email).toBe(email);
  expect(me.data.balance).toBe(1000);
  expect(me.data.is_demo).toBe(true);
  expect(me.data.is_guest).toBe(false);
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

test("password recovery waits for scripts before accepting an email", async ({
  page,
}) => {
  const scripts = Promise.withResolvers<void>();
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => {
    await scripts.promise;
    await route.continue();
  });
  const requests: { method: string; email: string }[] = [];
  await page.route("**/api/v1/auth/forgot-password", async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      email: request.postDataJSON()?.email,
    });
    await route.fulfill({
      json: { data: { message: "Check your inbox for a reset link." } },
    });
  });

  try {
    await page.goto("/forgot-password", { waitUntil: "commit" });
    await expect(page.getByLabel("Email address")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Send reset link" }),
    ).toBeDisabled();
    await expect(page).toHaveURL("/forgot-password");
  } finally {
    scripts.resolve();
  }

  await page.getByLabel("Email address").fill("recovery@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Check your inbox for a reset link.",
  );
  await expect(page).toHaveURL("/forgot-password");
  expect(requests).toEqual([{ method: "POST", email: "recovery@example.test" }]);
});

test("password recovery redirects home after reset and rejects missing, expired or reused links", async ({
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
  await page.context().addCookies((await request.storageState()).cookies);
  await page.goto("/reset-password");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "This link is missing its reset code",
  );
  await expect(page.getByLabel("New password")).toHaveCount(0);
  await page.getByRole("link", { name: "Request a new reset link" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Password recovery is temporarily unavailable",
  );
  // Seed only the isolated test database. SMTP delivery is tested in Go;
  // browser tests must never use live provider credentials or send email.
  const token = randomBytes(32).toString("hex");
  const digest = createHash("sha256").update(token).digest("hex");
  fixtureSQL(`INSERT INTO password_resets (user_id, token_hash, expires_at)
    SELECT id, '${digest}', NOW() + INTERVAL '30 minutes'
    FROM users WHERE email = '${email}'`);
  const link = `/reset-password#token=${token}`;
  const adjustExpiry = (interval: string) =>
    fixtureSQL(
      `UPDATE password_resets SET expires_at = NOW() + INTERVAL '${interval}' WHERE user_id = (SELECT id FROM users WHERE email = '${email}')`,
    );
  const submitResetForm = async () => {
    await page.getByLabel("New password").fill(newPassword);
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/v1/auth/reset-password" &&
          response.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Save new password" }).click(),
    ]);
    return response.status();
  };
  const expectRejectedLink = async () => {
    await expect(page.locator("form").getByRole("alert")).toContainText(
      "This reset link has expired or has already been used",
    );
  };
  adjustExpiry("-1 minute");
  await page.goto(link);
  expect(await submitResetForm()).toBe(400);
  await expectRejectedLink();
  adjustExpiry("30 minutes");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();
  expect(await submitResetForm()).toBe(200);
  await expect(page).toHaveURL("/");
  await expect(
    page.getByText("Password updated. Log in with your new password.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("/forgot-password");
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
  await page.goto(link);
  expect(await submitResetForm()).toBe(400);
  await expectRejectedLink();
});

function fixtureSQL(sql: string) {
  execFileSync("docker", [
    "compose",
    "-p",
    "bulkbets-e2e",
    "-f",
    "../docker-compose.e2e.yaml",
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
      "../docker-compose.e2e.yaml",
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
