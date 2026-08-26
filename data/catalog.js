/**
 * catalog.js
 * ============================================================
 * In-memory product catalog. Everything gets generated at boot
 * from a seeded RNG so the data is stable across restarts.
 *
 * This used to come out of a nightly CSV drop from the ERP
 * (see old importer in scripts/import_catalog.php in the SVN
 * repo). When we moved to node we just baked the generator in.
 *
 * DO NOT change the seed, QA has bookmarked product URLs.
 * ============================================================
 */

var util = require("../lib/util");
var slugify = util.slugify;

var rng = util.makeRng(20180417); // launch day of the v2 site

// ------------------------------------------------------------------
// Brands
// ------------------------------------------------------------------
const BRANDS = [
  "Aspen Ridge",
  "Banff & Field",
  "Cedar + Pine",
  "Drift North",
  "Eastport",
  "Fjordline",
  "Great Plains Denim",
  "Harbourview",
  "Ironwood Supply",
  "Juniper Lane",
  "Kootenay Works",
  "Lakeshore Standard",
  "Meridian Wool Co.",
  "Nordhavn",
  "Onyx Athletics",
  "Prairie Rose",
  "Quill & Canvas",
  "Rockcliffe",
  "Selkirk Knitwear",
  "Tundra Basics",
];

// 2026 catalog expansion - new brands added for the assortment growth.
// Pushed into BRANDS further down, after the original launch-day styles
// are generated, so none of the existing product data shifts.
var NEW_BRANDS = [
  "Alderwood Trading Co.",
  "Birchcliff Supply",
  "Cordova Mills",
  "Driftwood & Sage",
  "Elkhorn Standard",
  "Foxglove Knitwear",
  "Granite Bay Co.",
  "Hollow Creek",
];

// ------------------------------------------------------------------
// Colors  (name, slug, hex, family) - family is what filters use
// ------------------------------------------------------------------
var COLORS = [
  { name: "Black", hex: "#1c1c1e", family: "black" },
  { name: "Washed Black", hex: "#3a3a3c", family: "black" },
  { name: "White", hex: "#f4f2ec", family: "white" },
  { name: "Ivory", hex: "#ece5d3", family: "white" },
  { name: "Heather Grey", hex: "#9d9da1", family: "grey" },
  { name: "Charcoal", hex: "#55565a", family: "grey" },
  { name: "Navy", hex: "#22304d", family: "blue" },
  { name: "Indigo", hex: "#3b4d78", family: "blue" },
  { name: "Chambray Blue", hex: "#7d9bb8", family: "blue" },
  { name: "Forest", hex: "#2e4636", family: "green" },
  { name: "Sage", hex: "#9aa88f", family: "green" },
  { name: "Olive", hex: "#6b6b45", family: "green" },
  { name: "Rust", hex: "#a1502c", family: "orange" },
  { name: "Terracotta", hex: "#c07352", family: "orange" },
  { name: "Burgundy", hex: "#6b2635", family: "red" },
  { name: "Cherry Red", hex: "#a62639", family: "red" },
  { name: "Dusty Rose", hex: "#c99ba0", family: "pink" },
  { name: "Blush", hex: "#e3c5c0", family: "pink" },
  { name: "Camel", hex: "#b08d57", family: "brown" },
  { name: "Chocolate", hex: "#4e342e", family: "brown" },
  { name: "Sand", hex: "#d7c9a7", family: "beige" },
  { name: "Oatmeal", hex: "#cfc4ae", family: "beige" },
  { name: "Mustard", hex: "#c9962e", family: "yellow" },
  { name: "Lavender", hex: "#a99ac2", family: "purple" },
];
COLORS.forEach(function (c) {
  c.slug = slugify(c.name);
});

// 2026 catalog expansion - new colors, including a new "teal" family.
// Pushed into COLORS further down, after the original launch-day styles
// are generated (COLORS.length feeds the variant-shuffle RNG draw, so
// growing it earlier would shift every style generated after it).
var NEW_COLORS = [
  { name: "Teal", hex: "#2f6b64", family: "teal" },
  { name: "Deep Teal", hex: "#1f4a45", family: "teal" },
  { name: "Seafoam", hex: "#8fb8a8", family: "teal" },
  { name: "Cobalt", hex: "#2a4d8f", family: "blue" },
  { name: "Copper", hex: "#b5651d", family: "orange" },
  { name: "Marigold", hex: "#e0a527", family: "yellow" },
  { name: "Plum", hex: "#5b3350", family: "purple" },
  { name: "Stone", hex: "#a8a196", family: "beige" },
];
NEW_COLORS.forEach(function (c) {
  c.slug = slugify(c.name);
});

