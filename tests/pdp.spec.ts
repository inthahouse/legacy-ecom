import { test, expect } from "@playwright/test";
import { attachWebVitals, triggerFinalization } from "./utils/web-vitals";

test.describe("product details page", () => {
  test("check cls", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");

    const metrics = await attachWebVitals(page);

    await page.goto("/products/wool-blend-anorak-tn-10279?color=black");
    await page.waitForTimeout(2000);

    await triggerFinalization(page);

    const cls = metrics.find((m) => m.name === "CLS");
    expect(cls).toBeDefined();
    expect(cls?.rating).toBe("good");
  });
});
