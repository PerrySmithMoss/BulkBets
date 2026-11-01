import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("admin@bulkbets.com");
  await page.getByLabel("Password", { exact: true }).fill("e2e-password");
  await page.getByRole("dialog").getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My Bets", exact: true })).toBeVisible();
}

test("real API data, division tabs, carousel, and guest bet login", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "2024 Mr. Olympia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2024 Arnold Classic" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Hadi Choopan", exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Classic Physique", exact: true }).first().click();
  await expect(page.getByRole("cell", { name: "Chris Bumstead", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Next slide" }).click();
  await expect(page.getByRole("button", { name: "Previous slide" })).toBeEnabled();
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("home-desktop.png") });
  await page.getByRole("row").filter({ hasText: "Chris Bumstead" }).first().getByRole("cell").last().click();
  await expect(page.getByRole("dialog")).toContainText("log in to place your bet");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await expect(page.getByRole("dialog")).toBeInViewport();
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("guest-login.png") });
  expect(errors).toEqual([]);
});

test("invalid credentials, password login, session refresh, and logout", async ({ page, context }) => {
  await page.goto("/customer/my-bets");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("missing@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("dialog").getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await page.getByLabel("Email", { exact: true }).fill("admin@bulkbets.com");
  await page.getByRole("dialog").getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await page.getByLabel("Password", { exact: true }).fill("e2e-password");
  await page.getByRole("dialog").getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.clearCookies({ name: "access_token" });
  expect((await page.request.get("/api/v1/auth/token/refresh")).ok()).toBe(true);
  expect((await context.cookies()).some((cookie) => cookie.name === "access_token")).toBe(true);
  await context.clearCookies({ name: "access_token" });
  await page.goto("/customer/my-bets");
  await expect(page).toHaveURL(/customer\/my-bets/);
  await expect(page.getByText("There are currently no bets to display")).toBeVisible();
  expect((await context.cookies()).some((cookie) => cookie.name === "access_token")).toBe(true);
  await page.getByText("au", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  await page.goto("/customer/my-bets");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
});

test("bet slip validation, placement, stored bet history, and balance debit", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const before = await (await page.request.get("/api/v1/users/me")).json();
  await page.getByRole("row").filter({ hasText: "Hadi Choopan" }).first().getByRole("cell").last().click();
  await expect(page.getByRole("button", { name: /^Place Bet/ })).toBeDisabled();
  await page.getByText("Set Stake", { exact: true }).click();
  await page.getByRole("textbox", { name: "Stake amount", exact: true }).fill("10");
  await expect(page.getByRole("button", { name: /^Place Bet/ })).toBeEnabled();
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("bet-slip.png") });
  const placed = page.waitForResponse((response) => response.url().endsWith("/api/v1/bets") && response.request().method() === "POST");
  await page.getByRole("button", { name: /^Place Bet/ }).click();
  expect((await placed).ok()).toBe(true);
  await expect(page.getByRole("button", { name: /^Place Bet/ })).toHaveCount(0);
  const after = await (await page.request.get("/api/v1/users/me")).json();
  expect(after.data.balance).toBe(before.data.balance - 10);
  await page.getByRole("link", { name: "My Bets", exact: true }).click();
  await page.getByRole("tab", { name: "Unsettled", exact: true }).click();
  await expect(page).toHaveURL(/tab=Unsettled/);
  await expect(page.getByText("Hadi Choopan", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Hadi Choopan", { exact: true })).toBeVisible();
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("stored-bet.png") });
  expect(errors).toEqual([]);
});

test("API rejects unauthenticated and malformed bets", async ({ request }) => {
  expect((await request.get("/api/v1/health")).ok()).toBe(true);
  expect((await request.post("/api/v1/bets", { data: {} })).status()).toBe(401);
  expect((await request.post("/api/v1/auth/login", { data: { email: "admin@bulkbets.com", password: "e2e-password" } })).ok()).toBe(true);
  expect((await request.post("/api/v1/bets", { data: { activeBets: [] } })).status()).toBe(400);
  expect((await request.get("/api/v1/shows/999999")).status()).toBe(404);
});

test("saved slip survives reload and insufficient funds do not debit the account", async ({ page }, testInfo) => {
  await login(page);
  const before = await (await page.request.get("/api/v1/users/me")).json();
  await page.getByRole("row").filter({ hasText: "Hadi Choopan" }).first().getByRole("cell").last().click();
  await page.getByText("Set Stake", { exact: true }).click();
  await page.getByRole("textbox", { name: "Stake amount", exact: true }).fill("1000");
  await page.getByRole("heading", { name: "2024 Mr. Olympia" }).click();
  await expect(page.getByRole("textbox", { name: "Stake amount", exact: true })).toHaveValue("1,000.00");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Stake amount", exact: true })).toHaveValue("1,000.00");
  await page.getByRole("button", { name: /^Place Bet/ }).click();
  await expect(page.getByText("No funds in your account", { exact: true })).toBeVisible();
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("insufficient-funds.png") });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Sorry, you do not have enough funds in your account to place this bet")).toBeVisible();
  const after = await (await page.request.get("/api/v1/users/me")).json();
  expect(after.data.balance).toBe(before.data.balance);
});
