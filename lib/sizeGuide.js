/**
 * sizeGuide.js - static reference measurement charts for the PDP "Size
 * Guide" modal. The sizing system (apparel letters / waist inches / one
 * size) is inferred from the size labels actually sold on the product -
 * same values already shown in the size buttons - rather than importing
 * catalog.js's SIZE_RUNS, so this stays correct even if a product only
 * carries a subset of a run.
 */

var APPAREL_CHARTS = {
  women: {
    label: "Women's Apparel",
    columns: ["Size", "Bust (in)", "Waist (in)", "Hip (in)"],
    rows: {
      XS: ["XS", "32-33", "24-25", "34-35"],
      S: ["S", "34-35", "26-27", "36-37"],
      M: ["M", "36-37", "28-29", "38-39"],
      L: ["L", "38-40", "30-32", "40-42"],
      XL: ["XL", "41-43", "33-35", "43-45"],
      XXL: ["XXL", "44-46", "36-38", "46-48"],
    },
  },
  men: {
    label: "Men's Apparel",
    columns: ["Size", "Chest (in)", "Waist (in)"],
    rows: {
      XS: ["XS", "32-34", "26-28"],
      S: ["S", "35-37", "29-31"],
      M: ["M", "38-40", "32-34"],
      L: ["L", "41-43", "35-37"],
      XL: ["XL", "44-46", "38-40"],
      XXL: ["XXL", "47-49", "41-43"],
    },
  },
  kids: {
    label: "Kids' Apparel",
    columns: ["Size", "Chest (in)", "Waist (in)", "Height (in)"],
    rows: {
      XS: ["XS", "23-24", "21-22", "41-45"],
      S: ["S", "25-26", "22-23", "46-50"],
      M: ["M", "27-28", "24-25", "51-54"],
      L: ["L", "29-30", "25-26", "55-58"],
      XL: ["XL", "31-32", "27-28", "59-61"],
      XXL: ["XXL", "33-34", "28-29", "62-64"],
    },
  },
};
APPAREL_CHARTS.unisex = APPAREL_CHARTS.men;

// waist size (in) -> hip (in), for jeans/pants sizing
var WAIST_TO_HIP = {
  28: "35-36",
  30: "37-38",
  32: "39-40",
  34: "41-42",
  36: "43-44",
  38: "45-46",
  40: "47-48",
};
var INSEAM = { adult: "32", kids: "24-26" };

function detectType(sizeLabels) {
  if (sizeLabels.length === 1 && sizeLabels[0] === "O/S") return "oneSize";
  if (
    sizeLabels.every(function (s) {
      return /^\d+$/.test(s);
    })
  )
    return "waist";
  return "apparel";
}

// product -> { type, label, columns, rows } for the size-guide partial.
// type "oneSize" omits label/columns/rows - the partial shows a note instead.
function buildGuide(product) {
  var sizeLabels = (product.variants[0].sizes || []).map(function (s) {
    return s.size;
  });
  var type = detectType(sizeLabels);

  if (type === "oneSize") return { type: type };

  if (type === "waist") {
    var inseam = product.dept === "kids" ? INSEAM.kids : INSEAM.adult;
    var rows = sizeLabels.map(function (w) {
      return [w, w, WAIST_TO_HIP[w] || "-", inseam];
    });
    return {
      type: type,
      label: "Waist & Inseam",
      columns: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
      rows: rows,
    };
  }

  var chart = APPAREL_CHARTS[product.dept] || APPAREL_CHARTS.unisex;
  var rows = sizeLabels
    .map(function (label) {
      return chart.rows[label];
    })
    .filter(Boolean);

  return { type: type, label: chart.label, columns: chart.columns, rows: rows };
}

module.exports = { buildGuide: buildGuide };