var COLOR_FAMILIES = [
  { slug: "black", name: "Black", hex: "#1c1c1e" },
  { slug: "white", name: "White", hex: "#f4f2ec" },
  { slug: "grey", name: "Grey", hex: "#9d9da1" },
  { slug: "blue", name: "Blue", hex: "#22304d" },
  { slug: "green", name: "Green", hex: "#2e4636" },
  { slug: "orange", name: "Orange", hex: "#a1502c" },
  { slug: "red", name: "Red", hex: "#a62639" },
  { slug: "pink", name: "Pink", hex: "#c99ba0" },
  { slug: "brown", name: "Brown", hex: "#4e342e" },
  { slug: "beige", name: "Beige", hex: "#d7c9a7" },
  { slug: "yellow", name: "Yellow", hex: "#c9962e" },
  { slug: "purple", name: "Purple", hex: "#a99ac2" },
];

var NEW_COLOR_FAMILIES = [{ slug: "teal", name: "Teal", hex: "#2f6b64" }];

// ------------------------------------------------------------------
// Size runs
// ------------------------------------------------------------------
var SIZE_RUNS = {
  apparel: ["XS", "S", "M", "L", "XL", "XXL"],
  waist: ["28", "30", "32", "34", "36", "38", "40"],
  kids: ["4", "5-6", "7-8", "10-12", "14"],
  oneSize: ["O/S"],
};

