/**
 * listing.js - shared product-list filtering/sorting/infinite-scroll windowing.
 * Used by collection pages AND search results. Facet counts are computed
 * off the unfiltered base list which is not "right" but matches what the
 * old Magento layered nav did, and nobody has complained since 2018.
 *
 * Browsing is infinite-scroll: `page` here just means "which sequential
 * batch", requested one at a time as the user scrolls (see
 * public/js/collection.js). There's no page-count/clamping - if you ask
 * for a batch past the end you just get an empty items array back.
 * Classic page-number pagination still exists as a standalone module,
 * see lib/pagination.js, it's just not plugged in here right now.
 */

var PAGE_SIZE = 24;

function toArray(v) {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v;
  // support comma separated too - old email links used commas
  return String(v).split(',').filter(function (x) { return x !== ''; });
}

function applyListing(baseProducts, query) {
  var brands = toArray(query.brand);
  var colors = toArray(query.color);
  var sizes = toArray(query.size);
  var priceMin = parseFloat(query.price_min); // dollars, CAD
  var priceMax = parseFloat(query.price_max);
  var sort = query.sort || 'featured';
  var page = parseInt(query.page, 10) || 1;
  if (page < 1) page = 1;

  // ---- facets off the base list ----
  var facetBrands = {};
  var facetColors = {};
  var facetSizes = {};
  var minPrice = Infinity, maxPrice = 0;

  baseProducts.forEach(function (p) {
    facetBrands[p.brand] = (facetBrands[p.brand] || 0) + 1;
    if (p.price < minPrice) minPrice = p.price;
    if (p.price > maxPrice) maxPrice = p.price;
    var seenFam = {};
    var seenSize = {};
    p.variants.forEach(function (v) {
      if (!seenFam[v.colorFamily]) {
        seenFam[v.colorFamily] = true;
        facetColors[v.colorFamily] = (facetColors[v.colorFamily] || 0) + 1;
      }
      v.sizes.forEach(function (s) {
        if (!seenSize[s.size] && s.stock > 0) {
          seenSize[s.size] = true;
          facetSizes[s.size] = (facetSizes[s.size] || 0) + 1;
        }
      });
    });
  });
  if (minPrice === Infinity) { minPrice = 0; }

  // ---- filter ----
  var items = baseProducts.filter(function (p) {
    if (brands.length && brands.indexOf(p.brand) === -1) return false;

    if (colors.length) {
      var hasColor = p.variants.some(function (v) {
        return colors.indexOf(v.colorFamily) !== -1;
      });
      if (!hasColor) return false;
    }

    if (sizes.length) {
      var hasSize = p.variants.some(function (v) {
        return v.sizes.some(function (s) {
          return sizes.indexOf(s.size) !== -1 && s.stock > 0;
        });
      });
      if (!hasSize) return false;
    }

    if (!isNaN(priceMin) && p.price < priceMin * 100) return false;
    if (!isNaN(priceMax) && p.price > priceMax * 100) return false;

    return true;
  });

  // ---- sort ----
  switch (sort) {
    case 'price-asc':
      items.sort(function (a, b) { return a.price - b.price; });
      break;
    case 'price-desc':
      items.sort(function (a, b) { return b.price - a.price; });
      break;
    case 'newest':
      items.sort(function (a, b) { return b.createdAt - a.createdAt; });
      break;
    case 'rating':
      items.sort(function (a, b) { return b.rating - a.rating || b.ratingCount - a.ratingCount; });
      break;
    case 'name-asc':
      items.sort(function (a, b) { return a.title < b.title ? -1 : 1; });
      break;
    case 'featured':
    default:
      items.sort(function (a, b) { return b.popularity - a.popularity; });
      sort = 'featured';
  }

  // ---- window off the next batch (infinite scroll) ----
  var totalItems = items.length;
  var startIdx = (page - 1) * PAGE_SIZE;
  var pageItems = items.slice(startIdx, startIdx + PAGE_SIZE);
  var hasMore = startIdx + pageItems.length < totalItems;

  return {
    items: pageItems,
    totalItems: totalItems,
    page: page,
    pageSize: PAGE_SIZE,
    hasMore: hasMore,
    sort: sort,
    selected: {
      brands: brands,
      colors: colors,
      sizes: sizes,
      priceMin: isNaN(priceMin) ? null : priceMin,
      priceMax: isNaN(priceMax) ? null : priceMax
    },
    facets: {
      brands: facetBrands,
      colors: facetColors,
      sizes: facetSizes,
      priceRange: { min: Math.floor(minPrice / 100), max: Math.ceil(maxPrice / 100) }
    }
  };
}

module.exports = { applyListing: applyListing, PAGE_SIZE: PAGE_SIZE };
