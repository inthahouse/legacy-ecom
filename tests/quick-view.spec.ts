import { test, expect } from "@playwright/test";
import { attachWebVitals, triggerFinalization } from "./utils/web-vitals";
import { throttleCPU } from "./utils/cpu-throttle";

test.describe("quick view modal", () => {
  test("quick view button is present on every product card", async ({
    page,
  }) => {
    await page.goto("/");

    const cards = page.locator(".product-card");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // one .js-quickview button per card, unconditionally rendered
    await expect(page.locator(".product-card .js-quickview")).toHaveCount(
      cardCount,
    );
  });

  test.describe("with the modal open", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");

      const card = page.locator(".product-card").first();
      // the button is hover-revealed (clipped by overflow:hidden until
      // .card-media:hover), so it has to be hovered before it's clickable
      await card.locator(".card-media").hover();
      await card.locator(".js-quickview").click();

      await expect(page.locator("#tno-modal-overlay")).toHaveClass(/is-open/);
      await expect(page.locator(".qv")).toBeVisible();
    });

    test("opens with the product's details and an initially disabled Add to Cart button", async ({
      page,
    }) => {
      const qv = page.locator(".qv");
      await expect(qv.locator(".qv-title")).not.toBeEmpty();
      await expect(qv.locator(".qv-add")).toBeDisabled();
      await expect(qv.locator(".qv-add")).toHaveText("Select a Size");
    });

    test("selecting a colour swatch updates the quick view", async ({
      page,
    }) => {
      const qv = page.locator(".qv");

      const initialColor = await qv.locator(".qv-color-name").innerText();
      const nextSwatch = qv.locator(".qv-swatch:not(.is-active)").first();
      const nextColorName = await nextSwatch.getAttribute("title");
      const nextColorSlug = await nextSwatch.getAttribute("data-color");

      await nextSwatch.click();

      // content is replaced via ajax, so re-query rather than reuse locators
      await expect(qv.locator(".qv-color-name")).toHaveText(nextColorName!);
      expect(nextColorName).not.toBe(initialColor);
      await expect(
        qv.locator(`.qv-swatch[data-color="${nextColorSlug}"]`),
      ).toHaveClass(/is-active/);
    });

    test("selecting a size enables the Add to Cart button", async ({
      page,
    }) => {
      const qv = page.locator(".qv");
      const addBtn = qv.locator(".qv-add");
      const size = qv.locator(".qv-size:not(:disabled)").first();

      await size.click();

      await expect(size).toHaveClass(/is-active/);
      await expect(addBtn).toBeEnabled();
      await expect(addBtn).toHaveText("Add to Cart");
    });

    test("adding to cart closes the modal and updates the cart badge", async ({
      page,
    }) => {
      const qv = page.locator(".qv");
      const badge = page.locator(".cart-badge");
      const before =
        parseInt((await badge.textContent())?.trim() || "0", 10) || 0;

      await qv.locator(".qv-size:not(:disabled)").first().click();
      await qv.locator(".qv-add").click();

      await expect(page.locator("#tno-modal-overlay")).not.toHaveClass(
        /is-open/,
      );
      await expect(badge).toHaveText(String(before + 1));
    });

    test("the X button closes the modal", async ({ page }) => {
      await page.locator("#tno-modal-close").click();

      await expect(page.locator("#tno-modal-overlay")).not.toHaveClass(
        /is-open/,
      );
      await expect(page.locator(".qv")).toHaveCount(0);
    });

    test("clicking outside the modal closes it", async ({ page }) => {
      // click near the corner of the fullscreen overlay - outside the
      // centered modal box - so e.target === overlay in the close handler
      await page
        .locator("#tno-modal-overlay")
        .click({ position: { x: 5, y: 5 } });

      await expect(page.locator("#tno-modal-overlay")).not.toHaveClass(
        /is-open/,
      );
      await expect(page.locator(".qv")).toHaveCount(0);
    });
  });
});
