import { test, expect } from "@playwright/test";

test("phone homepage, menu sheet, and guest login fit the screen", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "2024 Mr. Olympia" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("img")
        .first()
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    animations: "disabled",
    scale: "css",
    path: testInfo.outputPath("home-phone.png"),
  });
  await page.getByRole("button", { name: "Toggle navigation menu" }).click();
  await expect(page.getByRole("dialog")).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Markets" }),
  ).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    scale: "css",
    path: testInfo.outputPath("menu-phone.png"),
  });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Hadi Choopan" })
    .first()
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: /Open bet slip, 1/ }).click();
  await expect(page.getByRole("dialog")).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    animations: "disabled",
    scale: "css",
    path: testInfo.outputPath("login-phone.png"),
  });
  expect(errors).toEqual([]);
});

test("320px navigation keeps both account actions visible and closes on navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole("button", { name: "Try demo", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "Toggle navigation menu" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "How it works", exact: true })
    .click();
  await expect(page).toHaveURL(/how-it-works/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("phone division selector exposes every division without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Division", exact: true })
    .selectOption({ label: "Women's Figure" });
  await expect(
    page.getByRole("cell", { name: /^Cydney Gillon/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("phone demo supports placement, results, reset and a dismissible slip", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try demo", exact: true }).click();
  await expect(page.getByLabel("Account balance")).toContainText("1,000.00");
  const tray = page.getByRole("button", { name: /Open bet slip, 0/ });
  expect(
    await tray.evaluate((button) => {
      const bounds = button.getBoundingClientRect();
      return button.contains(
        document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        ),
      );
    }),
  ).toBe(true); // Success notifications must not cover the tray.
  await page.getByRole("button", { name: /Select Hadi Choopan/ }).click();
  await page.getByRole("button", { name: /Open bet slip, 1/ }).click();
  const slip = page.getByRole("dialog");
  await slip.getByLabel("Stake for Hadi Choopan").fill("5");
  await slip.getByRole("button", { name: "Place demo bet" }).click();
  await expect(slip.getByRole("status")).toContainText("Bet placed");
  await slip.getByRole("button", { name: "Simulate results" }).click();
  await expect(slip.getByRole("status")).toContainText("1 bet settled");
  await slip.getByRole("button", { name: "Reset my demo" }).click();
  await expect(slip.getByRole("status")).toContainText("Demo reset");
  await slip.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
