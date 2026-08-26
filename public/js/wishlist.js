/* ============================================================================
   wishlist.js - grid/list view toggle for the wishlist page.
   Same behaviour as the collections page (see tnoInitViewToggle in main.js),
   sharing the same localStorage key so the view preference is one setting
   across the whole site.
   ============================================================================ */

$(function () {
  var $results = $("#wishlist-results");
  if ($results.length) tnoInitViewToggle($results, "tno_view");
});
