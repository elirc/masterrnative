import { test, devices } from "@playwright/test";

test.use({ ...devices["Pixel 5"] });

test("capture core Piggery Tracker screens", async ({ page }) => {
  await page.goto("http://localhost:8081");
  await page.getByText("Business overview").waitFor({ timeout: 60000 });
  await page.screenshot({ path: "screenshots/dashboard.png", fullPage: false });

  await page.getByText("Batches", { exact: true }).click();
  await page.getByText("Pig Batches").waitFor({ timeout: 60000 });
  await page.screenshot({ path: "screenshots/batches.png", fullPage: false });

  await page.mouse.click(90, 180);
  await page.getByText("Batch Detail").waitFor({ timeout: 60000 });
  await page.screenshot({ path: "screenshots/batch-detail.png", fullPage: false });

  await page.getByText("Transactions", { exact: true }).click();
  await page.getByText("Feed Purchases", { exact: true }).waitFor({ timeout: 60000 });
  await page.screenshot({ path: "screenshots/transactions.png", fullPage: false });

  await page.getByText("Reports", { exact: true }).click();
  await page.getByText("Profit summary").waitFor({ timeout: 60000 });
  await page.screenshot({ path: "screenshots/reports.png", fullPage: false });

  await page.getByText("Settings", { exact: true }).click();
  await page.getByText("Piggery Tracker MVP").waitFor({ timeout: 60000 });
  await page.screenshot({ path: "screenshots/settings.png", fullPage: false });
});
