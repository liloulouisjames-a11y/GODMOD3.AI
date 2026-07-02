'use strict';
const bcrypt = require('bcryptjs');
const db = require('./db');

function login(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return { id: user.id, username: user.username };
}

// Gate for API routes — returns 401 JSON if not logged in.
function requireApiAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// Gate for HTML pages — redirects to /login.
function requirePageAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

module.exports = { login, requireApiAuth, requirePageAuth };
