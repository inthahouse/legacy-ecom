import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    (window as any).jQuery(() => resolve());
  }));
}

async function stockItem(page: Page, giftBoundary = false) {
  const products = await (await page.request.get("/api/products")).json();
  for (const product of products) {
    if (product.hidden || product.isGift) continue;
    const qty = giftBoundary ? Math.ceil(50000 / product.price) - 1 : 1;
    if (qty < 1 || qty > 9) continue;
    for (const variant of product.variants) {
      const size = variant.sizes.find((s: any) => s.stock >= qty + 1);
      if (size) {
        const response = await page.request.post("/cart/add", {
          form: { sku: size.sku, qty },
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        expect((await response.json()).ok).toBe(true);
        return size.sku;
      }
    }
  }
  throw new Error("No in-stock product suitable for this cart scenario");
}

test("store search renders, filters, and treats whitespace as empty", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/stores");
  await ready(page);
  const initial = await page.locator(".store-item").count();
  expect(initial).toBeGreaterThan(0);
  await page.locator("#store-search").fill("no-store-matches-this-query");
  await page.locator("#store-search").press("Enter");
  await expect(page.locator("#stores-result-count")).toHaveText("0 stores found");
  await page.locator("#store-search").fill("   ");
  await page.locator("#store-search").press("Enter");
  await expect(page.locator(".store-item")).toHaveCount(initial);
  expect(errors).toEqual([]);
});

for (const choice of ["accept", "decline"]) {
  test(`cookie consent persists after ${choice} and reload`, async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await ready(page);
    await page.clock.fastForward(11000);
    await expect(page.locator("#cookie-consent")).toHaveClass(/is-open/);
    await page.locator(`#cookie-consent-${choice}`).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("tno_cookie_consent")!));
    expect(saved.status).toBe(choice === "accept" ? "accepted" : "declined");
    expect(saved.ts).toBeGreaterThan(0);
    await page.reload();
    await ready(page);
    await page.clock.fastForward(11000);
    await expect(page.locator("#cookie-consent")).not.toHaveClass(/is-open/);
  });
}

test("sold-out notification is replayed once after navigation", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("tno_checkout_removed", JSON.stringify(["Test Jacket"])));
  await page.goto("/cart");
  await expect(page.locator("#toast-stack")).toContainText("Test Jacket was removed from your bag");
  await page.reload();
  await ready(page);
  await expect(page.locator("#toast-stack")).not.toContainText("Test Jacket");
});

test("add-to-cart failures show the server error", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.evaluate(() => (window as any).tnoAddToCart("not-a-real-sku", 1));
  await expect(page.locator("#toast-stack")).toContainText("Unknown SKU");
});

test("cart gift changes reload and announce both transitions", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const sku = await stockItem(page, true);
  await page.goto("/cart");
  await ready(page);
  await expect(page.locator(".cart-line-gift")).toHaveCount(0);
  await page.locator(`.js-cart-qty[data-sku="${sku}"][data-delta="1"]`).click();
  await expect(page.locator(".cart-line-gift")).toHaveCount(1);
  await expect(page.locator("#toast-stack")).toContainText("Free gift unlocked!");
  await page.locator(`.js-cart-qty[data-sku="${sku}"][data-delta="-1"]`).click();
  await expect(page.locator(".cart-line-gift")).toHaveCount(0);
  await expect(page.locator("#toast-stack")).toContainText("the free gift was removed");
  expect(errors).toEqual([]);
});

test("checkout rejects whitespace and submits valid fields", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await stockItem(page);
  let submissions = 0;
  await page.route("**/checkout", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submissions++;
    // Exercise browser validation without creating an order or reducing stock.
    await route.fulfill({ contentType: "text/html", body: "<h1>Checkout submitted</h1>" });
  });
  await page.goto("/checkout");
  await ready(page);
  await page.locator("#co-fname").fill("   ");
  await page.locator("#place-order-btn").click();
  await expect(page.locator("#co-fname")).toHaveClass(/is-invalid/);
  await expect(page.locator("#co-email")).toBeFocused();
  expect(submissions).toBe(0);
  const fields = {
    "co-email": "test@example.com", "co-fname": "Test", "co-lname": "Shopper",
    "co-addr1": "123 Test Street", "co-city": "Toronto", "co-region": "ON",
    "co-postal": "M5V 1A1", "co-ccnum": "4111111111111111",
    "co-ccexp": "1229", "co-cccvv": "123",
  };
  for (const [id, value] of Object.entries(fields)) await page.locator(`#${id}`).fill(value);
  await page.locator("#place-order-btn").click();
  await expect(page.getByRole("heading", { name: "Checkout submitted" })).toBeVisible();
  expect(submissions).toBe(1);
  expect(errors).toEqual([]);
});

test("price slider still filters collections with the updated UI bundle", async ({ page, isMobile }) => {
  await page.goto("/collections/men");
  await ready(page);
  if (isMobile) await page.locator("#mobile-filter-btn").click();
  await page.locator("#price-slider .ui-slider-handle").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/price_min=/);
  await expect(page.locator('.js-remove-filter[data-name="price"]')).toHaveCount(1);
});
