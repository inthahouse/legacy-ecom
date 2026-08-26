const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const util = require("./lib/util");
const catalog = require("./data/catalog");
const cartLib = require("./lib/cart");
const usersDb = require("./data/users");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// app.set('view cache', true); // turned off 2022-03, made template edits "not take"

app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(
  session({
    name: "tno.sid",
    secret: "keyboard-cat-2018", // TODO rotate. added to backlog 6 years ago
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  }),
);

const PUBLIC_DIR = path.join(__dirname, "public");
const JS_DIR = path.join(PUBLIC_DIR, "js");
const JS_VENDOR_DIR = path.join(JS_DIR, "vendor");

const APP_SCRIPTS = fs
  .readdirSync(JS_DIR)
  .filter(function (f) {
    return f.slice(-3) === ".js" && f !== "main.js";
  })
  .map(function (f) {
    return f.slice(0, -3);
  })
  .sort();

app.use(
  express.static(PUBLIC_DIR, {
    maxAge: "1h",
    setHeaders: function (res, filePath) {
      // app JS is always-loaded and edited constantly - never let the
      // browser hang on to a stale copy. vendor libs (jquery etc) don't
      // change and keep the normal maxAge above.
      if (
        filePath.slice(-3) === ".js" &&
        filePath.indexOf(JS_DIR) === 0 &&
        filePath.indexOf(JS_VENDOR_DIR) !== 0
      ) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  }),
);

// ---------------------------------------------------------------------
// globals for every render. Everything the header/footer needs lives
// here so the individual routes don't have to think about it.
// ---------------------------------------------------------------------
app.use(function (req, res, next) {
  // currency: session wins, falls back to cookie (set pre-2020), falls back CAD
  var currency = req.session.currency || req.cookies.tno_currency || "CAD";
  if (currency !== "CAD" && currency !== "USD") currency = "CAD";
  req.currency = currency;
  // write it back so lib/cart (which only sees the session) agrees with us.
  // the GWP threshold depends on this - see lib/cart.js
  req.session.currency = currency;

  // ?_theme=dark override kept from the 2022 dark-mode QA cycle. handy, keep.
  var theme = req.query._theme || req.cookies.tno_theme;
  theme = theme === "dark" ? "dark" : "light";

  var user = null;
  if (req.session.userId) {
    user = usersDb.findById(req.session.userId);
    if (!user) req.session.userId = null; // stale session after restart
  }
  req.user = user;

  // wishlist lives on the user when signed in, on the session for guests
  var wishlist = user ? user.wishlist : req.session.wishlist || [];

  var cartView = cartLib.buildCartView(req.session);

  // one-shot flash message
  var flash = req.session.flash || null;
  req.session.flash = null;

  res.locals.SITE_NAME = "True North Outfitters";
  res.locals.currency = currency;
  res.locals.theme = theme;
  res.locals.user = user;
  res.locals.wishlist = wishlist;
  res.locals.wishlistCount = wishlist.length;
  res.locals.cartCount = cartView.itemCount;
  res.locals.flash = flash;
  res.locals.currentPath = req.path;
  res.locals.query = req.query;

  // formatting helpers straight into the templates. fmt() everywhere.
  res.locals.fmt = function (cents) {
    return util.formatMoney(cents, currency);
  };
  res.locals.fmtCAD = function (cents) {
    return util.formatMoney(cents, "CAD");
  };
  res.locals.fmtUsd = function (cents) {
    return util.formatMoney(cents, "USD");
  };

  // nav data (cheap enough to compute per request, don't cache prematurely)
  res.locals.NAV = buildNav();
  res.locals.appScripts = APP_SCRIPTS;

  next();
});

// nav is static per boot really, but this function predates that realization
var _navCache = null;
function buildNav() {
  if (_navCache) return _navCache;
  var depts = catalog.DEPTS.map(function (d) {
    // the two promo images on the right side of the mega panel: first jacket
    // + first knit we can find in that dept. was hardcoded ids before reseeds.
    var tileCats = ["jackets-coats", "sweaters-knits", "tees-tops"];
    var tiles = [];
    tileCats.forEach(function (catSlug) {
      if (tiles.length >= 2) return;
      var p = catalog.products.filter(function (pr) {
        return pr.dept === d.slug && pr.category === catSlug;
      })[0];
      if (p) {
        tiles.push({
          image: p.variants[0].images[0],
          label: p.categoryName,
          href: "/collections/" + d.slug + "-" + catSlug,
        });
      }
    });
    return {
      slug: d.slug,
      name: d.name,
      tiles: tiles,
      categories: catalog.CATEGORIES.filter(function (c) {
        return c.depts.indexOf(d.slug) !== -1;
      }).map(function (c) {
        return { slug: d.slug + "-" + c.slug, name: c.name };
      }),
    };
  });
  _navCache = {
    depts: depts,
    brands: catalog.BRANDS,
    extras: [
      { slug: "new-arrivals", name: "New Arrivals" },
      { slug: "best-sellers", name: "Best Sellers" },
      { slug: "sale", name: "Sale", hot: true },
    ],
  };
  return _navCache;
}

// ---------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------
app.use("/", require("./routes/shop"));
app.use("/", require("./routes/cart"));
app.use("/", require("./routes/account"));
app.use("/", require("./routes/stores"));
app.use("/api", require("./routes/api"));
app.use("/media", require("./routes/media"));

// legacy redirects kept from the magento days - old links still out in
// the wild in email campaigns
app.get("/index.php", function (req, res) {
  res.redirect(301, "/");
});

app.get("/catalogsearch/result", function (req, res) {
  res.redirect(301, "/search?q=" + encodeURIComponent(req.query.q || ""));
});

app.get("/customer/account/login", function (req, res) {
  res.redirect(301, "/login");
});

// 404
app.use(function (req, res) {
  res.status(404).render("404", { pageTitle: "Page Not Found" });
});

// error handler of last resort
app.use(function (err, req, res, next) {
  console.error("[error]", err && err.stack ? err.stack : err);
  res
    .status(500)
    .send(
      '<h1>Something went wrong</h1><p>Try again, or head back to the <a href="/">homepage</a>.</p>',
    );
});

app.listen(PORT, function () {
  console.log("==============================================");
  console.log(" True North Outfitters");
  console.log(
    " catalog: " +
      catalog.stats.styles +
      " styles / " +
      catalog.stats.colorways +
      " colourways / " +
      catalog.stats.skus +
      " SKUs",
  );
  console.log(" listening on http://localhost:" + PORT);
  console.log("==============================================");
});
