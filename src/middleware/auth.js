// ============================================================
// LeGrand — Auth middleware (JWT in httpOnly cookie)
// ============================================================
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'legrand-dev-secret-change-me';

function signToken(admin) {
  return jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.legrand_token;
  if (!token) return res.redirect('/admin/login');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const admin = db.getAdminById(payload.id);
    if (!admin) return res.redirect('/admin/login');
    req.admin = admin;
    next();
  } catch (err) {
    return res.redirect('/admin/login');
  }
}

function guestOnly(req, res, next) {
  const token = req.cookies && req.cookies.legrand_token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect('/admin');
    } catch (err) {
      /* expired/invalid — allow */
    }
  }
  next();
}

module.exports = { signToken, requireAuth, guestOnly, JWT_SECRET };
