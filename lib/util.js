/**
 * util.js - grab bag of helpers
 * NOTE: some of this predates the 2019 refactor, don't reorganize without checking
 * checkout + emails (emails are gone now but still)
 */

// seeded PRNG so the catalog is stable between restarts (QA kept complaining)
function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  var rand = mulberry32(seed);
  return {
    rand: rand,
    int: function (min, max) {
      return Math.floor(rand() * (max - min + 1)) + min;
    },
    pick: function (arr) {
      return arr[Math.floor(rand() * arr.length)];
    },
    chance: function (p) {
      return rand() < p;
    },
    shuffle: function (arr) {
      // fisher-yates, copied off stackoverflow years ago
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a;
    },
  };
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------
// Money stuff. Prices are stored in CENTS, CAD. Always CAD.
// FX rate is hardcoded, TODO: pull from openexchangerates (ticket ECOM-412, opened 2019)
// ---------------------------------------------------------------
var CAD_TO_USD = 0.73;

function convertCents(cents, currency) {
  if (currency === "USD") {
    return Math.round(cents * CAD_TO_USD);
  }
  return cents;
}

function formatMoney(cents, currency) {
  currency = currency || "CAD";
  var converted = convertCents(cents, currency);
  var dollars = (converted / 100).toFixed(2);
  // add thousands separators the old fashioned way
  var parts = dollars.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + parts.join(".") + (currency === "USD" ? " USD" : "");
}

function pad(n, width) {
  n = String(n);
  while (n.length < width) n = "0" + n;
  return n;
}

function formatCountdown(ms) {
  if (ms < 0) ms = 0;
  var totalSeconds = Math.floor(ms / 1000);
  var days = Math.floor(totalSeconds / 86400);
  var hours = Math.floor((totalSeconds % 86400) / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  return days + "d " + hours + "h " + minutes + "m " + seconds + "s";
}

module.exports = {
  makeRng,
  slugify,
  formatMoney,
  convertCents,
  CAD_TO_USD,
  pad,
  formatCountdown,
};
