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
    page.getByRole("dialog").getByRole("link", { name: "All shows" }),
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
    page.getByRole("link", { name: "Create account", exact: true }),
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
    .getByRole("combobox", { name: "2024 Mr. Olympia division", exact: true })
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