// ------------------------------------------------------------------
// Category definitions.
// depts: which departments carry it. svg: silhouette drawn by the
// media route. weight: roughly how many styles get generated.
// ------------------------------------------------------------------
var CATEGORIES = [
  {
    slug: "tees-tops",
    name: "T-Shirts & Tops",
    depts: ["women", "men", "kids"],
    price: [2400, 5800],
    sizes: "apparel",
    svg: "tee",
    weight: 14,
    adjectives: [
      "Classic",
      "Essential",
      "Garment-Dyed",
      "Organic Cotton",
      "Slub",
      "Heavyweight",
      "Boxy",
      "Relaxed",
      "Vintage Wash",
      "Ringspun",
      "Pima",
      "Everyday",
    ],
    nouns: [
      "Crew Tee",
      "V-Neck Tee",
      "Pocket Tee",
      "Long Sleeve Tee",
      "Henley",
      "Tank",
      "Baseball Tee",
      "Graphic Tee",
      "Boxy Tee",
      "Striped Tee",
    ],
  },
  {
    slug: "shirts",
    name: "Shirts & Blouses",
    depts: ["women", "men"],
    price: [4800, 9800],
    sizes: "apparel",
    svg: "shirt",
    weight: 10,
    adjectives: [
      "Classic",
      "Brushed",
      "Washed",
      "Slim-Fit",
      "Relaxed",
      "Heritage",
      "Double-Weave",
      "Garment-Dyed",
      "Lightweight",
      "Stretch",
    ],
    nouns: [
      "Oxford Shirt",
      "Flannel Shirt",
      "Linen Shirt",
      "Chambray Shirt",
      "Poplin Shirt",
      "Utility Shirt",
      "Camp Collar Shirt",
      "Denim Shirt",
      "Corduroy Shirt",
      "Twill Overshirt",
    ],
  },
  {
    slug: "sweaters-knits",
    name: "Sweaters & Knits",
    depts: ["women", "men", "kids"],
    price: [5800, 14800],
    sizes: "apparel",
    svg: "sweater",
    weight: 10,
    adjectives: [
      "Merino",
      "Lambswool",
      "Cable-Knit",
      "Waffle-Knit",
      "Ribbed",
      "Chunky",
      "Fine-Gauge",
      "Brushed",
      "Marled",
      "Cotton-Blend",
    ],
    nouns: [
      "Crewneck Sweater",
      "Turtleneck",
      "Cardigan",
      "Quarter-Zip Sweater",
      "V-Neck Sweater",
      "Sweater Vest",
      "Mock Neck Knit",
      "Roll Neck Sweater",
      "Shawl Cardigan",
    ],
  },
  {
    slug: "hoodies-sweatshirts",
    name: "Hoodies & Sweatshirts",
    depts: ["women", "men", "kids"],
    price: [4800, 11000],
    sizes: "apparel",
    svg: "hoodie",
    weight: 9,
    adjectives: [
      "Heavyweight",
      "French Terry",
      "Fleece-Back",
      "Garment-Dyed",
      "Relaxed",
      "Oversized",
      "Vintage Wash",
      "Loopback",
      "Brushed",
    ],
    nouns: [
      "Pullover Hoodie",
      "Zip Hoodie",
      "Crewneck Sweatshirt",
      "Quarter-Zip Sweatshirt",
      "Popover Hoodie",
      "Raglan Sweatshirt",
    ],
  },
  {
    slug: "jackets-coats",
    name: "Jackets & Coats",
    depts: ["women", "men", "kids"],
    price: [9800, 29800],
    sizes: "apparel",
    svg: "jacket",
    weight: 9,
    adjectives: [
      "Quilted",
      "Waxed",
      "Sherpa-Lined",
      "Water-Resistant",
      "Insulated",
      "Recycled Down",
      "Wool-Blend",
      "Heritage",
      "Packable",
      "Stretch",
    ],
    nouns: [
      "Field Jacket",
      "Trucker Jacket",
      "Puffer Jacket",
      "Parka",
      "Chore Coat",
      "Bomber Jacket",
      "Rain Shell",
      "Overcoat",
      "Liner Jacket",
      "Anorak",
    ],
  },
  {
    slug: "pants-trousers",
    name: "Pants & Trousers",
    depts: ["women", "men"],
    price: [5800, 12800],
    sizes: "waist",
    svg: "pants",
    weight: 9,
    adjectives: [
      "Slim",
      "Straight-Leg",
      "Wide-Leg",
      "Tapered",
      "Relaxed",
      "Pleated",
      "Stretch",
      "Garment-Dyed",
      "Brushed Twill",
      "Cropped",
    ],
    nouns: [
      "Chino",
      "Work Pant",
      "Trouser",
      "Cargo Pant",
      "Corduroy Pant",
      "Drawstring Pant",
      "Utility Pant",
      "Five-Pocket Pant",
    ],
  },
  {
    slug: "jeans-denim",
    name: "Jeans & Denim",
    depts: ["women", "men", "kids"],
    price: [6800, 14800],
    sizes: "waist",
    svg: "pants",
    weight: 8,
    adjectives: [
      "High-Rise",
      "Mid-Rise",
      "Slim",
      "Straight",
      "Relaxed",
      "Tapered",
      "Vintage Wash",
      "Rigid",
      "Stretch",
      "Selvedge",
    ],
    nouns: [
      "Skinny Jean",
      "Straight Jean",
      "Bootcut Jean",
      "Wide-Leg Jean",
      "Tapered Jean",
      "Relaxed Jean",
      "Slim Jean",
    ],
  },
  {
    slug: "shorts",
    name: "Shorts",
    depts: ["women", "men", "kids"],
    price: [3400, 7800],
    sizes: "waist",
    svg: "shorts",
    weight: 6,
    adjectives: [
      "Classic",
      "Stretch",
      "Garment-Dyed",
      "Lightweight",
      "Quick-Dry",
      "Relaxed",
      "Pleated",
      "Washed",
    ],
    nouns: [
      "Chino Short",
      "Denim Short",
      "Cargo Short",
      "Sweat Short",
      "Swim Trunk",
      "Linen Short",
      "Utility Short",
    ],
  },
  {
    slug: "dresses",
    name: "Dresses",
    depts: ["women"],
    price: [6800, 16800],
    sizes: "apparel",
    svg: "dress",
    weight: 8,
    adjectives: [
      "Smocked",
      "Tiered",
      "Wrap",
      "Ruffled",
      "Linen-Blend",
      "Floral",
      "Sleeveless",
      "Puff-Sleeve",
      "Belted",
      "Pleated",
    ],
    nouns: [
      "Midi Dress",
      "Maxi Dress",
      "Shirt Dress",
      "Slip Dress",
      "Mini Dress",
      "Sweater Dress",
      "Sun Dress",
      "Wrap Dress",
    ],
  },
  {
    slug: "skirts",
    name: "Skirts",
    depts: ["women"],
    price: [4800, 10800],
    sizes: "apparel",
    svg: "skirt",
    weight: 4,
    adjectives: [
      "Pleated",
      "A-Line",
      "Wrap",
      "Denim",
      "Satin",
      "Ribbed",
      "Tiered",
      "Corduroy",
    ],
    nouns: [
      "Midi Skirt",
      "Mini Skirt",
      "Maxi Skirt",
      "Pencil Skirt",
      "Slip Skirt",
    ],
  },
  {
    slug: "activewear",
    name: "Activewear",
    depts: ["women", "men"],
    price: [3200, 9800],
    sizes: "apparel",
    svg: "tee",
    weight: 8,
    adjectives: [
      "Seamless",
      "Performance",
      "Quick-Dry",
      "Compression",
      "Breathable",
      "Four-Way Stretch",
      "Lightweight",
      "Thermal",
    ],
    nouns: [
      "Training Tee",
      "Running Tank",
      "Legging",
      "Jogger",
      "Track Jacket",
      "Sports Bra",
      "Training Short",
      "Base Layer Top",
    ],
  },
  {
    slug: "accessories",
    name: "Accessories",
    depts: ["women", "men", "kids"],
    price: [1800, 8800],
    sizes: "oneSize",
    svg: "accessory",
    weight: 7,
    adjectives: [
      "Ribbed",
      "Wool",
      "Waxed Canvas",
      "Leather",
      "Recycled",
      "Merino",
      "Classic",
      "Heritage",
      "Chunky",
    ],
    nouns: [
      "Beanie",
      "Ball Cap",
      "Scarf",
      "Tote Bag",
      "Belt",
      "Crew Sock 3-Pack",
      "Gloves",
      "Bucket Hat",
      "Crossbody Bag",
      "Wallet",
    ],
  },
];

