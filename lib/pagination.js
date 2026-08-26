/**
 * pagination.js - classic page-number pagination.
 *
 * NOT wired into the live product listing right now - collection/search
 * results use infinite scroll instead (see lib/listing.js, which does its
 * own batch windowing, and public/js/collection.js for the scroll-triggered
 * loading). This module is kept standalone, independent of that code path,
 * so page-based browsing can be switched back on later without having to
 * re-derive the slicing/page-count math.
 *
 * To reinstate: have a route call paginate(items, req.query.page, PAGE_SIZE)
 * instead of relying on listing.js's hasMore/page fields, and bring back a
 * prev/page-number/next nav in the view (see git history / the "pagination"
 * CSS block in style.css, which was left in place for this).
 */

var PAGE_SIZE = 24;

function paginate(items, page, pageSize) {
  pageSize = pageSize || PAGE_SIZE;
  page = parseInt(page, 10) || 1;
  if (page < 1) page = 1;

  var totalItems = items.length;
  var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (page > totalPages) page = totalPages;

  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    totalItems: totalItems,
    page: page,
    totalPages: totalPages,
    pageSize: pageSize,
  };
}

module.exports = { paginate: paginate, PAGE_SIZE: PAGE_SIZE };
