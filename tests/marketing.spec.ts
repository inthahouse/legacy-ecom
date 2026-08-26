import { test, expect } from "@playwright/test";
import { attachWebVitals, triggerFinalization } from "./utils/web-vitals";
import { throttleNetworkFast4G } from "./utils/network-throttle";

test.describe("Marketing pages performance", () => {
  test("falls preview page", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");

    const metrics = await attachWebVitals(page);
    await throttleNetworkFast4G(page);

    await page.goto("/pages/fall-preview");
    await page.waitForTimeout(1000);

    await triggerFinalization(page);

    const lcp = metrics.find((m) => m.name === "LCP");
    expect(lcp).toBeDefined();
    expect(lcp?.rating).toBe("good");
  });

  test("summer clearance page", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");

    const metrics = await attachWebVitals(page);
    await throttleNetworkFast4G(page);

    await page.goto("/pages/summer-clearance");
    await page.waitForTimeout(1000);

    await triggerFinalization(page);

    const lcp = metrics.find((m) => m.name === "LCP");
    const cls = metrics.find((m) => m.name === "CLS");
    expect(lcp).toBeDefined();
    expect(lcp?.rating).toBe("good");
    expect(cls).toBeDefined();
    expect(cls?.rating).toBe("good");
  });
});