// 2026 catalog expansion - new categories. Pushed into CATEGORIES further
// down, after the original launch-day styles are generated, so category
// weighting for the existing styles doesn't shift. svg reuses an existing
// media.js silhouette (no new artwork needed for the demo).
var NEW_CATEGORIES = [
  {
    slug: "loungewear-sleepwear",
    name: "Loungewear & Sleepwear",
    depts: ["women", "men", "kids"],
    price: [3200, 8800],
    sizes: "apparel",
    svg: "sweater",
    weight: 6,
    adjectives: [
      "Brushed",
      "Waffle-Knit",
      "Fleece-Lined",
      "Ultra-Soft",
      "Relaxed",
      "Modal-Blend",
      "Ribbed",
      "Heavyweight",
      "Everyday",
      "Lightweight",
    ],
    nouns: [
      "Jogger Set",
      "Sleep Short",
      "Lounge Pant",
      "Robe",
      "Pajama Top",
      "Lounge Hoodie",
      "Sleep Tee",
      "Henley Pajama Set",
      "Lounge Jumpsuit",
    ],
  },
  {
    slug: "swimwear",
    name: "Swimwear",
    depts: ["women", "men"],
    price: [3400, 8200],
    sizes: "apparel",
    svg: "shorts",
    weight: 5,
    adjectives: [
      "Quick-Dry",
      "UPF 50+",
      "Chlorine-Resistant",
      "Recycled Nylon",
      "High-Waisted",
      "Classic",
      "Lightweight",
      "Board-Style",
    ],
    nouns: [
      "Swim Trunk",
      "Board Short",
      "One-Piece Swimsuit",
      "Bikini Top",
      "Bikini Bottom",
      "Rash Guard",
      "Swim Short",
      "Cover-Up",
    ],
  },
  {
    slug: "underwear-basics",
    name: "Underwear & Basics",
    depts: ["women", "men", "kids"],
    price: [1800, 4800],
    sizes: "apparel",
    svg: "tee",
    weight: 5,
    adjectives: [
      "Seamless",
      "Ribbed",
      "Cotton-Stretch",
      "Modal",
      "Breathable",
      "Everyday",
      "Soft-Washed",
      "Second-Skin",
    ],
    nouns: [
      "Boxer Brief 3-Pack",
      "Bralette",
      "Brief 3-Pack",
      "Thermal Top",
      "Thermal Bottom",
      "Camisole",
      "Boy Short",
      "Undershirt 2-Pack",
    ],
  },
];

