/**
 * media.js - generates product "photography" as SVG on the fly.
 *
 * Backstory: the real image CDN (images.truenorthoutfitters.example) is not
 * part of this repo, so the demo environment draws flat-lay style garment
 * illustrations per style/colour instead. Same URLs shape as the CDN had:
 *   /media/catalog/:productId/:colorSlug/:view.svg   view = front|back|detail
 */

var express = require('express');
var router = express.Router();
var catalog = require('../data/catalog');
var blog = require('../data/blog');

// ---------- little colour helpers ----------
function hexToRgb(hex) {
  var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 128, g: 128, b: 128 };
}
function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }
function shade(hex, pct) {
  // pct -0.3 = 30% darker, +0.15 = 15% lighter
  var c = hexToRgb(hex);
  var t = pct < 0 ? 0 : 255;
  var p = Math.abs(pct);
  return 'rgb(' + clamp((t - c.r) * p + c.r) + ',' + clamp((t - c.g) * p + c.g) + ',' + clamp((t - c.b) * p + c.b) + ')';
}

// ---------- garment silhouettes (600x750 canvas) ----------

function collarPath(fill, dark) {
  return '<path d="M255 120 Q300 158 345 120 Q300 138 255 120 Z" fill="' + dark + '" opacity="0.55"/>';
}

function tee(fill, dark, light) {
  return [
    '<path d="M245 122 L165 152 L82 236 L122 308 L186 268 L186 610 Q186 622 198 622 L402 622 Q414 622 414 610 L414 268 L478 308 L518 236 L435 152 L355 122 Q300 168 245 122 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    collarPath(fill, dark),
    '<path d="M186 268 L186 296" stroke="', dark, '" stroke-width="3" opacity="0.35"/>',
    '<path d="M414 268 L414 296" stroke="', dark, '" stroke-width="3" opacity="0.35"/>',
    '<path d="M200 600 L400 600" stroke="', dark, '" stroke-width="3" opacity="0.25"/>'
  ].join('');
}

function shirt(fill, dark, light) {
  return [
    '<path d="M250 118 L170 148 L96 220 L120 560 Q121 574 135 574 L170 574 L166 300 L182 610 Q183 624 197 624 L403 624 Q417 624 418 610 L434 300 L430 574 L465 574 Q479 574 480 560 L504 220 L430 148 L350 118 Q300 162 250 118 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    // collar
    '<path d="M250 118 L300 160 L268 186 L242 138 Z" fill="', light, '" stroke="', dark, '" stroke-width="3"/>',
    '<path d="M350 118 L300 160 L332 186 L358 138 Z" fill="', light, '" stroke="', dark, '" stroke-width="3"/>',
    // placket + buttons
    '<path d="M300 162 L300 616" stroke="', dark, '" stroke-width="3" opacity="0.5"/>',
    '<circle cx="300" cy="220" r="5" fill="', dark, '"/>',
    '<circle cx="300" cy="290" r="5" fill="', dark, '"/>',
    '<circle cx="300" cy="360" r="5" fill="', dark, '"/>',
    '<circle cx="300" cy="430" r="5" fill="', dark, '"/>',
    '<circle cx="300" cy="500" r="5" fill="', dark, '"/>',
    // pocket
    '<path d="M218 250 h56 v62 l-28 12 l-28 -12 Z" fill="none" stroke="', dark, '" stroke-width="3" opacity="0.5"/>'
  ].join('');
}

