/**
 * account.js - login / register / logout / account dashboard / wishlist
 * "Auth" is a session flag. Good enough for the demo store.
 */

var express = require('express');
var router = express.Router();
var usersDb = require('../data/users');
var cartLib = require('../lib/cart');
var catalog = require('../data/catalog');

router.get('/login', function (req, res) {
  if (req.user) return res.redirect('/account');
  res.render('login', {
    pageTitle: 'Sign In',
    errors: null,
    form: {},
    returnTo: req.query.return || ''
  });
});

router.post('/login', function (req, res) {
  var user = usersDb.findByEmail(req.body.email);
  if (!user || user.password !== req.body.password) {
    return res.status(401).render('login', {
      pageTitle: 'Sign In',
      errors: ['Email or password is incorrect. (Demo account: jane@example.com / password123)'],
      form: req.body,
      returnTo: req.body.returnTo || ''
    });
  }

  req.session.userId = user.id;

  // merge the guest wishlist into the account - real pattern, people expect it
  var guestWishlist = req.session.wishlist || [];
  guestWishlist.forEach(function (pid) {
    if (user.wishlist.indexOf(pid) === -1) user.wishlist.push(pid);
  });
  req.session.wishlist = [];

  req.session.flash = { type: 'success', text: 'Welcome back, ' + user.firstName + '!' };
  var dest = req.body.returnTo && req.body.returnTo.indexOf('/') === 0 ? req.body.returnTo : '/account';
  res.redirect(dest);
});

router.get('/register', function (req, res) {
  if (req.user) return res.redirect('/account');
  res.render('register', { pageTitle: 'Create Account', errors: null, form: {} });
});

router.post('/register', function (req, res) {
  var errors = [];
  var b = req.body;
  if (!b.firstName) errors.push('First name is required.');
  if (!b.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) errors.push('A valid email is required.');
  if (!b.password || b.password.length < 6) errors.push('Password must be at least 6 characters.');
  if (b.password !== b.passwordConfirm) errors.push('Passwords do not match.');
  if (usersDb.findByEmail(b.email)) errors.push('An account with that email already exists.');

  if (errors.length) {
    return res.status(422).render('register', { pageTitle: 'Create Account', errors: errors, form: b });
  }

  var user = usersDb.createUser(b.email, b.password, b.firstName, b.lastName);
  req.session.userId = user.id;

  var guestWishlist = req.session.wishlist || [];
  guestWishlist.forEach(function (pid) {
    if (user.wishlist.indexOf(pid) === -1) user.wishlist.push(pid);
  });
  req.session.wishlist = [];

  req.session.flash = { type: 'success', text: 'Account created. Welcome to True North!' };
  res.redirect('/account');
});

router.post('/logout', function (req, res) {
  req.session.userId = null;
  req.session.flash = { type: 'success', text: 'You have been signed out.' };
  res.redirect('/');
});

// old GET logout link still floating around in a 2019 email footer
router.get('/logout', function (req, res) {
  req.session.userId = null;
  res.redirect('/');
});

// top-of-page best sellers, shown once a default card is on file - same
// selection the homepage uses (bestSeller flag, ranked by popularity).
function getBestSellers(count) {
  return catalog.products
    .filter(function (p) { return p.bestSeller; })
    .sort(function (a, b) { return b.popularity - a.popularity; })
    .slice(0, count);
}

router.get('/account', function (req, res) {
  if (!req.user) return res.redirect('/login?return=/account');

  var orders = (req.user.orders || []).map(function (num) {
    return cartLib.getOrder(num);
  }).filter(Boolean);

  res.render('account', {
    pageTitle: 'My Account',
    orders: orders,
    cardErrors: null,
    cardForm: {},
    openCardForm: false,
    bestSellers: getBestSellers(4)
  });
});

// ---------------------------------------------------------------
// DEFAULT PAYMENT CARD
// only brand, last 4 and expiry are ever kept - same "never stored" rule
// checkout uses for the full number/CVV.
// ---------------------------------------------------------------
function detectCardBrand(digits) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  return 'Card';
}

function validateCard(b) {
  var errors = {};

  if (!b.name || !b.name.trim()) errors.name = 'Name on card is required.';

  var digits = String(b.ccNumber || '').replace(/\D/g, '');
  if (!/^\d{15,16}$/.test(digits)) errors.ccNumber = 'Card number should be 15–16 digits.';

  var expMatch = /^(\d{2})\/(\d{2})$/.exec(String(b.ccExpiry || '').trim());
  if (!expMatch || parseInt(expMatch[1], 10) < 1 || parseInt(expMatch[1], 10) > 12) {
    errors.ccExpiry = 'Use MM/YY.';
  } else {
    var expMonth = parseInt(expMatch[1], 10);
    var expYear = 2000 + parseInt(expMatch[2], 10);
    var firstOfNextMonth = new Date(expYear, expMonth); // month index = the month AFTER expiry
    if (firstOfNextMonth <= new Date()) errors.ccExpiry = 'That card has expired.';
  }

  if (!/^\d{3,4}$/.test(String(b.ccCvv || '').trim())) errors.ccCvv = 'CVV should be 3–4 digits.';

  return errors;
}

router.post('/account/payment', function (req, res) {
  if (!req.user) return res.redirect('/login?return=/account');

  var errors = validateCard(req.body);
  if (Object.keys(errors).length) {
    var orders = (req.user.orders || []).map(function (num) {
      return cartLib.getOrder(num);
    }).filter(Boolean);

    return res.status(422).render('account', {
      pageTitle: 'My Account',
      orders: orders,
      cardErrors: errors,
      cardForm: req.body,
      openCardForm: true,
      bestSellers: getBestSellers(4)
    });
  }

  var digits = req.body.ccNumber.replace(/\D/g, '');
  var expMatch = /^(\d{2})\/(\d{2})$/.exec(req.body.ccExpiry.trim());

  req.user.defaultCard = {
    brand: detectCardBrand(digits),
    last4: digits.slice(-4),
    expMonth: parseInt(expMatch[1], 10),
    expYear: 2000 + parseInt(expMatch[2], 10),
    name: req.body.name.trim()
  };

  req.session.flash = { type: 'success', text: 'Default card saved.' };
  res.redirect('/account');
});

router.post('/account/payment/remove', function (req, res) {
  if (!req.user) return res.redirect('/login?return=/account');
  req.user.defaultCard = null;
  req.session.flash = { type: 'success', text: 'Default card removed.' };
  res.redirect('/account');
});

// ---------------------------------------------------------------
// WISHLIST
// ---------------------------------------------------------------
router.get('/wishlist', function (req, res) {
  var ids = req.user ? req.user.wishlist : (req.session.wishlist || []);
  var items = ids.map(function (id) { return catalog.productById[id]; }).filter(Boolean);
  res.render('wishlist', { pageTitle: 'Wishlist', items: items });
});

module.exports = router;
