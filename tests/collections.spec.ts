import { test, expect } from "@playwright/test";
import { attachWebVitals, triggerFinalization } from "./utils/web-vitals";

test.describe("collections page", () => {
  test("on-sale collection CLS", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");

    const metrics = await attachWebVitals(page);

    await page.goto("/collections/sale");
    await page.waitForTimeout(1000);

    await triggerFinalization(page);

    const inp = metrics.find((m) => m.name === "CLS");
    expect(inp).toBeDefined();
    expect(inp?.rating).toBe("good");
  });

  test("collection page list view CLS", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");

    const metrics = await attachWebVitals(page);

    await page.goto("/collections/men");

    await page.locator('.js-view-toggle[data-view="list"]').click();
    await expect(page.locator("#collection-results")).toHaveClass(/view-list/);

    await page.reload();

    metrics.length = 0;

    await triggerFinalization(page);

    const inp = metrics.find((m) => m.name === "CLS");
    expect(inp).toBeDefined();
    expect(inp?.rating).toBe("good");
  });

  test("collection grid view 4 per row CLS", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");

    const metrics = await attachWebVitals(page);

    await page.goto("/collections/men");

    await page.locator('.js-view-toggle[data-view="grid-4"]').click();
    await expect(page.locator("#collection-results")).toHaveClass(/view-list/);

    await page.reload();

    metrics.length = 0;

    await triggerFinalization(page);

    const inp = metrics.find((m) => m.name === "CLS");
    expect(inp).toBeDefined();
    expect(inp?.rating).toBe("good");
  });
});
