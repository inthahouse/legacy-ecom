// blog.js - homepage "From the Blog" row.
// pulls the latest posts from /api/blog/posts and builds the cards in JS,
// then drops the whole section in below the hero, above the dept tiles.
// not touching home.ejs for this - backend just needs to give us the data.

window.addEventListener("load", function () {
  // dept tiles section doesn't have a heading to match on like the carousels
  // do, so just grab it by the .dept-tiles grid inside it and walk up
  var deptTiles = document.querySelector(".dept-tiles");
  var deptTilesSection = deptTiles ? deptTiles.closest(".home-section") : null;

  if (!deptTilesSection) return; // probably not the homepage

  fetch("/api/blog/posts")
    .then(function (res) {
      return res.json();
    })
    .then(function (posts) {
      console.log("got blog posts", posts);
      // only showing a row of 3 on the homepage
      buildBlogSection(posts.slice(0, 3), deptTilesSection);
    })
    .catch(function (err) {
      console.log("couldn't load blog posts", err);
    });
});

function buildBlogSection(posts, deptTilesSection) {
  var cardsHtml = "";

  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    cardsHtml +=
      '<div class="blog-card">' +
      '<a class="blog-card-media" href="/blog/' +
      p.slug +
      '">' +
      '<img src="' +
      p.coverImage +
      '" alt="' +
      p.title +
      '" loading="lazy">' +
      '<span class="blog-card-category">' +
      p.category +
      "</span>" +
      "</a>" +
      '<div class="blog-card-body">' +
      '<a class="blog-card-title" href="/blog/' +
      p.slug +
      '">' +
      p.title +
      "</a>" +
      '<p class="blog-card-excerpt">' +
      p.excerpt +
      "</p>" +
      '<div class="blog-card-meta">' +
      p.author +
      " &middot; " +
      p.readMinutes +
      " min read</div>" +
      "</div>" +
      "</div>";
  }

  var sectionHtml =
    '<section class="home-section">' +
    '<div class="container">' +
    '<div class="section-head">' +
    '<h2 class="section-title">From the Blog</h2>' +
    '<a class="section-link" href="/blog">View All &rarr;</a>' +
    "</div>" +
    '<div class="blog-row">' +
    cardsHtml +
    "</div>" +
    "</div>" +
    "</section>";

  var wrap = document.createElement("div");
  wrap.innerHTML = sectionHtml;
  var blogSection = wrap.firstChild;

  // hero > usp strip > dept tiles in the markup, so inserting right before
  // dept tiles puts us right after the hero area
  deptTilesSection.parentNode.insertBefore(blogSection, deptTilesSection);
}