var DEPTS = [
  { slug: "women", name: "Women" },
  { slug: "men", name: "Men" },
  { slug: "kids", name: "Kids" },
];

// dept share of styles per category weight
var DEPT_WEIGHT = { women: 0.44, men: 0.4, kids: 0.16 };

var FABRICS = [
  "100% organic cotton",
  "100% ringspun cotton",
  "cotton/poly blend (60/40)",
  "100% merino wool",
  "linen/cotton blend",
  "recycled polyester",
  "98% cotton, 2% elastane",
  "brushed cotton twill",
  "french terry (100% cotton)",
  "100% lambswool",
  "TENCEL(TM) lyocell",
  "waxed organic canvas",
];

var FIT_NOTES = [
  "Runs true to size. Model is wearing a size M.",
  "Relaxed through the body. Size down for a closer fit.",
  "Slim fit. Size up if you are between sizes.",
  "True to size with a slightly cropped length.",
  "Generous fit through the chest and shoulders.",
];

var CARE = [
  "Machine wash cold with like colours. Tumble dry low.",
  "Machine wash cold. Lay flat to dry.",
  "Hand wash cold. Do not tumble dry.",
  "Dry clean recommended.",
  "Machine wash cold, gentle cycle. Warm iron if needed.",
];

var DESC_OPENERS = [
  "A wardrobe staple, reimagined.",
  "Built for everyday wear and made to last.",
  "The one you will reach for on repeat.",
  "Cut from premium fabric with an easy, lived-in feel.",
  "Designed in Canada, made responsibly.",
  "An easy layer for shoulder-season weather.",
  "Your new go-to, from the studio to the street.",
];

var DESC_MIDDLES = [
  "Finished with clean seams and a garment wash for softness right out of the box.",
  "Features reinforced stitching at stress points and a tagless collar.",
  "Pre-shrunk and enzyme washed so the fit stays put wash after wash.",
  "Details include natural corozo buttons and a single chest pocket.",
  "Made in a WRAP-certified facility with low-impact dyes.",
  "Fabric is milled in Portugal and cut-and-sewn in small batches.",
];

// 2026 catalog expansion - more fabrics + description variety. Pushed into
// the pools above further down, after the original launch-day styles are
// generated, so the copy on existing products doesn't change underneath QA.
var NEW_FABRICS = [
  "recycled nylon/spandex (78/22)",
  "modal/cotton blend",
  "brushed cotton fleece",
  "cotton spandex jersey (95/5)",
];

var NEW_DESC_OPENERS = [
  "Made for the in-between days — not quite one season, not quite the next.",
  "A quiet upgrade to something you already reach for.",
  "Simple in the right ways, considered in the ones that matter.",
  "Built by people who actually wear this stuff.",
  "Stocked because customers kept asking for it.",
  "Small-batch this season, back by popular demand.",
];

var NEW_DESC_MIDDLES = [
  "Cut from a fabric that gets softer with every wash, not thinner.",
  "Tested through three seasons of wear before it ever hit the floor.",
  "Sewn with a flat-felled seam so nothing rubs or chafes.",
  "Comes finished with a woven brand label, not a printed one.",
  "Trims and hardware are matched to the colourway, not an afterthought.",
  "Sample-checked twice — the fit shouldn't surprise you.",
];

// ------------------------------------------------------------------
// generator
// ------------------------------------------------------------------
var products = [];
var productById = {};
var productBySlug = {};
var skuIndex = {}; // sku -> { product, variant, sizeEntry }
var nextId = 1000;
var styleSeq = 10000;

var TOTAL_STYLES = 640; // ends up well north of 4k size-level SKUs

var totalSkus = 0;
var totalColorways = 0;

function genDescription(cat, adjective, noun) {
  return (
    rng.pick(DESC_OPENERS) +
    " The " +
    adjective +
    " " +
    noun +
    " " +
    rng.pick(DESC_MIDDLES)
  );
}