function sweater(fill, dark, light) {
  return [
    '<path d="M248 124 L168 154 L102 224 L138 580 Q140 594 154 594 L188 594 L186 300 L186 606 Q186 620 200 620 L400 620 Q414 620 414 606 L414 300 L412 594 L446 594 Q460 594 462 580 L498 224 L432 154 L352 124 Q300 170 248 124 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    // ribbed neck
    '<path d="M248 124 Q300 172 352 124 Q300 150 248 124 Z" fill="', dark, '" opacity="0.45"/>',
    // ribbing lines at hem + cuffs
    '<path d="M190 596 L410 596 M190 608 L410 608" stroke="', dark, '" stroke-width="2.5" opacity="0.4"/>',
    '<path d="M142 566 L186 566 M141 578 L187 578" stroke="', dark, '" stroke-width="2.5" opacity="0.4"/>',
    '<path d="M414 566 L458 566 M413 578 L459 578" stroke="', dark, '" stroke-width="2.5" opacity="0.4"/>',
    // cable hint
    '<path d="M262 200 Q276 260 262 320 Q248 380 262 440 Q276 500 262 560" stroke="', dark, '" stroke-width="3" fill="none" opacity="0.25"/>',
    '<path d="M338 200 Q324 260 338 320 Q352 380 338 440 Q324 500 338 560" stroke="', dark, '" stroke-width="3" fill="none" opacity="0.25"/>'
  ].join('');
}

function hoodie(fill, dark, light) {
  return [
    // hood behind
    '<path d="M230 150 Q300 60 370 150 Q340 118 300 118 Q260 118 230 150 Z" fill="', dark, '" opacity="0.5"/>',
    '<path d="M248 128 L170 158 L104 228 L140 578 Q142 592 156 592 L190 592 L188 300 L188 604 Q188 618 202 618 L398 618 Q412 618 412 604 L412 300 L410 592 L444 592 Q458 592 460 578 L496 228 L430 158 L352 128 Q300 172 248 128 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    // hood opening
    '<path d="M248 128 Q300 96 352 128 Q345 180 300 186 Q255 180 248 128 Z" fill="', light, '" stroke="', dark, '" stroke-width="3.5"/>',
    // drawstrings
    '<path d="M284 184 L280 250 M316 184 L320 250" stroke="', dark, '" stroke-width="3.5" fill="none"/>',
    '<circle cx="280" cy="254" r="4" fill="', dark, '"/><circle cx="320" cy="254" r="4" fill="', dark, '"/>',
    // kangaroo pocket
    '<path d="M228 440 L372 440 L392 560 L208 560 Z" fill="', dark, '" opacity="0.18" stroke="', dark, '" stroke-width="3"/>',
    '<path d="M192 606 L408 606" stroke="', dark, '" stroke-width="2.5" opacity="0.4"/>'
  ].join('');
}

function jacket(fill, dark, light) {
  return [
    '<path d="M244 118 L160 150 L92 226 L134 586 Q136 600 150 600 L186 600 L184 300 L184 612 Q184 626 198 626 L402 626 Q416 626 416 612 L416 300 L414 600 L450 600 Q464 600 466 586 L508 226 L440 150 L356 118 Q300 156 244 118 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    // collar band
    '<path d="M244 118 L300 152 L356 118 L356 136 L300 172 L244 136 Z" fill="', dark, '" opacity="0.6"/>',
    // zip
    '<path d="M300 156 L300 622" stroke="', dark, '" stroke-width="5"/>',
    '<path d="M300 156 L300 622" stroke="', light, '" stroke-width="1.6" stroke-dasharray="5 4"/>',
    // chest + hand pockets
    '<path d="M222 330 h52 M326 330 h52" stroke="', dark, '" stroke-width="4" opacity="0.6"/>',
    '<path d="M214 470 l44 60 M386 470 l-44 60" stroke="', dark, '" stroke-width="4" opacity="0.6"/>',
    // quilt lines
    '<path d="M188 240 L412 240 M186 380 L414 380 M186 520 L414 520" stroke="', dark, '" stroke-width="2" opacity="0.18"/>'
  ].join('');
}

function pants(fill, dark, light) {
  return [
    '<path d="M212 120 L388 120 L400 240 L394 630 Q394 642 382 642 L330 642 Q318 642 318 630 L306 320 L294 630 Q294 642 282 642 L218 642 Q206 642 206 630 L200 240 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    // waistband
    '<path d="M212 120 L388 120 L390 150 L210 150 Z" fill="', dark, '" opacity="0.35"/>',
    '<circle cx="300" cy="136" r="5" fill="', dark, '"/>',
    '<path d="M300 150 L300 176" stroke="', dark, '" stroke-width="3.5" opacity="0.6"/>',
    // pockets
    '<path d="M218 158 Q248 200 268 162" stroke="', dark, '" stroke-width="3" fill="none" opacity="0.55"/>',
    '<path d="M382 158 Q352 200 332 162" stroke="', dark, '" stroke-width="3" fill="none" opacity="0.55"/>',
    // seams
    '<path d="M242 642 L252 240 M358 642 L348 240" stroke="', dark, '" stroke-width="2" opacity="0.2"/>'
  ].join('');
}

