// ============================================================
// LeGrand — Auth middleware (JWT in httpOnly cookie)
// Site visitors only — the admin panel was removed.
// ============================================================
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'legrand-dev-secret-change-me';

const USER_COOKIE = 'legrand_user_token';

function signUserToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
}

// Attach req.user + res.locals.user when a valid visitor token exists (non-blocking)
function optionalUser(req, res, next) {
  const token = req.cookies && req.cookies[USER_COOKIE];
  res.locals.user = null;
  res.locals.isAuthed = false;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db.getUserById(payload.id);
      if (user) {
        req.user = user;
        res.locals.user = user;
        res.locals.isAuthed = true;
      }
    } catch (err) {
      /* invalid/expired — treat as guest */
    }
  }
  next();
}

// Block: visitors must be signed in (redirect to /login with next)
function requireUserAuth(req, res, next) {
  optionalUser(req, res, () => {
    if (!req.user) {
      const nextPath = req.originalUrl || '/';
      return res.redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
    next();
  });
}

// Block: signed-in visitors away from /login & /register
function guestUserOnly(req, res, next) {
  const token = req.cookies && req.cookies[USER_COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (db.getUserById(payload.id)) {
        return res.redirect(req.query.next || '/');
      }
    } catch (err) {
      /* expired/invalid — allow */
    }
  }
  next();
}

module.exports = { signUserToken, optionalUser, requireUserAuth, guestUserOnly, JWT_SECRET };
