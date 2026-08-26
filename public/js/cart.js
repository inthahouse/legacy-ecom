/* ============================================================================
   cart.js - cart page. qty changes and removals POST then reload.
   Yes, a full reload. The half-ajax version from 2020 got line totals and the
   summary out of sync when a promo was applied. Reload is always right.
   ============================================================================ */

$(function () {
  function postAndReload(url, data) {
    $.ajax({
      url: url,
      type: "POST",
      data: data,
      headers: { "X-Requested-With": "XMLHttpRequest" },
      success: function (res) {
        // gift promo may have kicked in/out - stash so main.js can toast
        // about it on the other side of the reload
        if (res && res.giftEvent && typeof tnoStashGiftEvent === "function") {
          tnoStashGiftEvent(res.giftEvent);
        }
      },
      complete: function () {
        window.location.reload();
      },
    });
  }

  $(".js-cart-qty").on("click", function () {
    var sku = $(this).data("sku");
    var delta = parseInt($(this).data("delta"), 10);
    var $input = $('.js-cart-qty-input[data-sku="' + sku + '"]');
    var qty = (parseInt($input.val(), 10) || 1) + delta;

    if (qty < 0) qty = 0; // 0 removes the line server-side
    postAndReload("/cart/update", { sku: sku, qty: qty });
  });

  $(".js-cart-qty-input").on("change", function () {
    var qty = parseInt($(this).val(), 10);

    if (isNaN(qty) || qty < 0) qty = 1;
    postAndReload("/cart/update", { sku: $(this).data("sku"), qty: qty });
  });

  $(".js-cart-remove").on("click", function () {
    postAndReload("/cart/remove", { sku: $(this).data("sku") });
  });
});