function shorts(fill, dark, light) {
  return [
    '<path d="M206 130 L394 130 L410 420 Q410 432 398 432 L330 432 Q319 432 318 420 L303 280 L288 420 Q287 432 276 432 L202 432 Q190 432 190 420 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M206 130 L394 130 L396 160 L204 160 Z" fill="', dark, '" opacity="0.35"/>',
    '<path d="M300 160 L300 190" stroke="', dark, '" stroke-width="3.5" opacity="0.6"/>',
    '<path d="M300 136 h0" stroke="none"/>',
    '<path d="M282 146 a6 6 0 1 0 0.1 0" fill="', dark, '"/>',
    '<path d="M212 168 Q244 210 266 172" stroke="', dark, '" stroke-width="3" fill="none" opacity="0.55"/>',
    '<path d="M388 168 Q356 210 334 172" stroke="', dark, '" stroke-width="3" fill="none" opacity="0.55"/>',
    '<path d="M196 414 L282 414 M318 414 L404 414" stroke="', dark, '" stroke-width="3" opacity="0.3"/>'
  ].join('');
}

function dress(fill, dark, light) {
  return [
    '<path d="M258 122 L232 150 L226 240 Q262 268 300 268 Q338 268 374 240 L368 150 L342 122 Q300 152 258 122 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    // straps/neck
    collarPath(fill, dark),
    // skirt
    '<path d="M226 240 Q262 268 300 268 Q338 268 374 240 L448 610 Q450 624 436 624 L164 624 Q150 624 152 610 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    // waist seam
    '<path d="M228 246 Q300 276 372 246" stroke="', dark, '" stroke-width="3" fill="none" opacity="0.5"/>',
    // drape lines
    '<path d="M250 300 L216 600 M300 310 L300 604 M350 300 L384 600" stroke="', dark, '" stroke-width="2" opacity="0.2"/>'
  ].join('');
}

function skirt(fill, dark, light) {
  return [
    '<path d="M218 200 L382 200 L444 560 Q446 574 432 574 L168 574 Q154 574 156 560 Z"',
    ' fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M218 200 L382 200 L386 228 L214 228 Z" fill="', dark, '" opacity="0.35"/>',
    '<path d="M252 240 L226 556 M300 240 L300 556 M348 240 L374 556" stroke="', dark, '" stroke-width="2" opacity="0.22"/>'
  ].join('');
}

