import { test, expect } from "@playwright/test";
import { attachWebVitals, triggerFinalization } from "./utils/web-vitals";

test.describe("homepage workflows", () => {
  test("hero", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");

    const metrics = await attachWebVitals(page);

    await page.goto("/");
    await page.waitForTimeout(1000);

    await triggerFinalization(page);

    const inp = metrics.find((m) => m.name === "CLS");
    expect(inp).toBeDefined();
    expect(inp?.rating).toBe("good");
  });
});
