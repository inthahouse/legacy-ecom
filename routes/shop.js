/**
 * shop.js - home, collections, PDP, search, contact, marketing pages
 */

const express = require("express");
const router = express.Router();
const catalog = require("../data/catalog");
const listing = require("../lib/listing");
const util = require("../lib/util");

// ---------------------------------------------------------------
// HOME
// ---------------------------------------------------------------
router.get("/", function (req, res) {
  var newArrivals = catalog.products
    .filter(function (p) {
      return p.isNew;
    })
    .sort(function (a, b) {
      return b.createdAt - a.createdAt;
    })
    .slice(0, 12);

  var bestSellers = catalog.products
    .filter(function (p) {
      return p.bestSeller;
    })
    .sort(function (a, b) {
      return b.popularity - a.popularity;
    })
    .slice(0, 12);

  var saleItems = catalog.products
    .filter(function (p) {
      return p.onSale;
    })
    .sort(function (a, b) {
      return b.popularity - a.popularity;
    })
    .slice(0, 12);

  res.render("home", {
    pageTitle: null, // homepage uses the default title
    newArrivals: newArrivals,
    bestSellers: bestSellers,
    saleItems: saleItems,
  });
});

// ---------------------------------------------------------------
// COLLECTIONS
// ---------------------------------------------------------------
router.get("/collections", function (req, res) {
  // group for the landing page
  var editorial = [
    "new-arrivals",
    "best-sellers",
    "sale",
    "denim-shop",
    "outerwear-shop",
    "knitwear-edit",
    "active-shop",
    "under-50",
  ];
  var cols = editorial.map(function (slug) {
    var c = catalog.collectionBySlug[slug];
    return {
      col: c,
      count: catalog.getProductsForCollection(slug).length,
      sample: catalog.getProductsForCollection(slug)[0],
    };
  });
  res.render("collections-index", {
    pageTitle: "Collections",
    groups: cols,
    depts: catalog.DEPTS,
  });
});

router.get("/collections/:slug", function (req, res, next) {
  var col = catalog.collectionBySlug[req.params.slug];
  if (!col) return next(); // fall through to 404

  var base = catalog.getProductsForCollection(col.slug);
  var result = listing.applyListing(base, req.query);

  var viewData = {
    pageTitle: col.name,
    collection: col,
    result: result,
    baseUrl: "/collections/" + col.slug,
    allBrands: catalog.BRANDS,
    colorFamilies: catalog.COLOR_FAMILIES,
    isSearch: false,
    searchQuery: null,
  };

  // filter/sort changes come in over ajax and we just send the middle of the
  // page; scrolling to the bottom asks for one more batch of cards to append
  if (req.query.ajax === "append") {
    return res.render("partials/collection-results-append", viewData);
  }
  if (req.query.ajax === "1") {
    return res.render("partials/collection-results", viewData);
  }
  res.render("collection", viewData);
});

// ---------------------------------------------------------------
// SEARCH (kept the /search url from the old site)
// ---------------------------------------------------------------
router.get("/search", function (req, res) {
  var q = req.query.q || "";
  var base = catalog.searchProducts(q);
  var result = listing.applyListing(base, req.query);

  var viewData = {
    pageTitle: "Search: " + q,
    collection: {
      slug: "__search",
      name: "Search results for “" + q + "”",
      blurb: null,
    },
    result: result,
    baseUrl: "/search",
    allBrands: catalog.BRANDS,
    colorFamilies: catalog.COLOR_FAMILIES,
    isSearch: true,
    searchQuery: q,
  };

  if (req.query.ajax === "append") {
    return res.render("partials/collection-results-append", viewData);
  }
  if (req.query.ajax === "1") {
    return res.render("partials/collection-results", viewData);
  }
  res.render("collection", viewData);
});

// ---------------------------------------------------------------
// PRODUCT DETAIL
// ---------------------------------------------------------------
router.get("/products/:slug", function (req, res, next) {
  var product = catalog.productBySlug[req.params.slug];
  if (!product || product.hidden) return next(); // hidden = GWP skus etc

  // selected colour via ?color=, default first variant
  var variant = product.variants[0];
  if (req.query.color) {
    for (var i = 0; i < product.variants.length; i++) {
      if (product.variants[i].colorSlug === req.query.color) {
        variant = product.variants[i];
        break;
      }
    }
  }

  var related = catalog.relatedProducts(product, 10);
  var reviews = buildReviews(product);

  var inWishlist = res.locals.wishlist.indexOf(product.id) !== -1;

  res.render("product", {
    pageTitle: product.title,
    product: product,
    variant: variant,
    related: related,
    reviews: reviews,
    inWishlist: inWishlist,
    breadcrumb: [
      { name: "Home", url: "/" },
      {
        name: product.dept.charAt(0).toUpperCase() + product.dept.slice(1),
        url: "/collections/" + product.dept,
      },
      {
        name: product.categoryName,
        url: "/collections/" + product.dept + "-" + product.category,
      },
      { name: product.title, url: null },
    ],
  });
});

