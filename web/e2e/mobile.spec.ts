import { test, expect } from "@playwright/test";

test("Expo connects guest betting, wallet transfers, results and history", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByText("Bodybuilding markets", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try demo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /£1000.00 · Account/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Select Hadi Choopan/ }).click();
  await page.getByLabel("Stake for Hadi Choopan").fill("10");
  await page
    .getByRole("button", { name: "Place demo bet", exact: true })
    .click();
  await expect(page.getByText(/Demo bet placed · £10.00 staked/)).toBeVisible();
  await page.getByRole("tab", { name: "Results" }).click();
  await page.getByRole("button", { name: "Simulate replay results" }).click();
  await expect(page.getByText(/1 bets settled/)).toBeVisible();
  await page.getByRole("tab", { name: "My Bets" }).click();
  await expect(page.getByText("Hadi Choopan", { exact: true })).toBeVisible();
  await expect(page.getByText(/^(WON|LOST)$/)).toBeVisible();
  await page.getByRole("tab", { name: "Wallet" }).click();
  await page.getByLabel("Transfer amount").fill("50");
  await page
    .getByRole("button", { name: "Deposit demo funds", exact: true })
    .click();
  await expect(page.getByText(/Demo deposit complete · £50.00/)).toBeVisible();
  await page
    .getByRole("button", { name: "Withdraw demo funds", exact: true })
    .click();
  await expect(
    page.getByText(/Demo withdrawal complete · £50.00/),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Search" }).click();
  await page
    .getByRole("textbox", { name: "Search shows or athletes", exact: true })
    .fill("Hadi");
  await expect(
    page.getByRole("button", { name: /Select Hadi Choopan/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    animations: "disabled",
    scale: "css",
    path: testInfo.outputPath("expo-connected.png"),
  });
  expect(errors).toEqual([]);
});

test("Expo private event closes and settles automatically", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try demo", exact: true }).click();
  await page.getByRole("tab", { name: "Results" }).click();
  await page
    .getByRole("button", { name: "Create private event", exact: true })
    .click();
  await expect(page.getByText(/Private event created/)).toBeVisible();
  await page.getByRole("tab", { name: "Home" }).click();
  await page.getByRole("button", { name: /Select Alex Stone/ }).click();
  await page.getByLabel("Stake for Alex Stone").fill("10");
  await page
    .getByRole("button", { name: "Place demo bet", exact: true })
    .click();
  await expect(page.getByText(/Demo bet placed/)).toBeVisible();
  await page.getByRole("tab", { name: "Results" }).click();
  await page
    .getByRole("button", { name: "Run Mobile Invitational", exact: true })
    .click();
  await expect(
    page.getByText("Market closed · judging in progress", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Results published · bets settled", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("button", { name: /£1010.00 · Account/ }),
  ).toBeVisible();
});

test("Expo registration, logout and password login keep a virtual account", async ({
  page,
}) => {
  const email = `expo-${Date.now()}@example.test`;
  const password = "a-mobile-test-password-123";
  await page.goto("/");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("First name", { exact: true }).fill("Mobile");
  await page.getByLabel("Last name", { exact: true }).fill("Visitor");
  await page
    .getByLabel("Date of birth (YYYY-MM-DD)", { exact: true })
    .fill("1990-01-01");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /£1000.00 · Account/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /£1000.00 · Account/ }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Try demo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page
    .getByRole("button", { name: "Already have an account?", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Log in to account", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /£1000.00 · Account/ }),
  ).toBeVisible();
});
