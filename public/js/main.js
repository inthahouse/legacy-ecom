/* ============================================================================
   main.js - global site behaviour. Loaded on every page.
   jQuery all the way down. If you're reading this wondering why we don't use
   React: we tried in 2019 (see /spa-experiment branch), checkout conversion
   dropped 4%, we reverted, we don't talk about it.
   ============================================================================ */

/* ---------------- tiny toast helper (used everywhere) ---------------- */
function tnoToast(html, type) {
  var $t = $(
    '<div class="toast toast-' + (type || "success") + '">' + html + "</div>",
  );
  $("#toast-stack").append($t);
  setTimeout(function () {
    $t.addClass("is-in");
  }, 20);
  setTimeout(function () {
    $t.removeClass("is-in");
    setTimeout(function () {
      $t.remove();
    }, 300);
  }, 3800);
}

/* gift-with-purchase announcements. the beanie name is hardcoded here AND
   in the templates AND in data/catalog.js. three places. we know. */
function tnoGiftToast(evt) {
  if (evt === "added") {
    tnoToast(
      "&#127873; <strong>Free gift unlocked!</strong> A Wool Camp Beanie was added to your cart.",
    );
  } else if (evt === "removed") {
    tnoToast(
      "Your cart dropped below the $500 promo &mdash; the free gift was removed.",
      "error",
    );
  }
}
// full-page reloads (cart page flow) eat the toast, so it gets stashed in
// sessionStorage right before the reload and replayed here on the way back in
function tnoStashGiftEvent(evt) {
  if (!evt) return;
  try {
    sessionStorage.setItem("tno_gift_evt", evt);
  } catch (e) {
    /* private mode */
  }
}

/* ---------------- grid / list view toggle (shared: collections + wishlist)
   preference lives in localStorage - one global "view mode" pref for every
   product grid on the site. returns the apply() fn so callers can re-sync
   after replacing the grid's contents (e.g. an ajax filter reload). */
// view modes: "grid" (3-up, default), "grid-4" (4-up), "list". Each (other
// than the default) gets a class on $scope named "view-" + the mode, which
// the CSS keys off - see .view-list / .view-grid-4 in style.css.
var TNO_VIEW_MODES = ["grid", "grid-4", "list"];

function tnoInitViewToggle($scope, storageKey) {
  function getPref() {
    try {
      var v = localStorage.getItem(storageKey);
      return TNO_VIEW_MODES.indexOf(v) !== -1 ? v : "grid";
    } catch (e) {
      return "grid"; // private mode
    }
  }
  function setPref(view) {
    try {
      localStorage.setItem(storageKey, view);
    } catch (e) {
      /* private mode */
    }
  }
  function apply() {
    var view = getPref();
    TNO_VIEW_MODES.forEach(function (mode) {
      if (mode !== "grid") $scope.toggleClass("view-" + mode, view === mode);
    });
    $scope.find(".js-view-toggle").each(function () {
      var isActive = $(this).data("view") === view;
      $(this)
        .toggleClass("is-active", isActive)
        .attr("aria-pressed", String(isActive));
    });
  }
  apply();

  $scope.on("click", ".js-view-toggle", function () {
    var view = $(this).data("view");
    if (getPref() === view) return;
    setPref(view);

    // crossfade instead of an instant reflow - the view modes use different
    // layout modes (grid vs flex rows, or a different column count) so the
    // geometry can't be transitioned directly, fade out, swap the class
    // while invisible, fade back in.
    var $grid = $scope.find(".product-grid");
    $grid.addClass("view-switching");
    setTimeout(function () {
      apply();
      requestAnimationFrame(function () {
        $grid.removeClass("view-switching");
      });
    }, 180);
  });

  return apply;
}

/* ---------------- carousel "plugin" ---------------- */
/* wrote this in an afternoon in 2018 after slick.js kept fighting with
   the lazyloader. it has exactly the features we need and no more. */
(function ($) {
  $.fn.tnoCarousel = function () {
    return this.each(function () {
      var $root = $(this);
      var $track = $root.find(".carousel-track");
      var $cells = $track.children();
      var index = 0;

      function perView() {
        var w = $(window).width();
        if (w <= 640) return 2;
        if (w <= 1100) return 3;
        return 4;
      }

      function maxIndex() {
        return Math.max(0, $cells.length - perView());
      }

      function update() {
        if (index > maxIndex()) index = maxIndex();
        if (index < 0) index = 0;
        var cellW = 100 / perView();
        $track.css("transform", "translateX(-" + index * cellW + "%)");
        $cells.css("flex-basis", cellW + "%");
        $root.find(".carousel-prev").prop("disabled", index <= 0);
        $root.find(".carousel-next").prop("disabled", index >= maxIndex());
      }

      $root.find(".carousel-next").on("click", function () {
        index++;
        update();
      });
      $root.find(".carousel-prev").on("click", function () {
        index--;
        update();
      });

      var rt;
      $(window).on("resize", function () {
        clearTimeout(rt);
        rt = setTimeout(update, 150);
      });

      update();
    });
  };
})(jQuery);

