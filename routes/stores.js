/**
 * stores.js - store locator. All 100+ stores get shipped to the client as a
 * JSON blob and jQuery filters them there. It's ~40KB, it's fine, it was
 * faster than the old ajax version on store wifi.
 */

const express = require("express");
const router = express.Router();
const storesDb = require("../data/stores");

router.get("/stores", function (req, res) {
  res.render("stores", {
    pageTitle: "Store Finder",
    stores: storesDb.stores,
    regions: storesDb.regions,
    storeCount: storesDb.stores.length,
  });
});

router.get("/stores/:id", function (req, res, next) {
  let store = null;

  for (var i = 0; i < storesDb.stores.length; i++) {
    if (String(storesDb.stores[i].id) === req.params.id) {
      store = storesDb.stores[i];
      break;
    }
  }

  if (!store) return next();

  res.render("store-detail", { pageTitle: store.name, store: store });
});

module.exports = router;