// accessories get a shape picked off the product title
function accessory(fill, dark, light, title) {
  title = title.toLowerCase();
  if (title.indexOf('tote') !== -1 || title.indexOf('bag') !== -1 || title.indexOf('wallet') !== -1) {
    return [
      '<path d="M180 280 L420 280 L440 600 Q440 614 426 614 L174 614 Q160 614 160 600 Z" fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
      '<path d="M240 280 Q240 170 300 170 Q360 170 360 280" stroke="', dark, '" stroke-width="9" fill="none"/>',
      '<path d="M180 330 L426 330" stroke="', dark, '" stroke-width="2.5" opacity="0.3"/>'
    ].join('');
  }
  if (title.indexOf('beanie') !== -1 || title.indexOf('hat') !== -1 || title.indexOf('cap') !== -1) {
    return [
      '<path d="M176 430 Q176 220 300 220 Q424 220 424 430 Z" fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
      '<rect x="164" y="430" width="272" height="70" rx="14" fill="', fill, '" stroke="', dark, '" stroke-width="4"/>',
      '<path d="M190 436 L190 494 M220 434 L220 498 M250 432 L250 500 M280 432 L280 500 M310 432 L310 500 M340 432 L340 500 M370 434 L370 498 M400 436 L400 494" stroke="', dark, '" stroke-width="2.5" opacity="0.4"/>',
      '<circle cx="300" cy="208" r="18" fill="', dark, '" opacity="0.7"/>'
    ].join('');
  }
  if (title.indexOf('sock') !== -1) {
    return [
      '<path d="M250 150 L350 150 L350 400 Q350 430 380 450 L420 478 Q450 500 432 540 Q410 580 360 560 L270 500 Q250 486 250 460 Z" fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
      '<path d="M250 190 L350 190" stroke="', dark, '" stroke-width="3" opacity="0.5"/>',
      '<path d="M250 170 L350 170" stroke="', dark, '" stroke-width="3" opacity="0.5"/>'
    ].join('');
  }
  if (title.indexOf('belt') !== -1) {
    return [
      '<circle cx="300" cy="390" r="150" fill="none" stroke="', fill, '" stroke-width="52"/>',
      '<circle cx="300" cy="390" r="150" fill="none" stroke="', dark, '" stroke-width="3" opacity="0.5"/>',
      '<circle cx="300" cy="390" r="124" fill="none" stroke="', dark, '" stroke-width="3" opacity="0.5"/>',
      '<rect x="272" y="212" width="56" height="72" rx="10" fill="none" stroke="', dark, '" stroke-width="8"/>'
    ].join('');
  }
  if (title.indexOf('glove') !== -1) {
    return [
      '<path d="M240 180 L240 420 Q240 470 260 500 L260 580 L360 580 L360 500 Q390 460 390 400 L390 260 L360 260 L360 180 L330 180 L330 250 L310 250 L310 170 L280 170 L280 250 L262 250 L262 180 Z" fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
      '<path d="M260 520 L360 520" stroke="', dark, '" stroke-width="3" opacity="0.5"/>'
    ].join('');
  }
  // scarf default
  return [
    '<path d="M240 140 L360 140 L360 520 L240 520 Z" fill="', fill, '" stroke="', dark, '" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M240 520 L240 600 M270 520 L270 606 M300 520 L300 610 M330 520 L330 606 M360 520 L360 600" stroke="', dark, '" stroke-width="5"/>',
    '<path d="M240 200 L360 200 M240 260 L360 260 M240 320 L360 320 M240 380 L360 380 M240 440 L360 440" stroke="', dark, '" stroke-width="2.5" opacity="0.35"/>'
  ].join('');
}

var DRAW = {
  tee: tee, shirt: shirt, sweater: sweater, hoodie: hoodie, jacket: jacket,
  pants: pants, shorts: shorts, dress: dress, skirt: skirt, accessory: accessory
};

function svgDoc(inner, bg) {
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750">' +
    '<defs><pattern id="wv" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
    '<rect width="8" height="8" fill="none"/><path d="M0 0 L0 8" stroke="rgba(0,0,0,0.05)" stroke-width="2"/></pattern></defs>' +
    '<rect width="600" height="750" fill="' + bg + '"/>' +
    inner +
    '</svg>';
}

