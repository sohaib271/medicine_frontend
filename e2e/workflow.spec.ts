import { test, expect } from "@playwright/test";
test.afterAll(async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3101/__test/shutdown");
  expect(response.ok()).toBe(true);
});
test("admin can manage medicines, create a bill, collect payment and delete it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Email address").fill("admin@test.local");
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Your store at a glance" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Inventory", exact: true }).click();
  await page.getByRole("button", { name: "Add medicine", exact: true }).click();
  await page.getByLabel("Medicine name").fill("Test Vitamin");
  await page.getByLabel("Purchase price (PKR)").fill("50");
  await page.getByLabel("Sale price (PKR)").fill("80");
  await page.getByLabel("Stock quantity").fill("20");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add medicine" })
    .click();
  await expect(page.getByText("Test Vitamin", { exact: true })).toBeVisible();
  await page.goto("/orders/new");
  await page.getByRole("button", { name: "New customer", exact: true }).click();
  await page.getByLabel("Customer name", { exact: true }).fill("Ayesha Test");
  await page.getByLabel("Address", { exact: true }).fill("Garden Town, Lahore");
  await page.getByRole("button", { name: /Panadol/ }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByLabel("Received for this order (PKR)").fill("50");
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Order details" }),
  ).toBeVisible();
  await expect(page.locator(".invoice .badge")).toHaveText("partial");
  await expect(page.locator(".invoice-totals")).toContainText("PKR 130.00");
  await page.screenshot({
    path: "test-results/invoice-desktop.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.pdf$/);
  await page.getByRole("button", { name: "Update payment" }).click();
  await page.getByRole("button", { name: "Set to fully paid" }).click();
  await page.getByRole("button", { name: "Review payment" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".invoice .badge")).toHaveText("paid");
  await page.getByRole("button", { name: "Delete order" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Orders & billing", exact: true }),
  ).toBeVisible();
  await page.goto("/inventory");
  const panadol = page.getByRole("row").filter({ hasText: "Panadol" });
  await expect(panadol).toContainText("50 units");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your store at a glance" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
