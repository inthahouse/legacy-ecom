/* ============================================================================
   checkout.js - client-side validation + payment field formatting + shipping
   method switching. Server re-validates everything, this is just to save a
   round trip on typos.
   ============================================================================ */

$(function () {
  var $form = $('#checkout-form');
  if (!$form.length) return;

  /* ---------------- stock check on page load ----------------
     pull the full product list fresh as soon as checkout loads and walk
     every line in the bag against it. anything that's sold out gets
     dropped from the cart for real (not just hidden), then the page
     reloads so the totals/summary reflect what's actually left. the
     "heads up, X was removed" toast is stashed + replayed from main.js,
     since the reload can land on /cart instead if the bag empties out. */
  (function () {
    $.get('/api/products', function (allProducts) {
      var toRemove = [];

      $('.checkout-item').each(function () {
        var sku = $(this).data('sku');
        var title = $(this).find('.checkout-item-title').text();

        allProducts.forEach(function (product) {
          product.variants.forEach(function (variant) {
            variant.sizes.forEach(function (sizeEntry) {
              if (sizeEntry.sku === sku && sizeEntry.stock <= 0) {
                toRemove.push({ sku: sku, title: title });
              }
            });
          });
        });
      });

      if (!toRemove.length) return;

      var removed = 0;
      toRemove.forEach(function (item) {
        $.post('/cart/remove', { sku: item.sku }, function () {
          removed++;
          if (removed === toRemove.length) {
            try {
              sessionStorage.setItem(
                'tno_checkout_removed',
                JSON.stringify(toRemove.map(function (i) { return i.title; })),
              );
            } catch (e) {
              /* private mode */
            }
            window.location.reload();
          }
        });
      });
    });
  })();

  /* ---------------- shipping method -> refresh totals ---------------- */
  $('input[name=shippingMethod]').on('change', function () {
    var method = $(this).val();
    $.post('/api/shipping-method', { method: method }, function () {
      $.get('/api/cart/summary', { mode: 'checkout' }, function (html) {
        $('#cart-summary-wrap').html(html);
      });
    });
  });

  /* ---------------- card number: auto-space every 4 ---------------- */
  $('#co-ccnum').on('input', function () {
    var digits = $(this).val().replace(/\D/g, '').slice(0, 16);
    $(this).val(digits.replace(/(\d{4})(?=\d)/g, '$1 '));
  });

  /* ---------------- expiry: auto slash ---------------- */
  $('#co-ccexp').on('input', function () {
    var digits = $(this).val().replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      $(this).val(digits.slice(0, 2) + '/' + digits.slice(2));
    } else {
      $(this).val(digits);
    }
  });

  $('#co-cccvv').on('input', function () {
    $(this).val($(this).val().replace(/\D/g, '').slice(0, 4));
  });

  /* ---------------- validation ---------------- */
  function setError($field, msg) {
    $field.addClass('is-invalid');
    if (msg && !$field.next('.field-error').length) {
      $field.after('<p class="field-error">' + msg + '</p>');
    }
  }
  function clearErrors() {
    $form.find('.is-invalid').removeClass('is-invalid');
    $form.find('.field-error').remove();
  }

  $form.on('submit', function (e) {
    clearErrors();
    var bad = false;

    $form.find('input[required], select[required]').each(function () {
      if (!$.trim($(this).val())) {
        setError($(this), 'Required');
        bad = true;
      }
    });

    var email = $('#co-email').val();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError($('#co-email'), 'That doesn\'t look like an email address');
      bad = true;
    }

    var cc = $('#co-ccnum').val().replace(/\s/g, '');
    if (cc && !/^\d{15,16}$/.test(cc)) {
      setError($('#co-ccnum'), 'Card number should be 15–16 digits');
      bad = true;
    }
    var exp = $('#co-ccexp').val();
    if (exp && !/^\d{2}\/\d{2}$/.test(exp)) {
      setError($('#co-ccexp'), 'Use MM/YY');
      bad = true;
    }

    if (bad) {
      e.preventDefault();
      var $first = $form.find('.is-invalid').first();
      $('html, body').animate({ scrollTop: $first.offset().top - 160 }, 250);
      $first.focus();
      return false;
    }

    $('#place-order-btn').prop('disabled', true).text('Placing Order…');
  });
});
