import { test, expect } from "@playwright/test";

test("phone homepage, menu sheet, and guest login fit the screen", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "2024 Mr. Olympia" })).toBeVisible();
  await expect.poll(() => page.getByRole("img").first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("home-phone.png") });
  await page.getByRole("button", { name: "Toggle navigation menu" }).click();
  await expect(page.getByRole("dialog")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("dialog").getByRole("link", { name: "All Shows" })).toBeVisible();
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("menu-phone.png") });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("row").filter({ hasText: "Hadi Choopan" }).first().getByRole("cell").last().click();
  await expect(page.getByRole("dialog")).toBeInViewport({ ratio: 1 });
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("login-phone.png") });
  expect(errors).toEqual([]);
});
