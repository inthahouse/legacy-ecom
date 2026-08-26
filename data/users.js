/**
 * users.js - in-memory "user database"
 * Passwords in plain text because this is a demo environment. The real site used
 * bcrypt (see auth-service repo). Do not copy this pattern anywhere.
 */

var users = [
  {
    id: 1,
    email: 'jane@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Tremblay',
    wishlist: [],   // array of product ids
    orders: [],
    addresses: [
      {
        label: 'Home',
        line1: '128 Augusta Ave',
        city: 'Toronto', region: 'ON', postal: 'M5T 2L4', country: 'CA',
        phone: '(416) 555-0134'
      }
    ],
    defaultCard: null, // { brand, last4, expMonth, expYear, name } - set from /account, never seeded
    createdAt: '2019-03-11'
  },
  {
    id: 2,
    email: 'sam@example.com',
    password: 'password123',
    firstName: 'Sam',
    lastName: 'Okafor',
    wishlist: [],
    orders: [],
    addresses: [],
    defaultCard: null,
    createdAt: '2021-08-02'
  }
];

var nextUserId = 3;

function findByEmail(email) {
  email = String(email || '').toLowerCase().trim();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email.toLowerCase() === email) return users[i];
  }
  return null;
}

function findById(id) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) return users[i];
  }
  return null;
}

function createUser(email, password, firstName, lastName) {
  var u = {
    id: nextUserId++,
    email: String(email).trim(),
    password: password,
    firstName: firstName || '',
    lastName: lastName || '',
    wishlist: [],
    orders: [],
    addresses: [],
    defaultCard: null,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  users.push(u);
  return u;
}

module.exports = {
  users: users,
  findByEmail: findByEmail,
  findById: findById,
  createUser: createUser
};
