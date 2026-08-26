/**
 * stores.js - store locator data
 * Was a Google My Business export at some point (2019?), now maintained by hand.
 * Lat/lng are city-centre approximations, good enough for the locator map math.
 */

var util = require('../lib/util');
var rng = util.makeRng(9021);

// city, region(code), regionName, country, lat, lng, howMany stores in that city
var CITIES = [
  // Canada
  ['Toronto', 'ON', 'Ontario', 'CA', 43.6532, -79.3832, 6],
  ['Ottawa', 'ON', 'Ontario', 'CA', 45.4215, -75.6972, 3],
  ['Mississauga', 'ON', 'Ontario', 'CA', 43.5890, -79.6441, 2],
  ['Hamilton', 'ON', 'Ontario', 'CA', 43.2557, -79.8711, 2],
  ['London', 'ON', 'Ontario', 'CA', 42.9849, -81.2453, 2],
  ['Kitchener', 'ON', 'Ontario', 'CA', 43.4516, -80.4925, 1],
  ['Kingston', 'ON', 'Ontario', 'CA', 44.2312, -76.4860, 1],
  ['Windsor', 'ON', 'Ontario', 'CA', 42.3149, -83.0364, 1],
  ['Barrie', 'ON', 'Ontario', 'CA', 44.3894, -79.6903, 1],
  ['Montreal', 'QC', 'Quebec', 'CA', 45.5019, -73.5674, 5],
  ['Quebec City', 'QC', 'Quebec', 'CA', 46.8131, -71.2075, 2],
  ['Laval', 'QC', 'Quebec', 'CA', 45.6066, -73.7124, 1],
  ['Gatineau', 'QC', 'Quebec', 'CA', 45.4765, -75.7013, 1],
  ['Sherbrooke', 'QC', 'Quebec', 'CA', 45.4042, -71.8929, 1],
  ['Vancouver', 'BC', 'British Columbia', 'CA', 49.2827, -123.1207, 5],
  ['Victoria', 'BC', 'British Columbia', 'CA', 48.4284, -123.3656, 2],
  ['Burnaby', 'BC', 'British Columbia', 'CA', 49.2488, -122.9805, 1],
  ['Surrey', 'BC', 'British Columbia', 'CA', 49.1913, -122.8490, 1],
  ['Kelowna', 'BC', 'British Columbia', 'CA', 49.8880, -119.4960, 1],
  ['Calgary', 'AB', 'Alberta', 'CA', 51.0447, -114.0719, 4],
  ['Edmonton', 'AB', 'Alberta', 'CA', 53.5461, -113.4938, 3],
  ['Red Deer', 'AB', 'Alberta', 'CA', 52.2681, -113.8112, 1],
  ['Winnipeg', 'MB', 'Manitoba', 'CA', 49.8951, -97.1384, 2],
  ['Saskatoon', 'SK', 'Saskatchewan', 'CA', 52.1332, -106.6700, 1],
  ['Regina', 'SK', 'Saskatchewan', 'CA', 50.4452, -104.6189, 1],
  ['Halifax', 'NS', 'Nova Scotia', 'CA', 44.6488, -63.5752, 2],
  ['Moncton', 'NB', 'New Brunswick', 'CA', 46.0878, -64.7782, 1],
  ['Fredericton', 'NB', 'New Brunswick', 'CA', 45.9636, -66.6431, 1],
  ['Charlottetown', 'PE', 'Prince Edward Island', 'CA', 46.2382, -63.1311, 1],
  ["St. John's", 'NL', 'Newfoundland and Labrador', 'CA', 47.5615, -52.7126, 1],
  // United States
  ['New York', 'NY', 'New York', 'US', 40.7128, -74.0060, 4],
  ['Brooklyn', 'NY', 'New York', 'US', 40.6782, -73.9442, 2],
  ['Buffalo', 'NY', 'New York', 'US', 42.8864, -78.8784, 1],
  ['Boston', 'MA', 'Massachusetts', 'US', 42.3601, -71.0589, 2],
  ['Chicago', 'IL', 'Illinois', 'US', 41.8781, -87.6298, 3],
  ['Seattle', 'WA', 'Washington', 'US', 47.6062, -122.3321, 3],
  ['Portland', 'OR', 'Oregon', 'US', 45.5152, -122.6784, 2],
  ['San Francisco', 'CA', 'California', 'US', 37.7749, -122.4194, 3],
  ['Los Angeles', 'CA', 'California', 'US', 34.0522, -118.2437, 3],
  ['San Diego', 'CA', 'California', 'US', 32.7157, -117.1611, 1],
  ['Denver', 'CO', 'Colorado', 'US', 39.7392, -104.9903, 2],
  ['Austin', 'TX', 'Texas', 'US', 30.2672, -97.7431, 2],
  ['Dallas', 'TX', 'Texas', 'US', 32.7767, -96.7970, 1],
  ['Houston', 'TX', 'Texas', 'US', 29.7604, -95.3698, 1],
  ['Minneapolis', 'MN', 'Minnesota', 'US', 44.9778, -93.2650, 2],
  ['Detroit', 'MI', 'Michigan', 'US', 42.3314, -83.0458, 1],
  ['Philadelphia', 'PA', 'Pennsylvania', 'US', 39.9526, -75.1652, 2],
  ['Washington', 'DC', 'District of Columbia', 'US', 38.9072, -77.0369, 2],
  ['Atlanta', 'GA', 'Georgia', 'US', 33.7490, -84.3880, 1],
  ['Miami', 'FL', 'Florida', 'US', 25.7617, -80.1918, 1],
  ['Nashville', 'TN', 'Tennessee', 'US', 36.1627, -86.7816, 1],
  ['Phoenix', 'AZ', 'Arizona', 'US', 33.4484, -112.0740, 1],
  ['Salt Lake City', 'UT', 'Utah', 'US', 40.7608, -111.8910, 1],
  ['Columbus', 'OH', 'Ohio', 'US', 39.9612, -82.9988, 1]
];