$(function () {
  $("[data-carousel]").tnoCarousel();

  // replay a gift toast that was stashed before a full-page reload
  try {
    var stashedGiftEvt = sessionStorage.getItem("tno_gift_evt");
    if (stashedGiftEvt) {
      sessionStorage.removeItem("tno_gift_evt");
      tnoGiftToast(stashedGiftEvt);
    }
  } catch (e) {
    /* private mode */
  }

  // same deal for checkout's sold-out-item removal - the reload can land on
  // /cart instead of /checkout (if the bag emptied out entirely), so this
  // lives here rather than in checkout.js to catch it either way
  try {
    var stashedRemoved = sessionStorage.getItem("tno_checkout_removed");
    if (stashedRemoved) {
      sessionStorage.removeItem("tno_checkout_removed");
      var removedTitles = $.parseJSON(stashedRemoved);
      tnoToast(
        "<strong>Heads up:</strong> " +
          removedTitles.join(", ") +
          (removedTitles.length > 1 ? " were" : " was") +
          " removed from your bag &mdash; sold out.",
        "error",
      );
    }
  } catch (e) {
    /* private mode */
  }

  /* ---------------- theme toggle ---------------- */
  $("#theme-toggle").on("click", function () {
    var next = $("body").hasClass("theme-dark") ? "light" : "dark";
    $("body").toggleClass("theme-dark", next === "dark");
    $(this)
      .find(".theme-toggle-icon")
      .text(next === "dark" ? "☀" : "☾");
    $(this)
      .find(".theme-toggle-label")
      .text(next === "dark" ? "Light" : "Dark");
    TNO.theme = next;
    $.post("/api/theme", { theme: next }); // fire & forget, cookie does the SSR part
  });

  /* ---------------- currency ---------------- */
  $("#currency-select").on("change", function () {
    var cur = $(this).val();
    $.post("/api/currency", { currency: cur }).always(function () {
      // prices are server-rendered, easiest correct thing is a reload.
      // client-side conversion was tried once. rounding bugs. never again.
      window.location.reload();
    });
  });

  /* ---------------- mobile drawer ---------------- */
  $("#hamburger").on("click", function () {
    $("#mobile-drawer, #drawer-overlay").addClass("is-open");
  });

  $("#drawer-close, #drawer-overlay").on("click", function () {
    $("#mobile-drawer, #cart-drawer, #drawer-overlay").removeClass("is-open");
    $("#filter-sidebar").removeClass("is-open");
    $("body").css("overflow", "");
  });

  $(".m-sub-toggle").on("click", function () {
    var $li = $(this).closest(".m-has-sub");
    $li.toggleClass("is-open");
    $(this).text($li.hasClass("is-open") ? "–" : "+");
  });

  /* ---------------- flash close ---------------- */
  $(".flash-close").on("click", function () {
    $(this).closest(".flash").slideUp(150);
  });

  /* ---------------- search autocomplete ---------------- */
  var suggestTimer = null;
  $("#search-input").on("keyup", function (e) {
    if (e.key === "Escape") {
      $("#search-suggest").removeClass("is-open");
      return;
    }
    var q = $(this).val();
    clearTimeout(suggestTimer);
    if (q.length < 2) {
      $("#search-suggest").removeClass("is-open").empty();
      return;
    }
    suggestTimer = setTimeout(function () {
      $.get("/api/search/suggest", { q: q }, function (html) {
        if (html && html.trim()) {
          $("#search-suggest").html(html).addClass("is-open");
        } else {
          $("#search-suggest").removeClass("is-open").empty();
        }
      });
    }, 250);
  });
  $(document).on("click", function (e) {
    if (!$(e.target).closest("#header-search").length) {
      $("#search-suggest").removeClass("is-open");
    }
  });

  /* ---------------- cart drawer ---------------- */
  /* replaced the old hover minicart dropdown (2026 redesign). the bag icon
     now opens a slide-out with the items, a checkout button and a link to
     the full cart page. the /api/minicart endpoint is still around. */
  function loadCartDrawer() {
    $("#cart-drawer-body").html('<div class="modal-loading">Loading…</div>');
    $.get("/api/cart-drawer", function (html) {
      $("#cart-drawer-body").html(html);
      var count = $("#cart-drawer-body .cart-drawer-inner").data("count");
      if (count !== undefined) updateCartBadge(count);
    }).fail(function () {
      $("#cart-drawer-body").html(
        '<div class="cart-drawer-empty"><p>Couldn\'t load your cart.</p><a class="btn btn-ghost btn-block" href="/cart">Go to cart page</a></div>',
      );
    });
  }

  function openCartDrawer() {
    $("#cart-drawer, #drawer-overlay").addClass("is-open");
    $("body").css("overflow", "hidden");
    loadCartDrawer();
  }

  function closeCartDrawer() {
    $("#cart-drawer").removeClass("is-open");
    if (!$("#mobile-drawer").hasClass("is-open")) {
      $("#drawer-overlay").removeClass("is-open");
      $("body").css("overflow", "");
    }
  }
  window.tnoOpenCartDrawer = openCartDrawer;

  $("#header-cart").on("click", function (e) {
    e.preventDefault(); // href=/cart stays as the no-JS fallback
    openCartDrawer();
  });
  $("#cart-drawer-close").on("click", closeCartDrawer);

  // qty steppers + remove inside the drawer (content is ajax'd, so delegate)
  function drawerCartPost(url, data) {
    $.ajax({
      url: url,
      type: "POST",
      data: data,
      headers: { "X-Requested-With": "XMLHttpRequest" },
      success: function (res) {
        updateCartBadge(res.cartCount);
        // the cart page shows the same lines - keep the two in sync the
        // blunt way, same reasoning as cart.js
        if (
          window.location.pathname === "/cart" ||
          window.location.pathname === "/checkout"
        ) {
          tnoStashGiftEvent(res.giftEvent); // toast survives the reload
          window.location.reload();
        } else {
          if (res.giftEvent) tnoGiftToast(res.giftEvent);
          loadCartDrawer();
        }
      },
      error: function () {
        loadCartDrawer();
      },
    });
  }

  $(document).on("click", ".js-drawer-qty", function () {
    var $stepper = $(this).closest(".qty-stepper");
    var sku = $stepper.data("sku");
    var qty =
      (parseInt($stepper.data("qty"), 10) || 1) +
      parseInt($(this).data("delta"), 10);
    if (qty < 0) qty = 0; // 0 removes the line server-side
    drawerCartPost("/cart/update", { sku: sku, qty: qty });
  });

  $(document).on("click", ".js-drawer-remove", function () {
    drawerCartPost("/cart/remove", { sku: $(this).data("sku") });
  });

  function updateCartBadge(count) {
    TNO.cartCount = count;
    $(".cart-badge").text(count).toggleClass("is-empty", !count);
  }
  function updateWishBadge(count) {
    $(".wishlist-badge").text(count).toggleClass("is-empty", !count);
  }
  // expose for the page scripts
  window.tnoUpdateCartBadge = updateCartBadge;

  /* ---------------- add to cart (shared) ---------------- */
  window.tnoAddToCart = function (sku, qty, $btn) {
    const origText = $btn ? $btn.text() : "";

    if ($btn) $btn.prop("disabled", true).text("Adding…");
    $.ajax({
      url: "/cart/add",
      type: "POST",
      data: { sku: sku, qty: qty || 1 },
      headers: { "X-Requested-With": "XMLHttpRequest" },
      success: function (res) {
        updateCartBadge(res.cartCount);
        // adding to cart opens the drawer - the toast-only version tested
        // worse, people didn't notice the badge tick up
        openCartDrawer();
        if (res.giftEvent) tnoGiftToast(res.giftEvent);
      },
      error: function (xhr) {
        var msg = "Could not add to cart.";
        try {
          msg = $.parseJSON(xhr.responseText).error || msg;
        } catch (e) {}
        tnoToast(msg, "error");
      },
      complete: function () {
        if ($btn) $btn.prop("disabled", false).text(origText);
      },
    });
  };

  /* ---------------- wishlist toggle (works everywhere, delegated) ------- */
  $(document).on("click", ".js-wishlist-toggle", function (e) {
    e.preventDefault();

    const $btn = $(this);
    const productId = $btn.data("product-id");

    // potential for slow

    $.post("/api/wishlist/toggle", { productId }, function (res) {
      $('.js-wishlist-toggle[data-product-id="' + productId + '"]').toggleClass(
        "is-active",
        res.added,
      );
      updateWishBadge(res.count);
      if (res.added) {
        tnoToast(
          'Saved to your wishlist &nbsp;·&nbsp; <a href="/wishlist">View</a>',
        );
      } else {
        tnoToast("Removed from wishlist");
      }
    });
  });

  /* ---------------- product card swatches ---------------- */
  $(document).on("click", ".card-swatch", function (e) {
    e.preventDefault();
    var $sw = $(this);
    var $card = $sw.closest(".product-card");
    $card.find(".card-swatch").removeClass("is-active");
    $sw.addClass("is-active");
    $card.find(".card-img-front").attr("src", $sw.data("front"));
    $card.find(".card-img-hover").attr("src", $sw.data("hover"));
    $card.find(".card-img-link, .card-title").attr("href", $sw.data("url"));
  });

  /* ---------------- quick view modal ---------------- */
  function openModal() {
    $("#tno-modal-overlay").addClass("is-open");
    $("body").css("overflow", "hidden");
  }
  function closeModal() {
    $("#tno-modal-overlay").removeClass("is-open");
    $("#tno-modal-body").empty();
    $("body").css("overflow", "");
  }
  window.tnoCloseModal = closeModal;

  $(document).on("click", ".js-quickview", function (e) {
    e.preventDefault();
    var pid = $(this).data("product-id");
    $("#tno-modal-body").html('<div class="modal-loading">Loading…</div>');
    openModal();
    $.get("/api/quickview/" + pid, function (html) {
      $("#tno-modal-body").html(html);
    }).fail(function () {
      $("#tno-modal-body").html(
        '<div class="qv-error">Something went wrong. <a href="#" onclick="location.reload()">Reload?</a></div>',
      );
    });
  });

  /* ---------------- size guide modal (PDP) ---------------- */
  $(document).on("click", ".js-size-guide", function (e) {
    e.preventDefault();
    var pid = $(this).data("product-id");
    $("#tno-modal-body").html('<div class="modal-loading">Loading…</div>');
    openModal();
    $.get("/api/size-guide/" + pid, function (html) {
      $("#tno-modal-body").html(html);
    }).fail(function () {
      $("#tno-modal-body").html(
        '<div class="qv-error">Something went wrong. <a href="#" onclick="location.reload()">Reload?</a></div>',
      );
    });
  });

  $("#tno-modal-close").on("click", closeModal);
  $("#tno-modal-overlay").on("click", function (e) {
    if (e.target === this) closeModal();
  });
  $(document).on("keyup", function (e) {
    if (e.key === "Escape") {
      closeModal();
      closeCartDrawer();
    }
  });

  // quickview interactions (delegated - content is ajax'd in)
  $(document).on("click", ".qv-swatch", function () {
    var pid = $(this).data("product-id");
    var color = $(this).data("color");
    $.get("/api/quickview/" + pid, { color: color }, function (html) {
      $("#tno-modal-body").html(html);
    });
  });
  $(document).on("click", ".qv-size:not(:disabled)", function () {
    var $qv = $(this).closest(".qv");
    $qv.find(".qv-size").removeClass("is-active");
    $(this).addClass("is-active");
    $qv.find(".qv-add").prop("disabled", false).text("Add to Cart");
  });
  $(document).on("click", ".qv-add", function () {
    var $qv = $(this).closest(".qv");
    var sku = $qv.find(".qv-size.is-active").data("sku");
    if (!sku) return;
    // close the modal right away - the cart drawer opening IS the feedback,
    // and it slides in underneath the modal overlay otherwise (z-index)
    closeModal();
    window.tnoAddToCart(sku, 1, null);
  });

  /* ---------------- cookie consent ---------------- */
  /* choice lives in localStorage (not a cookie - the irony is noted) so it
     persists across sessions without a server round-trip. banner shows once,
     10s after landing on a page, until the visitor picks accept or decline. */
  var COOKIE_CONSENT_KEY = "tno_cookie_consent";

  function getCookieConsent() {
    try {
      var raw = localStorage.getItem(COOKIE_CONSENT_KEY);
      return raw ? $.parseJSON(raw) : null;
    } catch (e) {
      return null; // private mode / storage disabled
    }
  }

  function setCookieConsent(status) {
    try {
      localStorage.setItem(
        COOKIE_CONSENT_KEY,
        JSON.stringify({ status: status, ts: $.now() }),
      );
    } catch (e) {
      /* private mode */
    }
  }

  if (!getCookieConsent()) {
    setTimeout(function () {
      if (!getCookieConsent()) $("#cookie-consent").addClass("is-open");
    }, 10000);
  }

  $("#cookie-consent-accept").on("click", function () {
    setCookieConsent("accepted");
    $("#cookie-consent").removeClass("is-open");
  });
  $("#cookie-consent-decline").on("click", function () {
    setCookieConsent("declined");
    $("#cookie-consent").removeClass("is-open");
  });

  /* ---------------- newsletter (goes nowhere, looks real) -------------- */
  $("#newsletter-form").on("submit", function (e) {
    e.preventDefault();
    $(this).find(".newsletter-row").hide();
    $(this).find(".newsletter-done").show();
  });
});
