/* ============================================================================
   home.js - homepage bits. Clearance countdown reads window.moment (loaded
   in head.ejs - that's the whole reason it's on the page).
   ============================================================================ */

$(function () {
  /* ---------------- clearance countdown ---------------- */
  var $promo = $(".promo-clearance");
  if ($promo.length) {
    // let the page finish loading first, then give it a beat before dropping
    // the timer in so it's not competing with everything else on load
    $(window).on("load", function () {
      setTimeout(function () {
        var deadline = moment().add(10, "days");
        var $timer = $(
          '<p class="clearance-timer">Hurry! Sale ends in <span class="clearance-timer-value"></span></p>',
        );
        $promo.find(".promo-banner-copy .btn-light").before($timer);
        var $value = $timer.find(".clearance-timer-value");

        function tick() {
          var remaining = moment.duration(deadline.diff(moment()));
          if (remaining.asSeconds() <= 0) {
            $value.text("0d 0h 0m 0s");
            clearInterval(intervalId);
            return;
          }
          $value.text(
            Math.floor(remaining.asDays()) +
              "d " +
              remaining.hours() +
              "h " +
              remaining.minutes() +
              "m " +
              remaining.seconds() +
              "s",
          );
        }

        tick();
        var intervalId = setInterval(tick, 1000);
      }, 4000);
    });
  }
});