var STREETS = [
  'Main St', 'King St W', 'Queen St E', 'Yonge St', 'Granville St', 'Water St',
  'Market Ave', 'Broadway', '5th Ave', 'Pine St', 'Elm St', 'Bank St',
  'Portage Ave', 'Jasper Ave', 'Spring Garden Rd', 'Rue Sainte-Catherine',
  'Whyte Ave', '17th Ave SW', 'Commercial Dr', 'College St', 'Dundas St W',
  'Richmond Row', 'Princess St', 'Ouellette Ave', 'Barrington St'
];

var MALL_NAMES = [
  'Eaton Centre', 'Pacific Centre', 'Market Mall', 'Southgate Centre',
  'Rideau Centre', 'Square One', 'Metrotown', 'Chinook Centre',
  'Polo Park', 'Halifax Shopping Centre', 'Carrefour', 'Galleria Mall',
  'Westfield Centre', 'Union Square', 'Lincoln Park Plaza', 'Harbor East'
];

var SERVICES_POOL = [
  'In-Store Pickup', 'Curbside Pickup', 'Free Alterations', 'Returns & Exchanges',
  'Personal Styling', 'Gift Wrapping', 'Tailoring'
];

function phoneFor(country) {
  var area = country === 'CA'
    ? rng.pick(['416', '647', '905', '613', '514', '604', '403', '780', '204', '902', '306', '709'])
    : rng.pick(['212', '718', '617', '312', '206', '503', '415', '213', '303', '512', '612', '215']);
  return '(' + area + ') ' + rng.int(200, 999) + '-' + util.pad(rng.int(0, 9999), 4);
}

function postalFor(country) {
  if (country === 'CA') {
    var L = 'ABCEGHJKLMNPRSTVXY';
    return L[rng.int(0, L.length - 1)] + rng.int(0, 9) + L[rng.int(0, L.length - 1)] +
      ' ' + rng.int(0, 9) + L[rng.int(0, L.length - 1)] + rng.int(0, 9);
  }
  return String(rng.int(10000, 99999));
}

var stores = [];
var id = 1;

CITIES.forEach(function (row) {
  var city = row[0], region = row[1], regionName = row[2], country = row[3],
    lat = row[4], lng = row[5], count = row[6];

  for (var i = 0; i < count; i++) {
    var isMall = rng.chance(0.4);
    var name;
    if (isMall) {
      name = 'True North Outfitters — ' + rng.pick(MALL_NAMES);
    } else if (i === 0) {
      name = 'True North Outfitters — ' + city;
    } else {
      name = 'True North Outfitters — ' + city + ' ' + rng.pick(['North', 'South', 'East', 'West', 'Downtown', 'Uptown', 'Midtown']);
    }

    // jitter the coords a little so pins don't stack
    var jlat = lat + (rng.rand() - 0.5) * 0.12;
    var jlng = lng + (rng.rand() - 0.5) * 0.12;

    var openHour = rng.pick(['9:00 AM', '9:30 AM', '10:00 AM']);
    var closeHour = rng.pick(['6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM']);

    stores.push({
      id: id++,
      name: name,
      address: rng.int(10, 2999) + ' ' + rng.pick(STREETS),
      city: city,
      region: region,
      regionName: regionName,
      country: country,
      countryName: country === 'CA' ? 'Canada' : 'United States',
      postal: postalFor(country),
      phone: phoneFor(country),
      lat: Math.round(jlat * 10000) / 10000,
      lng: Math.round(jlng * 10000) / 10000,
      hours: {
        'Mon-Fri': openHour + ' - ' + closeHour,
        'Sat': '10:00 AM - ' + closeHour,
        'Sun': rng.chance(0.85) ? '11:00 AM - 6:00 PM' : 'Closed'
      },
      services: rng.shuffle(SERVICES_POOL).slice(0, rng.int(2, 5)),
      isFlagship: !isMall && i === 0 && rng.chance(0.5)
    });
  }
});

console.log('[stores] loaded ' + stores.length + ' store locations');

module.exports = {
  stores: stores,
  regions: (function () {
    var seen = {};
    var out = [];
    stores.forEach(function (s) {
      if (!seen[s.region]) {
        seen[s.region] = true;
        out.push({ code: s.region, name: s.regionName, country: s.country });
      }
    });
    out.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    return out;
  })()
};
