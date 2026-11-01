import { test, expect } from "@playwright/test";

test("Expo home, division navigation, event selection, and all bottom tabs", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Event #1", { exact: true })).toBeVisible();
  await expect(page.getByText("Event 1 - Division 1", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("expo-home.png") });
  let selectedEvent = "";
  page.once("dialog", async (dialog) => { selectedEvent = dialog.message(); await dialog.dismiss(); });
  await page.getByText("Event #1", { exact: true }).click();
  await expect.poll(() => selectedEvent).toContain("Selected Event #1");
  await page.getByText("Classic Physique", { exact: true }).first().click();
  await expect(page.getByText("Event 1 - Division 3", { exact: true })).toBeInViewport();
  for (const [tab, title] of [["Search", "Search Screen"], ["In-Play", "In-Play Screen"], ["My Bets", "Bets Screen"]]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath(`expo-${tab}.png`) });
  }
  await page.getByRole("tab", { name: "Home" }).click();
  await expect(page.getByText("Event #1", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
