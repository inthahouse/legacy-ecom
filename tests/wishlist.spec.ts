import { test, expect } from "@playwright/test";
import { attachWebVitals, triggerFinalization } from "./utils/web-vitals";
import { throttleCPU } from "./utils/cpu-throttle";

test.describe("wishlist feature", () => {
  test("toggling the button adds then removes the product, updating the badge and a toast", async ({
    page,
    browserName,
  }) => {
    // CDP (and therefore CPU throttling) is only available in Chromium.
    test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");

    await throttleCPU(page, 4);
    const metrics = await attachWebVitals(page);

    await page.goto("/collections/new-arrivals");

    const wishButton = page
      .locator(".product-card")
      .first()
      .locator(".js-wishlist-toggle");
    const badge = page.locator(".wishlist-badge");

    const before = parseInt((await badge.textContent())?.trim() || "0", 10);

    await wishButton.click();

    await expect(wishButton).toHaveClass(/is-active/);
    await expect(badge).toHaveText(String(before + 1));
    // the previous toast can still be fading out when the next one is
    // added, so target the most recent one rather than ".toast" overall
    await expect(page.locator(".toast").last()).toContainText(
      "Saved to your wishlist",
    );

    await wishButton.click();

    await expect(wishButton).not.toHaveClass(/is-active/);
    await expect(badge).toHaveText(String(before));
    await expect(page.locator(".toast").last()).toContainText(
      "Removed from wishlist",
    );

    // under CPU throttling the Event Timing entry for the click can lag
    // slightly behind the AJAX response - give it a beat to land before
    // forcing finalization (INP only reports once the page is "hidden")
    await page.waitForTimeout(100);
    await triggerFinalization(page);

    const inp = metrics.find((m) => m.name === "INP");
    expect(inp).toBeDefined();
    expect(inp?.rating).toBe("good");
  });

  test("a product wishlisted from a collection page persists after reload and shows on the wishlist page", async ({
    page,
  }) => {
    await page.goto("/collections/new-arrivals");

    const card = page.locator(".product-card").first();
    const productId = await card.getAttribute("data-product-id");

    await card.locator(".js-wishlist-toggle").click();
    await expect(card.locator(".js-wishlist-toggle")).toHaveClass(/is-active/);

    // state is server-rendered from the session, not just a client-side
    // class toggle - reload to confirm it actually persisted
    await page.reload();
    await expect(
      page.locator(".product-card").first().locator(".js-wishlist-toggle"),
    ).toHaveClass(/is-active/);

    await page.goto("/wishlist");
    const savedCard = page.locator(
      `.product-card[data-product-id="${productId}"]`,
    );
    await expect(savedCard).toBeVisible();
    await expect(savedCard.locator(".js-wishlist-toggle")).toHaveClass(
      /is-active/,
    );
  });
});
