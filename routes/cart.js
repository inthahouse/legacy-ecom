/**
 * cart.js routes - cart page, checkout, order confirmation
 * The AJAX-y cart endpoints live in routes/api.js EXCEPT the ones that were
 * already here before the api router existed. Moving them breaks the mobile
 * app... we don't have a mobile app anymore but nobody has tested since.
 */

var express = require('express');
var router = express.Router();
var cartLib = require('../lib/cart');
var catalog = require('../data/catalog');

router.get('/cart', function (req, res) {
  var view = cartLib.buildCartView(req.session);
  res.render('cart', { pageTitle: 'Shopping Cart', cart: view });
});

// gift-with-purchase can appear/disappear as a side effect of any cart
// mutation - diff before/after so the frontend can announce it
function giftEventFor(session, hadGift) {
  var has = cartLib.hasGift(session);
  if (!hadGift && has) return 'added';
  if (hadGift && !has) return 'removed';
  return null;
}

// classic form-post add (no-JS fallback) AND the endpoint main.js posts to
router.post('/cart/add', function (req, res) {
  var hadGift = cartLib.hasGift(req.session);
  var result = cartLib.addItem(req.session, req.body.sku, req.body.qty);

  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    var view = cartLib.buildCartView(req.session);
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
    return res.json({ ok: true, cartCount: view.itemCount, giftEvent: giftEventFor(req.session, hadGift) });
  }

  if (!result.ok) {
    req.session.flash = { type: 'error', text: result.error };
    return res.redirect('back');
  }
  res.redirect('/cart');
});

router.post('/cart/update', function (req, res) {
  var hadGift = cartLib.hasGift(req.session);
  cartLib.updateQty(req.session, req.body.sku, req.body.qty);
  var view = cartLib.buildCartView(req.session);
  if (req.xhr) {
    return res.json({ ok: true, cartCount: view.itemCount, giftEvent: giftEventFor(req.session, hadGift) });
  }
  res.redirect('/cart');
});

router.post('/cart/remove', function (req, res) {
  var hadGift = cartLib.hasGift(req.session);
  cartLib.removeItem(req.session, req.body.sku);
  var view = cartLib.buildCartView(req.session);
  if (req.xhr) {
    return res.json({ ok: true, cartCount: view.itemCount, giftEvent: giftEventFor(req.session, hadGift) });
  }
  res.redirect('/cart');
});

router.post('/cart/promo', function (req, res) {
  var result = cartLib.applyPromo(req.session, req.body.code);
  if (!result.ok) {
    req.session.flash = { type: 'error', text: result.error };
  } else {
    req.session.flash = { type: 'success', text: 'Promo applied: ' + result.label };
  }
  res.redirect('/cart');
});

router.post('/cart/promo/remove', function (req, res) {
  cartLib.clearPromo(req.session);
  res.redirect('/cart');
});

// ---------------------------------------------------------------
// CHECKOUT
// ---------------------------------------------------------------
router.get('/checkout', function (req, res) {
  var view = cartLib.buildCartView(req.session);
  if (view.lines.length === 0) {
    req.session.flash = { type: 'error', text: 'Your cart is empty.' };
    return res.redirect('/cart');
  }

  // prefill from account if signed in
  var form = {};
  if (req.user) {
    form.email = req.user.email;
    form.firstName = req.user.firstName;
    form.lastName = req.user.lastName;
    if (req.user.addresses && req.user.addresses[0]) {
      var a = req.user.addresses[0];
      form.address1 = a.line1;
      form.city = a.city;
      form.region = a.region;
      form.postal = a.postal;
      form.country = a.country;
      form.phone = a.phone;
    }
  }

  res.render('checkout', { pageTitle: 'Checkout', cart: view, form: form, errors: null });
});

router.post('/checkout', function (req, res) {
  var view = cartLib.buildCartView(req.session);
  if (view.lines.length === 0) return res.redirect('/cart');

  var b = req.body;
  var errors = [];

  if (!b.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) errors.push('A valid email is required.');
  if (!b.firstName) errors.push('First name is required.');
  if (!b.lastName) errors.push('Last name is required.');
  if (!b.address1) errors.push('Street address is required.');
  if (!b.city) errors.push('City is required.');
  if (!b.region) errors.push('Province / state is required.');
  if (!b.postal) errors.push('Postal / ZIP code is required.');
  if (!b.country) errors.push('Country is required.');

  // "payment" validation - this is a demo, we just want the fields to look real
  var ccNum = String(b.ccNumber || '').replace(/[\s-]/g, '');
  if (!/^\d{15,16}$/.test(ccNum)) errors.push('Card number should be 15–16 digits (any digits work — demo store, nothing is charged).');
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(b.ccExpiry || '')) errors.push('Card expiry must look like MM/YY.');
  if (!/^\d{3,4}$/.test(b.ccCvv || '')) errors.push('CVV should be 3–4 digits.');

  if (errors.length) {
    return res.status(422).render('checkout', { pageTitle: 'Checkout', cart: view, form: b, errors: errors });
  }

  var result = cartLib.createOrder(req.session, req.user, b);
  if (!result.ok) {
    return res.status(422).render('checkout', { pageTitle: 'Checkout', cart: view, form: b, errors: [result.error] });
  }

  res.redirect('/order/' + result.order.number + '/confirmation');
});

router.get('/order/:number/confirmation', function (req, res, next) {
  var order = cartLib.getOrder(req.params.number);
  if (!order) return next();

  // only show it to the session that placed it or the account that owns it
  var mine = (req.session.guestOrders || []).indexOf(order.number) !== -1 ||
    (req.user && order.userId === req.user.id);
  if (!mine) return next();

  res.render('order-confirmation', { pageTitle: 'Order ' + order.number, order: order });
});

module.exports = router;