router.get('/catalog/:id/:color/:view.svg', function (req, res) {
  var product = catalog.productById[req.params.id];
  if (!product) return res.status(404).send('not found');

  var variant = null;
  product.variants.forEach(function (v) {
    if (v.colorSlug === req.params.color) variant = v;
  });
  if (!variant) variant = product.variants[0];

  var fill = variant.hex;
  var dark = shade(fill, -0.38);
  var light = shade(fill, 0.28);
  var view = req.params.view;

  // backgrounds alternate slightly per product so grids don't look flat
  var bgs = ['#efece5', '#ece9e1', '#f1eee8', '#eae7df'];
  var bg = bgs[product.id % bgs.length];

  var inner = '';

  if (view === 'detail') {
    // fabric close-up + care label
    inner =
      '<rect width="600" height="750" fill="' + fill + '"/>' +
      '<rect width="600" height="750" fill="url(#wv)"/>' +
      '<rect width="600" height="750" fill="url(#wv)" transform="translate(300 0) scale(-1 1) translate(-300 0)"/>' +
      '<g transform="rotate(-6 300 560)">' +
      '<rect x="210" y="500" width="180" height="120" rx="6" fill="#f5f2ea" stroke="' + dark + '" stroke-width="2"/>' +
      '<text x="300" y="545" font-family="Georgia, serif" font-size="22" text-anchor="middle" fill="#3d3a34">TRUE NORTH</text>' +
      '<text x="300" y="572" font-family="Georgia, serif" font-size="13" text-anchor="middle" fill="#6b675e">' + escXml(product.brand) + '</text>' +
      '<text x="300" y="598" font-family="Georgia, serif" font-size="11" text-anchor="middle" fill="#8a867c">' + product.styleCode + '</text>' +
      '</g>';
    res.type('image/svg+xml');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(svgDoc(inner, fill));
  }

  var drawFn = DRAW[product.svgType] || tee;
  var garment = drawFn(fill, dark, light, product.title);

  if (view === 'back') {
    // mirror + strip the detail-heavy front, add a centre seam. cheap but reads as "back view"
    inner =
      '<ellipse cx="300" cy="660" rx="190" ry="26" fill="rgba(0,0,0,0.08)"/>' +
      '<g transform="translate(600,0) scale(-1,1)">' + garment + '</g>' +
      '<path d="M300 190 L300 600" stroke="' + dark + '" stroke-width="2" opacity="0.25"/>';
  } else {
    inner =
      '<ellipse cx="300" cy="660" rx="190" ry="26" fill="rgba(0,0,0,0.08)"/>' +
      garment;
  }

  res.type('image/svg+xml');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(svgDoc(inner, bg));
});

// brand "logo" tiles for the mega menu / brand pages
router.get('/brand/:slug.svg', function (req, res) {
  var brand = null;
  catalog.BRANDS.forEach(function (b) {
    if (require('../lib/util').slugify(b) === req.params.slug) brand = b;
  });
  if (!brand) brand = 'True North';

  var hues = ['#2e4636', '#22304d', '#6b2635', '#4e342e', '#55565a', '#a1502c', '#3b4d78', '#6b6b45'];
  var bg = hues[brand.length % hues.length];

  var svg = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">' +
    '<rect width="400" height="240" fill="' + bg + '"/>' +
    '<rect x="14" y="14" width="372" height="212" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>' +
    '<text x="200" y="118" font-family="Georgia, serif" font-size="30" text-anchor="middle" fill="#f4f2ec">' + escXml(brand.toUpperCase()) + '</text>' +
    '<text x="200" y="152" font-family="Georgia, serif" font-size="13" letter-spacing="4" text-anchor="middle" fill="rgba(244,242,236,0.7)">EST. ' + (1968 + (brand.length * 3) % 50) + '</text>' +
    '</svg>';
  res.type('image/svg+xml');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// blog cover art - flat colour + a simple ridgeline, category name overlaid.
// same idea as the product art above: no real photo CDN in this demo, so we
// draw something in the brand's ballpark instead of a broken <img>.
router.get('/blog/:slug.svg', function (req, res) {
  var post = blog.postBySlug[req.params.slug];
  var bg = post ? post.color : '#2e4636';
  var dark = shade(bg, -0.35);
  var light = shade(bg, 0.4);

  var svg = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">' +
    '<rect width="800" height="500" fill="' + bg + '"/>' +
    '<circle cx="660" cy="120" r="46" fill="' + light + '" opacity="0.85"/>' +
    '<path d="M0 380 L160 250 L280 340 L420 190 L560 320 L680 220 L800 360 L800 500 L0 500 Z" fill="' + dark + '" opacity="0.5"/>' +
    '<path d="M0 430 L200 320 L360 410 L520 280 L680 390 L800 320 L800 500 L0 500 Z" fill="' + dark + '" opacity="0.35"/>' +
    (post ? '<text x="40" y="70" font-family="Georgia, serif" font-size="20" letter-spacing="3" fill="' + light + '">' + escXml(post.category.toUpperCase()) + '</text>' : '') +
    '</svg>';

  res.type('image/svg+xml');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = router;