function buildStyle(cat, dept) {
  var adjective = rng.pick(cat.adjectives);
  var noun = rng.pick(cat.nouns);
  var brand = rng.pick(BRANDS);
  var title = adjective + " " + noun;
  var styleCode = "TN-" + styleSeq++;
  var id = nextId++;
  var slug = slugify(title) + "-" + styleCode.toLowerCase();

  var priceBase = rng.int(cat.price[0] / 100, cat.price[1] / 100) * 100;
  // legacy pricing rule: everything ends in .50 or .00... actually marketing
  // wanted .99 in 2020 for select items, hence this mess
  if (rng.chance(0.35)) priceBase = priceBase - 1; // x.99

  var onSale = rng.chance(0.22);
  var compareAt = null;
  var price = priceBase;
  if (onSale) {
    compareAt = priceBase;
    var pct = rng.pick([0.15, 0.2, 0.25, 0.3, 0.4, 0.5]);
    price = Math.round((priceBase * (1 - pct)) / 100) * 100 - 1; // ends .99
  }

  var isNew = rng.chance(0.18);
  var bestSeller = rng.chance(0.12);

  // created date sometime in last 2 years, new arrivals more recent
  var daysAgo = isNew ? rng.int(3, 45) : rng.int(46, 730);
  var createdAt = Date.now() - daysAgo * 86400000;

  var numColors = rng.int(1, 5);
  var colorPool = rng.shuffle(COLORS).slice(0, numColors);
  var sizeRun = SIZE_RUNS[cat.sizes];

  var variants = [];
  colorPool.forEach(function (color) {
    var colorCode =
      color.name.replace(/[^A-Z]/g, "").slice(0, 3) ||
      color.name.slice(0, 3).toUpperCase();
    var sizes = [];
    sizeRun.forEach(function (sz) {
      var stock = rng.chance(0.08) ? 0 : rng.int(1, 42); // ~8% of skus oos
      sizes.push({
        size: sz,
        sku: styleCode + "-" + colorCode + "-" + String(sz).replace("/", ""),
        stock: stock,
      });
      totalSkus++;
    });
    totalColorways++;
    variants.push({
      colorName: color.name,
      colorSlug: color.slug,
      colorFamily: color.family,
      hex: color.hex,
      sizes: sizes,
      images: [
        "/media/catalog/" + id + "/" + color.slug + "/front.svg",
        "/media/catalog/" + id + "/" + color.slug + "/back.svg",
        "/media/catalog/" + id + "/" + color.slug + "/detail.svg",
      ],
    });
  });

  var ratingCount = rng.chance(0.85) ? rng.int(0, 320) : 0;
  var rating = ratingCount > 0 ? rng.int(60, 100) / 20 : 0; // 3.0 - 5.0

  var p = {
    id: id,
    styleCode: styleCode,
    title: title,
    slug: slug,
    brand: brand,
    brandSlug: slugify(brand),
    dept: dept,
    category: cat.slug,
    categoryName: cat.name,
    svgType: cat.svg,
    price: price,
    compareAt: compareAt,
    onSale: onSale,
    isNew: isNew,
    bestSeller: bestSeller,
    rating: rating,
    ratingCount: ratingCount,
    fabric: rng.pick(FABRICS),
    fit: rng.pick(FIT_NOTES),
    care: rng.pick(CARE),
    description: genDescription(cat, adjective, noun),
    variants: variants,
    createdAt: createdAt,
    // popularity score used by "featured" sort; loosely based on old GA export
    popularity: rng.int(1, 1000) + (bestSeller ? 800 : 0),
  };

  products.push(p);
  productById[id] = p;
  productBySlug[slug] = p;
  variants.forEach(function (v) {
    v.sizes.forEach(function (s) {
      skuIndex[s.sku] = { product: p, variant: v, sizeEntry: s };
    });
  });
}

function generateStyles(categoriesList, totalStyles) {
  var totalWeight = 0;
  categoriesList.forEach(function (c) {
    totalWeight += c.weight;
  });

  categoriesList.forEach(function (cat) {
    var stylesForCat = Math.round((cat.weight / totalWeight) * totalStyles);
    for (var i = 0; i < stylesForCat; i++) {
      // pick dept respecting category availability
      var dept;
      do {
        var r = rng.rand();
        dept =
          r < DEPT_WEIGHT.women
            ? "women"
            : r < DEPT_WEIGHT.women + DEPT_WEIGHT.men
              ? "men"
              : "kids";
      } while (cat.depts.indexOf(dept) === -1);
      buildStyle(cat, dept);
    }
  });
}

// pass 1: the original launch-day catalogue, byte-for-byte. Same CATEGORIES
// snapshot and TOTAL_STYLES as always, so every existing style keeps its
// id/slug/SKUs/brand/description - QA has bookmarked product URLs.
generateStyles(CATEGORIES, TOTAL_STYLES);

