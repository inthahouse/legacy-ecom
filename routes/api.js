/**
 * api.js - the "ajax stuff" router. Half of these return HTML fragments on
 * purpose: the frontend is jQuery, shipping rendered HTML and .html()-ing it
 * in beats re-implementing templates client side. (We tried handlebars in
 * 2019. There are still .hbs files in git history. Never again.)
 */

const express = require("express");
const router = express.Router();
const catalog = require("../data/catalog");
const cartLib = require("../lib/cart");
const sizeGuide = require("../lib/sizeGuide");

// ---- quick view modal (HTML fragment) ----
router.get("/quickview/:id", function (req, res) {
  var product = catalog.productById[req.params.id];
  if (!product || product.hidden)
    return res
      .status(404)
      .send('<div class="qv-error">Product not found.</div>');

  var variant = product.variants[0];
  if (req.query.color) {
    product.variants.forEach(function (v) {
      if (v.colorSlug === req.query.color) variant = v;
    });
  }

  res.render("partials/quickview", {
    product: product,
    variant: variant,
    inWishlist: res.locals.wishlist.indexOf(product.id) !== -1,
  });
});

// ---- size guide modal (HTML fragment) ----
router.get("/size-guide/:id", function (req, res) {
  var product = catalog.productById[req.params.id];
  if (!product || product.hidden)
    return res
      .status(404)
      .send('<div class="qv-error">Product not found.</div>');

  res.render("partials/size-guide", { guide: sizeGuide.buildGuide(product) });
});

// ---- minicart dropdown (HTML fragment) ----
// superseded by /cart-drawer below (2026 redesign) but kept because the old
// hover dropdown markup is cached in a couple of CMS blocks. probably. check
// before deleting.
router.get("/minicart", function (req, res) {
  var view = cartLib.buildCartView(req.session);
  res.render("partials/minicart", { cart: view });
});

// ---- cart drawer (HTML fragment) - slides in when you click the bag ----
router.get("/cart-drawer", function (req, res) {
  var view = cartLib.buildCartView(req.session);
  res.render("partials/cart-drawer", { cart: view });
});

// ---- currency switcher ----
router.post("/currency", function (req, res) {
  var cur = req.body.currency === "USD" ? "USD" : "CAD";
  req.session.currency = cur;
  res.cookie("tno_currency", cur, { maxAge: 1000 * 60 * 60 * 24 * 365 });
  res.json({ ok: true, currency: cur });
});

// ---- theme (dark/light). cookie so SSR can paint the right theme ----
router.post("/theme", function (req, res) {
  var theme = req.body.theme === "dark" ? "dark" : "light";
  res.cookie("tno_theme", theme, { maxAge: 1000 * 60 * 60 * 24 * 365 });
  res.json({ ok: true, theme: theme });
});

// ---- wishlist toggle ----
router.post("/wishlist/toggle", function (req, res) {
  var pid = parseInt(req.body.productId, 10);
  if (!catalog.productById[pid])
    return res.status(400).json({ ok: false, error: "Bad product id" });

  let list;
  if (req.user) {
    list = req.user.wishlist;
  } else {
    if (!req.session.wishlist) req.session.wishlist = [];
    list = req.session.wishlist;
  }

  const idx = list.indexOf(pid);
  let added;
  if (idx === -1) {
    list.push(pid);
    added = true;
  } else {
    list.splice(idx, 1);
    added = false;
  }

  res.json({ ok: true, added, count: list.length });
});

// ---- search autocomplete (HTML fragment, again on purpose) ----
router.get("/search/suggest", function (req, res) {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.send("");

  const results = catalog.searchProducts(q).slice(0, 6);
  res.render("partials/search-suggest", { results, q });
});

// ---- cart totals fragment for the cart page (recalcs after qty change) ----
router.get("/cart/summary", function (req, res) {
  const view = cartLib.buildCartView(req.session);

  res.render("partials/cart-summary", {
    cart: view,
    checkoutMode: req.query.mode === "checkout",
  });
});

// ---- full product list (client-side stock check on checkout) ----
router.get("/products", function (req, res) {
  res.json(catalog.products);
});

// ---- shipping method (checkout radios post here, summary re-renders) ----
router.post("/shipping-method", function (req, res) {
  req.session.shippingMethod =
    req.body.method === "express" ? "express" : "standard";
  res.json({ ok: true });
});

module.exports = router;
