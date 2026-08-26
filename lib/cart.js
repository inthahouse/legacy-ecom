/**
 * cart.js - cart & totals math. Everything works off req.session.cart which is
 * { items: [ { sku, qty } ] }
 *
 * !! IMPORTANT !! totals are in CAD cents. Currency conversion happens at
 * DISPLAY time only, orders are always charged in CAD. Do not "fix" this
 * again (see incident 2021-11-26, black friday).
 */

var catalog = require('../data/catalog');
var util = require('./util');

var FREE_SHIPPING_THRESHOLD = 10000; // $100 CAD
var FLAT_SHIPPING = 995;
var EXPRESS_SHIPPING = 1495;

// ---------------------------------------------------------------
// Gift with purchase (ECOM-1041): spend $500 -> free beanie in cart.
// The 500 is in whichever currency the shopper is browsing in - $500 USD
// is a higher bar than $500 CAD, marketing signed off on that, in writing,
// it's in the confluence page. The gift adds/removes ITSELF inside
// buildCartView, which runs on every request, so it can never go stale.
// ---------------------------------------------------------------
var GIFT_SKU = catalog.GIFT_SKU;
var GIFT_THRESHOLD = 50000; // "$500" in the active display currency
var TAX_RATE = 0.13; // Ontario HST. TODO: real tax tables per province (ECOM-88)

// promo codes. marketing adds these by emailing whoever is on-call.
var PROMOS = {
  'WELCOME10': { type: 'pct', value: 0.10, label: '10% off your order' },
  'FREESHIP': { type: 'ship', value: 0, label: 'Free shipping' },
  'NORTH25': { type: 'pct', value: 0.25, label: '25% off (staff & friends)' }
};

function getCart(session) {
  if (!session.cart) session.cart = { items: [], promo: null };
  if (!session.cart.items) session.cart.items = [];
  return session.cart;
}

function hasGift(session) {
  var cart = getCart(session);
  for (var i = 0; i < cart.items.length; i++) {
    if (cart.items[i].sku === GIFT_SKU) return true;
  }
  return false;
}

function addItem(session, sku, qty) {
  var entry = catalog.skuIndex[sku];
  if (!entry) return { ok: false, error: 'Unknown SKU' };
  if (entry.product.hidden || entry.product.isGift) {
    // people found the sku in the page source within a week of launch
    return { ok: false, error: 'That item is added automatically with qualifying orders.' };
  }
  if (entry.sizeEntry.stock <= 0) return { ok: false, error: 'Sorry, that size is out of stock.' };
  qty = parseInt(qty, 10) || 1;
  if (qty < 1) qty = 1;
  if (qty > 10) qty = 10; // per-line cap, fraud team asked for this in 2020

  var cart = getCart(session);
  var line = null;
  for (var i = 0; i < cart.items.length; i++) {
    if (cart.items[i].sku === sku) { line = cart.items[i]; break; }
  }
  if (line) {
    line.qty = Math.min(line.qty + qty, 10);
  } else {
    cart.items.push({ sku: sku, qty: qty, addedAt: Date.now() });
  }
  return { ok: true };
}

function updateQty(session, sku, qty) {
  if (sku === GIFT_SKU) {
    // the promo owns this line, hands off
    return { ok: false, error: 'The free gift is managed automatically.' };
  }
  var cart = getCart(session);
  qty = parseInt(qty, 10);
  for (var i = 0; i < cart.items.length; i++) {
    if (cart.items[i].sku === sku) {
      if (!qty || qty < 1) {
        cart.items.splice(i, 1);
      } else {
        cart.items[i].qty = Math.min(qty, 10);
      }
      return { ok: true };
    }
  }
  return { ok: false, error: 'Item not in cart' };
}

function removeItem(session, sku) {
  return updateQty(session, sku, 0);
}

/**
 * Expand cart lines against the catalog + compute totals.
 * Returns everything the views need. Lines whose sku vanished
 * (catalog reseed) get silently dropped -- yes, silently, the
 * alternative crashed the header minicart. See git blame.
 */
