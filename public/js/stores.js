/* ============================================================================
   stores.js - store finder. All stores come inlined as STORE_DATA and get
   filtered client side. The "map" is lat/lng projected into a div - the real
   Google Map went away with the 2018 API pricing change and honestly nobody
   missed it.
   ============================================================================ */

$(function () {
  if ($.type(STORE_DATA) === "undefined") return;

  var stores = STORE_DATA;
  var selectedId = null;
  var userLoc = null; // {lat, lng} after geolocate

  // list/table view toggle, remembered across visits
  function getStoredView() {
    try {
      return localStorage.getItem("tno_store_view") === "table"
        ? "table"
        : "list";
    } catch (e) {
      return "list"; // private mode
    }
  }
  function setStoredView(view) {
    try {
      localStorage.setItem("tno_store_view", view);
    } catch (e) {
      /* private mode */
    }
  }
  var viewMode = getStoredView();
  $(".js-store-view").each(function () {
    var isActive = $(this).data("view") === viewMode;
    $(this)
      .toggleClass("is-active", isActive)
      .attr("aria-pressed", String(isActive));
  });

  // projection bounds for the fake map (rough north america window)
  var LAT_MIN = 24,
    LAT_MAX = 57,
    LNG_MIN = -128,
    LNG_MAX = -50;

  function project(lat, lng) {
    var x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
    var y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
    return { x: Math.max(1, Math.min(99, x)), y: Math.max(2, Math.min(97, y)) };
  }

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = ((b.lat - a.lat) * Math.PI) / 180;
    var dLng = ((b.lng - a.lng) * Math.PI) / 180;
    var s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function currentFilter() {
    var q = $.trim($("#store-search").val()).toLowerCase();
    var country = $("#store-country").val();
    var region = $("#store-region").val();

    var list = stores.filter(function (s) {
      if (country && s.country !== country) return false;
      if (region && s.region !== region) return false;
      if (q) {
        var hay = (
          s.name +
          " " +
          s.city +
          " " +
          s.regionName +
          " " +
          s.postal +
          " " +
          s.address
        ).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (userLoc) {
      list.forEach(function (s) {
        s._dist = haversineKm(userLoc, s);
      });
      list.sort(function (a, b) {
        return a._dist - b._dist;
      });
    } else {
      list.forEach(function (s) {
        delete s._dist;
      });
      list.sort(function (a, b) {
        return a.country < b.country
          ? -1
          : a.country > b.country
            ? 1
            : a.city < b.city
              ? -1
              : a.city > b.city
                ? 1
                : 0;
      });
    }
    return list;
  }

  function renderList(list, $out) {
    $.each(list, function (i, s) {
      var $item = $(
        '<div class="store-item' +
          (s.id === selectedId ? " is-selected" : "") +
          '" data-id="' +
          s.id +
          '">' +
          (s.isFlagship ? '<div class="store-flag">Flagship</div>' : "") +
          "<h3>" +
          s.name +
          "</h3>" +
          "<p>" +
          s.address +
          ", " +
          s.city +
          ", " +
          s.region +
          " " +
          s.postal +
          "</p>" +
          "<p>" +
          s.phone +
          " · Mon–Fri " +
          s.hours["Mon-Fri"] +
          "</p>" +
          (s._dist !== undefined
            ? '<p class="store-dist">' + s._dist.toFixed(0) + " km away</p>"
            : "") +
          '<div class="store-links"><a href="/stores/' +
          s.id +
          '">Store details</a>' +
          '<a href="#" class="js-pin-focus">Show on map</a></div>' +
          "</div>",
      );
      $out.append($item);
    });
  }

  function renderTable(list, $out) {
    var showDist = !!userLoc;
    var $table = $(
      '<table class="stores-table"><thead><tr>' +
        "<th>Store</th><th>Address</th><th>Phone</th><th>Hours (Mon–Fri)</th>" +
        (showDist ? "<th>Distance</th>" : "") +
        "<th></th>" +
        "</tr></thead><tbody></tbody></table>",
    );
    var $tbody = $table.find("tbody");

    $.each(list, function (i, s) {
      var $row = $(
        '<tr class="store-row' +
          (s.id === selectedId ? " is-selected" : "") +
          '" data-id="' +
          s.id +
          '">' +
          "<td>" +
          (s.isFlagship ? '<span class="store-flag">Flagship</span>' : "") +
          s.name +
          "</td>" +
          "<td>" +
          s.address +
          ", " +
          s.city +
          ", " +
          s.region +
          " " +
          s.postal +
          "</td>" +
          "<td>" +
          s.phone +
          "</td>" +
          "<td>" +
          s.hours["Mon-Fri"] +
          "</td>" +
          (showDist
            ? '<td class="store-dist">' + s._dist.toFixed(0) + " km</td>"
            : "") +
          '<td><div class="store-links"><a href="/stores/' +
          s.id +
          '">Details</a>' +
          '<a href="#" class="js-pin-focus">Map</a></div></td>' +
          "</tr>",
      );
      $tbody.append($row);
    });

    $out.append($('<div class="stores-table-wrap"></div>').append($table));
  }

  function render() {
    var list = currentFilter();
    var $out = $("#stores-list").empty();
    var $pins = $("#map-pins").empty();

    $("#stores-result-count").text(
      list.length + " store" + (list.length === 1 ? "" : "s") + " found",
    );

    if (!list.length) {
      $out.append(
        '<div class="empty-state"><p>No stores match. Try widening your search.</p></div>',
      );
    } else if (viewMode === "table") {
      renderTable(list, $out);
    } else {
      renderList(list, $out);
    }

    $.each(list, function (i, s) {
      var pt = project(s.lat, s.lng);
      var $pin = $(
        '<div class="map-pin' +
          (s.id === selectedId ? " is-selected" : "") +
          '" data-id="' +
          s.id +
          '" title="' +
          s.name +
          '"></div>',
      ).css({ left: pt.x + "%", top: pt.y + "%" });
      $pins.append($pin);
    });
  }

  function select(id, scrollList) {
    selectedId = id;
    $(".store-item, .store-row").removeClass("is-selected");
    $(".map-pin").removeClass("is-selected");
    $(
      ".store-item[data-id=" + id + "], .store-row[data-id=" + id + "]",
    ).addClass("is-selected");
    $(".map-pin[data-id=" + id + "]").addClass("is-selected");

    var s = null;
    $.each(stores, function (i, st) {
      if (st.id === id) s = st;
    });
    if (s) {
      $("#map-selected")
        .addClass("is-visible")
        .html(
          "<strong>" +
            s.name +
            "</strong><br>" +
            s.address +
            ", " +
            s.city +
            ", " +
            s.region +
            "<br>" +
            s.phone +
            ' &middot; <a href="/stores/' +
            s.id +
            '">Details &rarr;</a>',
        );
    }
    if (scrollList) {
      var $item = $(
        ".store-item[data-id=" + id + "], .store-row[data-id=" + id + "]",
      );
      if ($item.length) {
        $(".stores-list").animate(
          {
            scrollTop:
              $(".stores-list").scrollTop() + $item.position().top - 10,
          },
          250,
        );
      }
    }
  }

  /* ---------------- events ---------------- */
  var searchTimer;
  $("#store-search").on("keyup", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 200);
  });

  $("#store-country").on("change", function () {
    var c = $(this).val();
    // narrow the region dropdown to the chosen country
    $("#store-region option").each(function () {
      var oc = $(this).data("country");
      if (!oc) return;
      $(this).toggle(!c || oc === c);
    });
    if (
      c &&
      $("#store-region option:selected").data("country") &&
      $("#store-region option:selected").data("country") !== c
    ) {
      $("#store-region").val("");
    }
    render();
  });

  $("#store-region").on("change", render);

  $(document).on("click", ".store-item, .store-row", function (e) {
    if ($(e.target).is("a") && !$(e.target).hasClass("js-pin-focus")) return;
    if ($(e.target).hasClass("js-pin-focus")) e.preventDefault();
    select($(this).data("id"), false);
  });

  $(document).on("click", ".map-pin", function () {
    select($(this).data("id"), true);
  });

  $(".js-store-view").on("click", function () {
    var view = $(this).data("view");
    if (view === viewMode) return;
    viewMode = view;
    setStoredView(view);
    $(".js-store-view").removeClass("is-active").attr("aria-pressed", "false");
    $(this).addClass("is-active").attr("aria-pressed", "true");
    render();
  });

  $("#store-geolocate").on("click", function () {
    var $btn = $(this);
    if (!navigator.geolocation) {
      alert("Geolocation is not available in this browser.");
      return;
    }
    $btn.prop("disabled", true).text("Locating…");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        $btn.prop("disabled", false).text("Sorted by Distance ✓");
        render();
      },
      function () {
        $btn.prop("disabled", false).text("Use My Location");
        alert("Could not get your location. You can still search by city.");
      },
      { timeout: 8000 },
    );
  });

  render();
});