// Reviews for PDP
const REVIEW_NAMES = [
  "Sarah M.",
  "Mike T.",
  "Priya K.",
  "Dan R.",
  "Amelie B.",
  "Jordan W.",
  "Chris P.",
  "Nadia S.",
  "Kevin L.",
  "Beth H.",
];

const REVIEW_TITLES = [
  "Love it",
  "Great quality",
  "Fits perfectly",
  "Good value",
  "Better in person",
  "Solid basic",
  "Would buy again",
  "Nice fabric",
  "Runs a bit big",
  "My new favourite",
];

const REVIEW_BODIES = [
  "Exactly as pictured. The fabric feels substantial and washed well.",
  "Bought one in every colour. True to size for me.",
  "Quality is great for the price point. Shipping to the west coast was quick.",
  "The colour is slightly darker than the photos but I actually prefer it.",
  "Held up great after several washes. No pilling so far.",
  "Comfortable and well made. I sized up for a looser fit and glad I did.",
  "Second time ordering this. Consistent sizing between colours.",
  "Gifted this and it was a hit. Nice packaging too.",
];

function buildReviews(product) {
  if (!product.ratingCount) return [];
  var rng = util.makeRng(product.id * 7);
  var n = Math.min(4, product.ratingCount);
  var out = [];

  for (var i = 0; i < n; i++) {
    out.push({
      name: rng.pick(REVIEW_NAMES),
      title: rng.pick(REVIEW_TITLES),
      body: rng.pick(REVIEW_BODIES),
      stars: rng.int(Math.max(3, Math.floor(product.rating) - 1), 5),
      date: new Date(Date.now() - rng.int(5, 400) * 86400000),
      verified: rng.chance(0.8),
    });
  }

  return out;
}

// ---------------------------------------------------------------
// MARKETING / STATIC-ISH PAGES
// ---------------------------------------------------------------
router.get("/pages/fall-preview", function (req, res) {
  // "shop the look" products - hand picked by ids at the time, now just grabs
  // suitable candidates so the page never 404s after a reseed
  const looks = [
    pickLook("jackets-coats", "women"),
    pickLook("sweaters-knits", "men"),
    pickLook("jeans-denim", "women"),
    pickLook("shirts", "men"),
  ];

  res.render("pages/fall-preview", {
    pageTitle: "Fall Preview 2026",
    looks,
  });
});

function pickLook(cat, dept) {
  const pool = catalog.products.filter(function (p) {
    return p.category === cat && p.dept === dept;
  });

  return pool[0];
}

router.get("/pages/summer-clearance", function (req, res) {
  const saleByCat = {};

  catalog.CATEGORIES.forEach(function (c) {
    const items = catalog.products.filter(function (p) {
      return p.onSale && p.category === c.slug;
    });

    if (items.length)
      saleByCat[c.slug] = {
        name: c.name,
        count: items.length,
        sample: items[0],
      };
  });

  res.render("pages/summer-clearance", {
    pageTitle: "Summer Clearance",
    saleByCat,
  });
});

router.get("/pages/about", function (req, res) {
  res.render("pages/about", { pageTitle: "Our Story" });
});

router.get("/pages/shipping-returns", function (req, res) {
  res.render("pages/shipping-returns", { pageTitle: "Shipping & Returns" });
});

// ---------------------------------------------------------------
// CONTACT
// ---------------------------------------------------------------
router.get("/contact", function (req, res) {
  res.render("contact", { pageTitle: "Contact Us", errors: null, form: {} });
});

router.post("/contact", function (req, res) {
  const errors = [];

  if (!req.body.name || !String(req.body.name).trim())
    errors.push("Please enter your name.");
  if (!req.body.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(req.body.email))
    errors.push("Please enter a valid email address.");
  if (!req.body.message || String(req.body.message).trim().length < 10)
    errors.push("Message needs to be at least 10 characters.");

  if (errors.length) {
    return res.status(422).render("contact", {
      pageTitle: "Contact Us",
      errors: errors,
      form: req.body,
    });
  }

  console.log(
    "[contact] message from " +
      req.body.email +
      " (" +
      (req.body.topic || "general") +
      ")",
  );
  req.session.flash = {
    type: "success",
    text:
      "Thanks " +
      req.body.name.split(" ")[0] +
      "! We got your message and will reply within 1–2 business days.",
  };

  res.redirect("/contact");
});

module.exports = router;