// ------------------------------------------------------------------
// 2026 catalog expansion. Everything above this line reproduces the
// original catalogue exactly. From here we merge in the new brands,
// colors, categories and description copy, then run a second
// generation pass appended on top - existing product data is untouched
// since it was already built and pushed into `products` above.
// ------------------------------------------------------------------
NEW_BRANDS.forEach(function (b) {
  BRANDS.push(b);
});
BRANDS.sort();

NEW_COLORS.forEach(function (c) {
  COLORS.push(c);
});

NEW_COLOR_FAMILIES.forEach(function (f) {
  COLOR_FAMILIES.push(f);
});

NEW_CATEGORIES.forEach(function (c) {
  CATEGORIES.push(c);
});

NEW_FABRICS.forEach(function (f) {
  FABRICS.push(f);
});
NEW_DESC_OPENERS.forEach(function (o) {
  DESC_OPENERS.push(o);
});
NEW_DESC_MIDDLES.forEach(function (m) {
  DESC_MIDDLES.push(m);
});

var EXPANSION_STYLES = 58; // targets ~1000 additional SKUs across the now-larger category list

// pass 2: additional styles drawn from the full (original + new) brand,
// color and category pools.
generateStyles(CATEGORIES, EXPANSION_STYLES);

// ------------------------------------------------------------------
// Collections. A collection is just a name + a filter fn.
// The category/dept ones get generated, the "editorial" ones are
// hand-maintained (marketing owns the copy).
// ------------------------------------------------------------------
var collections = [];
var collectionBySlug = {};

function addCollection(c) {
  collections.push(c);
  collectionBySlug[c.slug] = c;
}

addCollection({
  slug: "all",
  name: "Shop All",
  blurb: "Every style, every brand. The whole catalogue.",
  filter: function () {
    return true;
  },
});
addCollection({
  slug: "new-arrivals",
  name: "New Arrivals",
  blurb: "Fresh styles, added weekly. See what just landed.",
  filter: function (p) {
    return p.isNew;
  },
});
addCollection({
  slug: "best-sellers",
  name: "Best Sellers",
  blurb: "Customer favourites, restocked and ready.",
  filter: function (p) {
    return p.bestSeller;
  },
});
addCollection({
  slug: "sale",
  name: "Sale",
  blurb: "Up to 50% off select styles. While quantities last.",
  filter: function (p) {
    return p.onSale;
  },
});

DEPTS.forEach(function (d) {
  addCollection({
    slug: d.slug,
    name: d.name,
    dept: d.slug,
    blurb: "The full " + d.name.toLowerCase() + "’s assortment.",
    filter: function (p) {
      return p.dept === d.slug;
    },
  });
  CATEGORIES.forEach(function (cat) {
    if (cat.depts.indexOf(d.slug) === -1) return;
    addCollection({
      slug: d.slug + "-" + cat.slug,
      name: d.name + "’s " + cat.name,
      dept: d.slug,
      category: cat.slug,
      blurb: cat.name + " for " + d.name.toLowerCase() + ".",
      filter: function (p) {
        return p.dept === d.slug && p.category === cat.slug;
      },
    });
  });
});

// editorial collections (marketing)
addCollection({
  slug: "denim-shop",
  name: "The Denim Shop",
  blurb: "Rigid, stretch, vintage wash — find your fit.",
  filter: function (p) {
    return p.category === "jeans-denim";
  },
});
addCollection({
  slug: "outerwear-shop",
  name: "Outerwear Shop",
  blurb: "Jackets and coats for every forecast.",
  filter: function (p) {
    return p.category === "jackets-coats";
  },
});
addCollection({
  slug: "knitwear-edit",
  name: "The Knitwear Edit",
  blurb: "Merino, lambswool and chunky cables.",
  filter: function (p) {
    return p.category === "sweaters-knits";
  },
});
addCollection({
  slug: "active-shop",
  name: "Move: Activewear",
  blurb: "Built to train, made to move.",
  filter: function (p) {
    return p.category === "activewear";
  },
});
addCollection({
  slug: "under-50",
  name: "Under $50",
  blurb: "Easy pieces, easy prices. Everything under $50 CAD.",
  filter: function (p) {
    return p.price < 5000;
  },
});

