/* ============================================================================
   account.js - "Add Card" reveal + payment field formatting on /account.
   Formatting mirrors checkout.js; server re-validates everything either way.
   ============================================================================ */

$(function () {
  var $toggle = $("#add-card-toggle");
  var $body = $("#add-card-body");
  if (!$toggle.length) return;

  function syncToggleLabel() {
    var open = $body.hasClass("is-open");
    $toggle.text(open ? "Cancel" : "Add Card").attr("aria-expanded", String(open));
  }
  syncToggleLabel();

  $toggle.on("click", function () {
    $body.toggleClass("is-open");
    syncToggleLabel();
  });

  /* ---------------- card number: auto-space every 4 ---------------- */
  $("#acc-cc-num").on("input", function () {
    var digits = $(this).val().replace(/\D/g, "").slice(0, 16);
    $(this).val(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
  });

  /* ---------------- expiry: auto slash ---------------- */
  $("#acc-cc-exp").on("input", function () {
    var digits = $(this).val().replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      $(this).val(digits.slice(0, 2) + "/" + digits.slice(2));
    } else {
      $(this).val(digits);
    }
  });

  $("#acc-cc-cvv").on("input", function () {
    $(this).val($(this).val().replace(/\D/g, "").slice(0, 4));
  });
});