function buildCartView(session) {
  var cart = getCart(session);
  var lines = [];
  var subtotal = 0;
  var itemCount = 0;

  cart.items = cart.items.filter(function (item) {
    return !!catalog.skuIndex[item.sku];
  });

  // ---- gift-with-purchase sync ----
  // merch subtotal (gift excluded, pre-discount) decides eligibility
  var merchSubtotal = 0;
  var giftIdx = -1;
  cart.items.forEach(function (item, i) {
    if (item.sku === GIFT_SKU) { giftIdx = i; return; }
    merchSubtotal += catalog.skuIndex[item.sku].product.price * item.qty;
  });

  var currency = session.currency === 'USD' ? 'USD' : 'CAD';
  // $500 in the shopper's currency, expressed in CAD cents for the math
  var giftThresholdCad = currency === 'USD'
    ? Math.round(GIFT_THRESHOLD / util.CAD_TO_USD)
    : GIFT_THRESHOLD;

  var giftQualifies = merchSubtotal >= giftThresholdCad;
  if (giftQualifies && giftIdx === -1) {
    cart.items.push({ sku: GIFT_SKU, qty: 1, isGift: true, addedAt: Date.now() });
  } else if (!giftQualifies && giftIdx !== -1) {
    cart.items.splice(giftIdx, 1);
  }

  cart.items.forEach(function (item) {
    var entry = catalog.skuIndex[item.sku];
    var p = entry.product;
    if (p.isGift) item.qty = 1; // belt and suspenders
    var lineTotal = p.price * item.qty;
    subtotal += lineTotal;
    itemCount += item.qty;
    lines.push({
      sku: item.sku,
      qty: item.qty,
      product: p,
      variant: entry.variant,
      size: entry.sizeEntry.size,
      stock: entry.sizeEntry.stock,
      unitPrice: p.price,
      compareAt: p.compareAt,
      lineTotal: lineTotal,
      isGift: !!p.isGift
    });
  });

  var discount = 0;
  var promo = cart.promo ? PROMOS[cart.promo] : null;
  var promoLabel = promo ? promo.label : null;
  if (promo && promo.type === 'pct') {
    discount = Math.round(subtotal * promo.value);
  }

  var afterDiscount = subtotal - discount;
  var shippingMethod = session.shippingMethod === 'express' ? 'express' : 'standard';
  var shipping = 0;
  if (lines.length > 0) {
    if (shippingMethod === 'express') {
      shipping = EXPRESS_SHIPPING; // express is never free, don't ask
    } else {
      var freeShip = afterDiscount >= FREE_SHIPPING_THRESHOLD || (promo && promo.type === 'ship');
      shipping = freeShip ? 0 : FLAT_SHIPPING;
    }
  }

  var tax = Math.round((afterDiscount + shipping) * TAX_RATE);
  var total = afterDiscount + shipping + tax;

  return {
    lines: lines,
    itemCount: itemCount,
    subtotal: subtotal,
    discount: discount,
    promoCode: cart.promo,
    promoLabel: promoLabel,
    shippingMethod: shippingMethod,
    shipping: shipping,
    freeShipRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount),
    tax: tax,
    total: total,
    gift: {
      inCart: giftQualifies,
      remaining: giftQualifies ? 0 : Math.max(0, giftThresholdCad - merchSubtotal),
      threshold: giftThresholdCad,
      progressPct: Math.min(100, Math.round((merchSubtotal / giftThresholdCad) * 100)),
      product: catalog.GIFT_PRODUCT
    }
  };
}

function applyPromo(session, code) {
  code = String(code || '').toUpperCase().trim();
  var cart = getCart(session);
  if (!code) return { ok: false, error: 'Enter a promo code.' };
  if (!PROMOS[code]) return { ok: false, error: '"' + code + '" is not a valid code.' };
  cart.promo = code;
  return { ok: true, label: PROMOS[code].label };
}

function clearPromo(session) {
  getCart(session).promo = null;
}

function clearCart(session) {
  session.cart = { items: [], promo: null };
}

// ---------------- orders ----------------
var orders = {};       // orderNumber -> order
var orderSeq = 100437; // where the old system left off

function createOrder(session, user, form) {
  var view = buildCartView(session);
  if (view.lines.length === 0) return { ok: false, error: 'Cart is empty' };

  var orderNumber = 'TNO-' + (++orderSeq);
  var order = {
    number: orderNumber,
    placedAt: new Date(),
    email: form.email,
    name: form.firstName + ' ' + form.lastName,
    shipTo: {
      line1: form.address1,
      line2: form.address2 || '',
      city: form.city,
      region: form.region,
      postal: form.postal,
      country: form.country
    },
    shippingMethod: form.shippingMethod || 'standard',
    // store a snapshot, not references (learned that the hard way)
    lines: view.lines.map(function (l) {
      return {
        sku: l.sku, qty: l.qty, title: l.product.title, brand: l.product.brand,
        color: l.variant.colorName, size: l.size, unitPrice: l.unitPrice,
        lineTotal: l.lineTotal, image: l.variant.images[0], slug: l.product.slug,
        isGift: !!l.isGift
      };
    }),
    subtotal: view.subtotal,
    discount: view.discount,
    promoCode: view.promoCode,
    shipping: view.shipping,
    tax: view.tax,
    total: view.total,
    status: 'Processing',
    userId: user ? user.id : null
  };

  // decrement stock (best effort, no locking - single process anyway)
  view.lines.forEach(function (l) {
    var entry = require('../data/catalog').skuIndex[l.sku];
    if (entry) entry.sizeEntry.stock = Math.max(0, entry.sizeEntry.stock - l.qty);
  });

  orders[orderNumber] = order;
  if (user) user.orders.unshift(orderNumber);
  if (!session.guestOrders) session.guestOrders = [];
  session.guestOrders.unshift(orderNumber);

  clearCart(session);
  return { ok: true, order: order };
}

function getOrder(number) {
  return orders[number] || null;
}

module.exports = {
  getCart: getCart,
  hasGift: hasGift,
  addItem: addItem,
  updateQty: updateQty,
  removeItem: removeItem,
  buildCartView: buildCartView,
  applyPromo: applyPromo,
  clearPromo: clearPromo,
  clearCart: clearCart,
  createOrder: createOrder,
  getOrder: getOrder,
  PROMOS: PROMOS,
  FREE_SHIPPING_THRESHOLD: FREE_SHIPPING_THRESHOLD
};
