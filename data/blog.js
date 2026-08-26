/**
 * blog.js - "Field Notes" blog content. Marketing wanted a blog for SEO;
 * this is the entire CMS for it (there isn't one - it's an array).
 *
 * Cover art is generated the same way product photography is (see
 * routes/media.js /blog/:slug.svg) since there's no real asset pipeline
 * in this demo environment.
 */

var COVER_COLORS = [
  "#2e4636", // forest
  "#a1502c", // rust
  "#3b4d78", // denim blue
  "#6b2635", // wine
  "#55565a", // slate
];

var RAW_POSTS = [
  {
    slug: "layering-for-fall",
    title: "How to Layer for Fall: A Field Guide",
    excerpt:
      "Base, mid, shell - the three-layer system explained, and how to mix pieces from different collections without overheating (or freezing).",
    category: "Guides",
    author: "Priya Kaur",
    daysAgo: 3,
    readMinutes: 6,
  },
  {
    slug: "caring-for-merino-wool",
    title: "Caring for Merino Wool (So It Lasts for Years)",
    excerpt:
      "Wash it less than you think, skip the dryer, and a few other habits that keep our knitwear looking new for winters to come.",
    category: "Care",
    author: "Dan Reyes",
    daysAgo: 9,
    readMinutes: 4,
  },
  {
    slug: "inside-selkirk-knitwear",
    title: "Meet the Makers: Inside Selkirk Knitwear's Mill",
    excerpt:
      "A trip to the small-batch mill in the Kootenays that's been knitting our sweaters since 2018, and why we're not moving production overseas.",
    category: "Our Brands",
    author: "Amelie Bouchard",
    daysAgo: 15,
    readMinutes: 8,
  },
  {
    slug: "denim-101-raw-vs-washed",
    title: "Denim 101: Raw vs. Washed, and What Actually Matters",
    excerpt:
      "Fades, shrinkage, break-in time - a plain-language guide to picking between raw and washed denim before you check out.",
    category: "Guides",
    author: "Sarah Mitchell",
    daysAgo: 24,
    readMinutes: 5,
  },
  {
    slug: "packing-for-a-long-weekend-up-north",
    title: "Packing for a Long Weekend Up North",
    excerpt:
      "One duffel, four days, wildly unpredictable weather. Here's what actually earned its spot in the bag on our last trip to Algonquin.",
    category: "Style",
    author: "Jordan Walsh",
    daysAgo: 31,
    readMinutes: 5,
  },
  {
    slug: "repair-over-replace",
    title: "Why We Still Believe in Repair Over Replace",
    excerpt:
      "Our in-store mending program, three years in: what it costs us, why we do it anyway, and how to send in a jacket for a patch.",
    category: "Sustainability",
    author: "Kevin Lam",
    daysAgo: 40,
    readMinutes: 7,
  },
];

var posts = RAW_POSTS.map(function (p, i) {
  return {
    id: i + 1,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    author: p.author,
    readMinutes: p.readMinutes,
    createdAt: Date.now() - p.daysAgo * 86400000,
    color: COVER_COLORS[i % COVER_COLORS.length],
    coverImage: "/media/blog/" + p.slug + ".svg",
  };
}).sort(function (a, b) {
  return b.createdAt - a.createdAt;
});

var postBySlug = {};
posts.forEach(function (p) {
  postBySlug[p.slug] = p;
});

module.exports = {
  posts: posts,
  postBySlug: postBySlug,
};
