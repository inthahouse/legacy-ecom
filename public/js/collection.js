/* ============================================================================
   collection.js - layered nav / filters / sort / infinite scroll
   Filters submit over ajax and swap out #collection-results wholesale.
   The server renders the exact same partial either way, so no-JS still works
   (the Apply button is a real submit, and shows just the first batch).
   pushState keeps URLs shareable. Browsing itself is infinite scroll: a
   sentinel element at the bottom of the grid is watched with
   IntersectionObserver, and scrolling it into view fetches + appends the
   next batch of cards. Classic page-number pagination was pulled out into
   lib/pagination.js if this ever needs to go back.
   ============================================================================ */

$(function () {
  var $form = $('#filter-form');
  if (!$form.length) return;

  var $results = $('#collection-results');
  var baseUrl = $results.data('base-url');
  var pendingReq = null;

  /* ---------------- sale countdown ----------------
     "hurry, while it lasts" timer under the blurb on the Sale collection
     page. moment is loaded globally in head.ejs. */
  if (baseUrl === '/collections/sale') {
    var saleDeadline = moment().add(10, 'days');
    var $saleTimer = $(
      '<p class="sale-countdown">Hurry, while it lasts! Sale ends in <span class="sale-countdown-value"></span></p>'
    );
    $('.collection-blurb').after($saleTimer);
    var $saleTimerValue = $saleTimer.find('.sale-countdown-value');

    (function tickSaleTimer() {
      var remaining = moment.duration(saleDeadline.diff(moment()));
      if (remaining.asSeconds() <= 0) {
        $saleTimerValue.text('0d 0h 0m 0s');
        return;
      }
      $saleTimerValue.text(
        Math.floor(remaining.asDays()) + 'd ' +
        remaining.hours() + 'h ' +
        remaining.minutes() + 'm ' +
        remaining.seconds() + 's'
      );
      setTimeout(tickSaleTimer, 1000);
    })();
  }

  /* ---------------- price slider (jquery ui) ---------------- */
  var $slider = $('#price-slider');
  var sliderMin = parseInt($slider.data('min'), 10) || 0;
  var sliderMax = parseInt($slider.data('max'), 10) || 500;
  if (sliderMax <= sliderMin) sliderMax = sliderMin + 1; // degenerate collections

  $slider.slider({
    range: true,
    min: sliderMin,
    max: sliderMax,
    values: [
      parseInt($slider.data('cur-min'), 10) || sliderMin,
      parseInt($slider.data('cur-max'), 10) || sliderMax
    ],
    slide: function (event, ui) {
      $('#price-label-min').text('$' + ui.values[0]);
      $('#price-label-max').text('$' + ui.values[1]);
    },
    stop: function (event, ui) {
      // only send price params when the user actually narrowed the range
      $('#price-min-field').val(ui.values[0] > sliderMin ? ui.values[0] : '');
      $('#price-max-field').val(ui.values[1] < sliderMax ? ui.values[1] : '');
      applyFilters();
    }
  });

  /* ---------------- grid / list view toggle ----------------
     shared with the wishlist page - see tnoInitViewToggle in main.js. the
     class goes on #collection-results itself, which survives the ajax
     html() swap below, so it doesn't need to be reapplied on every filter -
     only the toolbar buttons (which DO get swapped) need re-syncing, hence
     re-calling the returned applyViewMode() after each fetch. */
  var applyViewMode = tnoInitViewToggle($results, 'tno_view');

  // the first batch (plus its sentinel, if there's more) is already server-
  // rendered into #collection-results on initial page load - hook it up
  // straight away rather than waiting for the first ajax swap.
  bindInfiniteScroll();

  /* ---------------- build query + fetch ---------------- */
  function buildQuery() {
    var params = $form.serializeArray().filter(function (p) { return p.value !== ''; });
    return $.param(params);
  }

  // filters/sort/chip changes: full re-render, always back at the first batch
  function applyFilters(skipPush) {
    var qs = buildQuery();
    var url = baseUrl + (qs ? '?' + qs : '');

    $results.addClass('results-loading');
    if (pendingReq) pendingReq.abort();

    pendingReq = $.get(url + (qs ? '&' : '?') + 'ajax=1', function (html) {
      $results.html(html).removeClass('results-loading');
      applyViewMode();
      bindInfiniteScroll();
      if (!skipPush && window.history && history.pushState) {
        history.pushState({ tnoFiltered: true }, '', url);
      }
      // keep the checkbox visual states in sync (labels carry the styling)
      $form.find('.color-filter').each(function () {
        $(this).toggleClass('is-checked', $(this).find('input').prop('checked'));
      });
      $form.find('.size-filter').each(function () {
        $(this).toggleClass('is-checked', $(this).find('input').prop('checked'));
      });
      var top = $('.results-toolbar').offset();
      if (top && window.scrollY > top.top - 140) {
        $('html, body').animate({ scrollTop: top.top - 140 }, 200);
      }
    }).fail(function (xhr, status) {
      if (status !== 'abort') {
        // ajax fell over - fall back to a boring full page load
        window.location.href = url;
      }
    });
  }

  /* ---------------- infinite scroll ----------------
     watches the sentinel element the server drops at the end of the grid
     (see partials/collection-results / collection-results-append). When it
     scrolls into view, fetch the next batch and append just the cards -
     the rest of the page (filters, already-loaded cards) stays untouched. */
  var scrollObserver = null;
  var loadingMore = false;

  function bindInfiniteScroll() {
    if (scrollObserver) scrollObserver.disconnect();
    var sentinel = $results.find('#infinite-scroll-sentinel')[0];
    if (!sentinel || !('IntersectionObserver' in window)) return;
    scrollObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) loadMoreResults();
    }, { rootMargin: '600px 0px' });
    scrollObserver.observe(sentinel);
  }

  function loadMoreResults() {
    if (loadingMore) return;
    var $sentinel = $results.find('#infinite-scroll-sentinel');
    var nextPage = parseInt($sentinel.data('next-page'), 10) || 2;
    loadingMore = true;
    $sentinel.addClass('is-loading');

    var params = $form.serializeArray().filter(function (p) { return p.value !== ''; });
    params.push({ name: 'page', value: nextPage });
    var url = baseUrl + '?' + $.param(params) + '&ajax=append';

    $.get(url, function (html) {
      var $html = $('<div>').html(html);
      $results.find('.product-grid').append($html.find('.infinite-scroll-batch').children());
      $sentinel.remove();
      $html.find('#infinite-scroll-sentinel, .infinite-scroll-end').insertAfter($results.find('.product-grid'));
      loadingMore = false;
      bindInfiniteScroll();
    }).fail(function () {
      loadingMore = false;
      $sentinel.removeClass('is-loading');
    });
  }

  /* ---------------- events ---------------- */
  $form.on('change', 'input[type=checkbox]', function () {
    applyFilters();
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    applyFilters();
    $('#filter-sidebar').removeClass('is-open');
    $('#drawer-overlay').removeClass('is-open');
  });

  // sort lives inside the ajax'd results, so delegate
  $results.on('change', '#sort-select', function () {
    $('#sort-field').val($(this).val());
    applyFilters();
  });

  // active filter chips (also inside results)
  $results.on('click', '.js-remove-filter', function () {
    var name = $(this).data('name');
    var value = String($(this).data('value'));
    if (name === 'price') {
      $('#price-min-field, #price-max-field').val('');
      $slider.slider('values', [sliderMin, sliderMax]);
      $('#price-label-min').text('$' + sliderMin);
      $('#price-label-max').text('$' + sliderMax);
    } else {
      $form.find('input[name="' + name + '"]').each(function () {
        if (String($(this).val()) === value) $(this).prop('checked', false);
      });
    }
    applyFilters();
  });

  $results.on('click', '#chips-clear-all', function () {
    clearAll();
  });

  $('#clear-filters').on('click', function (e) {
    e.preventDefault();
    clearAll();
  });

  function clearAll() {
    $form.find('input[type=checkbox]').prop('checked', false);
    $('#price-min-field, #price-max-field').val('');
    $('#sort-field').val('featured');
    $slider.slider('values', [sliderMin, sliderMax]);
    $('#price-label-min').text('$' + sliderMin);
    $('#price-label-max').text('$' + sliderMax);
    applyFilters();
  }

  /* collapsible filter groups */
  $('.filter-group-title').on('click', function () {
    $(this).closest('.filter-group').toggleClass('filter-group-open');
  });

  /* mobile filter drawer */
  $('#mobile-filter-btn').on('click', function () {
    $('#filter-sidebar').addClass('is-open');
    $('#drawer-overlay').addClass('is-open');
  });
  $('#filter-close').on('click', function () {
    $('#filter-sidebar').removeClass('is-open');
    $('#drawer-overlay').removeClass('is-open');
  });

  /* back button: just reload. state reconstruction from the url was
     attempted in 2020, produced ghost filters, was reverted. */
  window.onpopstate = function (e) {
    if (e.state && e.state.tnoFiltered || history.state === null) {
      window.location.reload();
    }
  };
});
