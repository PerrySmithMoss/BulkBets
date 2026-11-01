import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("admin@bulkbets.com");
  await page.getByLabel("Password", { exact: true }).fill("e2e-password");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "My bets", exact: true }),
  ).toBeVisible();
}

test("sportsbook shows markets, a matching poster, persistent slip and keyboard selection", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Bodybuilding betting",
  );
  await expect(page.getByRole("img", { name: /Official 2024/ })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Bet slip" }),
  ).toBeInViewport();
  await page
    .getByRole("group", { name: "Select division" })
    .getByRole("button", { name: "Classic Physique", exact: true })
    .click();
  const odds = page.getByRole("button", { name: /Select Chris Bumstead/ });
  await odds.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Stake for Chris Bumstead" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("home-desktop.png") });
  expect(errors).toEqual([]);
});

test("invalid credentials, password login, session refresh, and logout", async ({
  page,
  context,
}) => {
  await page.goto("/customer/my-bets");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("missing@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("admin@bulkbets.com");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await page.getByLabel("Password", { exact: true }).fill("e2e-password");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Stop page prefetches before artificially expiring the access cookie.
  await page.goto("about:blank");
  await context.clearCookies({ name: "access_token" });
  expect((await page.request.get("/api/v1/auth/token/refresh")).ok()).toBe(
    true,
  );
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "access_token"),
  ).toBe(true);
  await context.clearCookies({ name: "access_token" });
  await page.goto("/customer/my-bets");
  await expect(page).toHaveURL(/customer\/my-bets/);
  await expect(
    page.getByText("There are currently no bets to display"),
  ).toBeVisible();
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "access_token"),
  ).toBe(true);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeVisible();
  await page.goto("/customer/my-bets");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
});

test("bet slip validation, placement, stored bet history, and balance debit", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const before = await (await page.request.get("/api/v1/users/me")).json();
  await page
    .getByRole("row")
    .filter({ hasText: "Hadi Choopan" })
    .first()
    .getByRole("button")
    .click();
  await expect(
    page.getByRole("button", { name: "Place bet", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Stake for Hadi Choopan", exact: true })
    .fill("10");
  await expect(
    page.getByRole("button", { name: "Place bet", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    animations: "disabled",
    scale: "css",
    path: testInfo.outputPath("bet-slip.png"),
  });
  const placed = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/bets") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Place bet", exact: true }).click();
  expect((await placed).ok()).toBe(true);
  await expect(
    page.getByRole("button", { name: "Place bet", exact: true }),
  ).toHaveCount(0);
  const after = await (await page.request.get("/api/v1/users/me")).json();
  expect(after.data.balance).toBe(before.data.balance - 10);
  await page.getByRole("link", { name: "My bets", exact: true }).click();
  await page.getByRole("tab", { name: "Unsettled", exact: true }).click();
  await expect(page).toHaveURL(/tab=Unsettled/);
  await expect(page.getByText("Hadi Choopan", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Hadi Choopan", { exact: true })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    scale: "css",
    path: testInfo.outputPath("stored-bet.png"),
  });
  expect(errors).toEqual([]);
});

test("API rejects unauthenticated and malformed bets", async ({ request }) => {
  expect((await request.get("/api/v1/health")).ok()).toBe(true);
  expect((await request.post("/api/v1/bets", { data: {} })).status()).toBe(401);
  expect(
    (
      await request.post("/api/v1/auth/login", {
        data: { email: "admin@bulkbets.com", password: "e2e-password" },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await request.post("/api/v1/bets", { data: { activeBets: [] } })).status(),
  ).toBe(400);
  expect((await request.get("/api/v1/shows/999999")).status()).toBe(404);
});

test("saved slip survives reload and insufficient funds do not debit the account", async ({
  page,
}, testInfo) => {
  await login(page);
  const before = await (await page.request.get("/api/v1/users/me")).json();
  await page
    .getByRole("row")
    .filter({ hasText: "Hadi Choopan" })
    .first()
    .getByRole("button")
    .click();
  await page
    .getByRole("textbox", { name: "Stake for Hadi Choopan", exact: true })
    .fill("1000");
  await page.getByRole("heading", { name: "2024 Mr. Olympia" }).click();
  await expect(
    page.getByRole("textbox", { name: "Stake for Hadi Choopan", exact: true }),
  ).toHaveValue("1000");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Stake for Hadi Choopan", exact: true }),
  ).toHaveValue("1000");
  await expect(
    page.getByRole("button", { name: "Place bet", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("complementary", { name: "Bet slip" }).getByRole("alert"),
  ).toContainText("Not enough balance");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Stake for Hadi Choopan" }),
  ).toHaveValue("1000");
  const after = await (await page.request.get("/api/v1/users/me")).json();
  expect(after.data.balance).toBe(before.data.balance);
});
