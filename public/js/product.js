/* ============================================================================
   product.js - PDP behaviour: swatches, sizes, gallery, qty, tabs, add to cart
   Reads PDP_DATA (inlined by product.ejs).
   ============================================================================ */

$(function () {
  if (typeof window.PDP_DATA === "undefined") return;

  let currentVariant = null;
  let selectedSku = null;
  let currentSlideIndex = 0;

  // figure out the initial variant from the active swatch
  const initColor = $("#pdp-swatches .pdp-swatch.is-active").data("color");

  PDP_DATA.variants.forEach(function (v) {
    if (v.colorSlug === initColor) currentVariant = v;
  });

  if (!currentVariant) currentVariant = PDP_DATA.variants[0];

  /* ---------------- gallery (carousel) ----------------
     viewport/track/slides/arrows are rendered server side in product.ejs
     for the initial variant. On a colour change there's a new set of
     images to show, so the track's slides get rebuilt here - everything
     else (nav, transform) reuses the markup already on the page. */
  function renderGallerySlides(variant) {
    var $track = $("#pdp-gallery-track").empty();

    variant.images.forEach(function (img, i) {
      var $slide = $("<div>", { class: "pdp-gallery-slide" });
      $("<img>")
        .attr({
          src: img,
          alt:
            PDP_DATA.title + " in " + variant.colorName + " — view " + (i + 1),
        })
        .appendTo($slide);
      $track.append($slide);
    });

    currentSlideIndex = 0;
    $track.css("transform", "translateX(0)");
  }

  function goToSlide(index) {
    const $slides = $("#pdp-gallery-track .pdp-gallery-slide");
    if (!$slides.length) return;

    if (index < 0) index = $slides.length - 1;
    if (index >= $slides.length) index = 0;
    currentSlideIndex = index;

    $("#pdp-gallery-track").css(
      "transform",
      "translateX(-" + index * 100 + "%)",
    );
    $(".pdp-thumb").removeClass("is-active").eq(index).addClass("is-active");
  }

  // thumbs are rebuilt on every colour change, so delegate rather than
  // binding directly to elements that get replaced
  $(document).on("click", ".pdp-thumb", function () {
    goToSlide($(".pdp-thumb").index(this));
  });

  $("#pdp-gallery-next").on("click", function () {
    goToSlide(currentSlideIndex + 1);
  });
  $("#pdp-gallery-prev").on("click", function () {
    goToSlide(currentSlideIndex - 1);
  });

  /* ---------------- colour swatches ---------------- */
  $("#pdp-swatches").on("click", ".pdp-swatch", function () {
    const color = $(this).data("color");
    let variant = null;

    PDP_DATA.variants.forEach(function (v) {
      if (v.colorSlug === color) variant = v;
    });

    if (!variant) return;

    currentVariant = variant;
    selectedSku = null;

    $("#pdp-swatches .pdp-swatch").removeClass("is-active");
    $(this).addClass("is-active");
    $("#pdp-color-name").text(variant.colorName);

    // new colour means an entirely new image set - rebuild the slides
    // rather than trying to slide the existing ones to match
    renderGallerySlides(variant);

    var $thumbs = $("#pdp-thumbs").empty();

    variant.images.forEach(function (img, i) {
      $thumbs.append(
        '<button class="pdp-thumb ' +
          (i === 0 ? "is-active" : "") +
          '" data-img="' +
          img +
          '" type="button">' +
          '<img src="' +
          img +
          '" alt="View ' +
          (i + 1) +
          '"></button>',
      );
    });

    // rebuild sizes
    const $sizes = $("#pdp-sizes").empty();

    variant.sizes.forEach(function (s) {
      var oos = s.stock === 0;
      $sizes.append(
        '<button class="pdp-size' +
          (oos ? " is-oos" : "") +
          '" type="button" data-sku="' +
          s.sku +
          '" data-size="' +
          s.size +
          '" data-stock="' +
          s.stock +
          '"' +
          (oos ? " disabled" : "") +
          ">" +
          s.size +
          "</button>",
      );
    });
    $("#pdp-size-name").text("Select a size");
    $("#pdp-stock-note").text("").removeClass("is-low");
    $("#pdp-add-btn").prop("disabled", true).text("Select a Size");

    // keep the url shareable without a reload
    if (history.replaceState) {
      history.replaceState(
        null,
        "",
        "/products/" + PDP_DATA.slug + "?color=" + variant.colorSlug,
      );
    }
  });

  /* ---------------- sizes ---------------- */
  $("#pdp-sizes").on("click", ".pdp-size:not(:disabled)", function () {
    $("#pdp-sizes .pdp-size").removeClass("is-active");
    $(this).addClass("is-active");
    selectedSku = $(this).data("sku");
    $("#pdp-size-name").text($(this).data("size"));

    var stock = parseInt($(this).data("stock"), 10);
    var $note = $("#pdp-stock-note");
    if (stock <= 5) {
      $note
        .text("Only " + stock + " left in stock — order soon.")
        .addClass("is-low");
    } else {
      $note.text("In stock and ready to ship.").removeClass("is-low");
    }
    $("#pdp-add-btn").prop("disabled", false).text("Add to Cart");
  });

  /* ---------------- qty stepper ---------------- */
  function getQty() {
    const q = parseInt($("#pdp-qty").val(), 10);

    if (isNaN(q) || q < 1) q = 1;
    if (q > 10) q = 10;
    $("#pdp-qty").val(q);
    return q;
  }

  $("#qty-plus").on("click", function () {
    $("#pdp-qty").val(getQty() + 1 > 10 ? 10 : getQty() + 1);
  });

  $("#qty-minus").on("click", function () {
    $("#pdp-qty").val(getQty() - 1 < 1 ? 1 : getQty() - 1);
  });

  $("#pdp-qty").on("blur", getQty);

  /* ---------------- add to cart ---------------- */
  $("#pdp-add-btn").on("click", function () {
    if (!selectedSku) return;
    window.tnoAddToCart(selectedSku, getQty(), $(this));
  });

  /* ---------------- tabs ---------------- */
  $(".tab-header").on("click", function () {
    $(".tab-header").removeClass("is-active");
    $(this).addClass("is-active");
    $(".tab-panel").removeClass("is-active");
    $("#" + $(this).data("tab")).addClass("is-active");
  });

  /* ---------------- kids charity blurb ----------------
     could've just put this in product.ejs with the rest of the description,
     but figured this reads cleaner kept in JS. loads in after a beat so it
     doesn't get lost as part of the initial content flash. */
  if (PDP_DATA.dept === "kids") {
    setTimeout(function () {
      $("#tab-desc").append(
        "<p class='charity-message' style='display: none;'>For every kids&rsquo; item you purchase, True North Outfitters donates 40% of the sale to a network of local food banks and children&rsquo;s charities across Canada. Since 2019, this program has helped provide more than a quarter-million meals and warm winter clothing to families who need it most. We partner directly with community organizations in each region we serve, so the impact stays close to home. No middlemen, no overhead skimmed off the top &mdash; just kids&rsquo; clothes that do a little more good on their way to your cart. Thank you for shopping with us and helping make a real difference for families in your community.",
      );

      // reveal it once the tabs block has been scrolled past
      var $tabs = $(".pdp-tabs");
      var $msg = $(".charity-message");
      var revealed = false;

      $(window).on("scroll.charityReveal", function () {
        if (revealed) return;
        if ($tabs.length && $tabs[0].getBoundingClientRect().bottom < 0) {
          $msg.css("display", "block");
          revealed = true;
          $(window).off("scroll.charityReveal");
        }
      });
    });
  }
});