// ------------------------------------------------------------------
// helpers used all over routes
// ------------------------------------------------------------------
function getProductsForCollection(slug) {
  var col = collectionBySlug[slug];
  if (!col) return null;
  return products.filter(col.filter);
}

function relatedProducts(product, limit) {
  limit = limit || 8;
  var same = products.filter(function (p) {
    return (
      p.id !== product.id &&
      p.category === product.category &&
      p.dept === product.dept
    );
  });
  // stable-ish shuffle keyed off product id so the strip doesn't change every render
  var r = util.makeRng(product.id);
  return r.shuffle(same).slice(0, limit);
}

function searchProducts(q) {
  q = String(q || "")
    .toLowerCase()
    .trim();
  if (!q) return [];
  var terms = q.split(/\s+/);
  return products.filter(function (p) {
    var hay = (
      p.title +
      " " +
      p.brand +
      " " +
      p.categoryName +
      " " +
      p.dept +
      " " +
      p.styleCode
    ).toLowerCase();
    return terms.every(function (t) {
      return hay.indexOf(t) !== -1;
    });
  });
}

// ------------------------------------------------------------------
// Gift-with-purchase SKU (the "$500 free item" promo, ECOM-1041).
// Deliberately NOT pushed into `products`, so collections and search
// never see it - it only exists for the cart engine. Don't "fix" that.
// ------------------------------------------------------------------
var GIFT_SKU = "TN-GWP-01-RED-OS";
var GIFT_PRODUCT = {
  id: 9999,
  styleCode: "TN-GWP-01",
  title: "Wool Camp Beanie (Free Gift)",
  shortName: "Wool Camp Beanie",
  slug: "wool-camp-beanie-free-gift-tn-gwp-01",
  brand: "True North Outfitters",
  brandSlug: "true-north-outfitters",
  dept: "unisex",
  category: "accessories",
  categoryName: "Accessories",
  svgType: "accessory",
  price: 0,
  value: 3499, // the "a $34.99 value!" number marketing wanted shown
  compareAt: null,
  onSale: false,
  isNew: false,
  bestSeller: false,
  hidden: true,
  isGift: true,
  rating: 0,
  ratingCount: 0,
  fabric: "100% merino wool",
  fit: "One size fits most.",
  care: "Hand wash cold. Lay flat to dry.",
  description:
    "Our way of saying thanks - a merino camp beanie, on us, with qualifying orders.",
  createdAt: Date.now(),
  popularity: 0,
  variants: [
    {
      colorName: "Cherry Red",
      colorSlug: "cherry-red",
      colorFamily: "red",
      hex: "#a62639",
      sizes: [{ size: "O/S", sku: GIFT_SKU, stock: 99999 }],
      images: [
        "/media/catalog/9999/cherry-red/front.svg",
        "/media/catalog/9999/cherry-red/back.svg",
        "/media/catalog/9999/cherry-red/detail.svg",
      ],
    },
  ],
};
productById[GIFT_PRODUCT.id] = GIFT_PRODUCT;
productBySlug[GIFT_PRODUCT.slug] = GIFT_PRODUCT;
skuIndex[GIFT_SKU] = {
  product: GIFT_PRODUCT,
  variant: GIFT_PRODUCT.variants[0],
  sizeEntry: GIFT_PRODUCT.variants[0].sizes[0],
};

console.log(
  "[catalog] seeded " +
    products.length +
    " styles, " +
    totalColorways +
    " colourways, " +
    totalSkus +
    " SKUs (+1 GWP sku)",
);

module.exports = {
  products: products,
  productById: productById,
  productBySlug: productBySlug,
  skuIndex: skuIndex,
  GIFT_PRODUCT: GIFT_PRODUCT,
  GIFT_SKU: GIFT_SKU,
  BRANDS: BRANDS,
  COLORS: COLORS,
  COLOR_FAMILIES: COLOR_FAMILIES,
  SIZE_RUNS: SIZE_RUNS,
  CATEGORIES: CATEGORIES,
  DEPTS: DEPTS,
  collections: collections,
  collectionBySlug: collectionBySlug,
  getProductsForCollection: getProductsForCollection,
  relatedProducts: relatedProducts,
  searchProducts: searchProducts,
  stats: {
    styles: products.length,
    colorways: totalColorways,
    skus: totalSkus,
  },
};
