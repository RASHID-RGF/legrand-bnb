// ============================================================
// LeGrand — Express app core
// Discover Exceptional Stays Across Siaya.
// ============================================================
require('dotenv').config();

// Prefer IPv4 for outbound connections — this machine's IPv6 route is dead and
// makes Node's fetch to Google stall. (Also set in server.js; kept here so the
// app works even when required directly.)
require('dns').setDefaultResultOrder('ipv4first');

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const db = require('./config/db');
const auth = require('./middleware/auth');

const publicRoutes = require('./routes/public');
const apiRoutes = require('./routes/api');
const aiRoutes = require('./routes/ai');

const app = express();

// ------------------------------------------------------------
// View engine (server-rendered EJS — pure Node.js, no build step)
// ------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------
// Compress server-rendered HTML, CSS, JavaScript, and JSON responses.
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Static assets: cache browser-safe assets so CSS and JavaScript are not
// downloaded again on every navigation.
app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads'), { maxAge: '1d' }));

// ------------------------------------------------------------
// Locals shared with every template
// ------------------------------------------------------------
app.locals.siteName = 'LeGrand';
app.locals.tagline = 'Discover Exceptional Stays Across Siaya';
app.locals.year = new Date().getFullYear();

app.locals.money = (n) => {
  const num = Number(n) || 0;
  return 'KSh ' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

app.locals.slugify = (str) =>
  String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');

app.locals.formatDate = (d) => {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

app.locals.imageUrl = (url, width = 800) => {
  const value = String(url || '/static/img/placeholder.svg');
  // Request only the size needed by the component instead of downloading
  // the 1600px source image for small cards and galleries.
  if (value.includes('images.unsplash.com')) {
    return value.replace(/([?&])w=\d+/, `$1w=${width}`);
  }
  return value;
};
app.locals.firstImage = (p) =>
  app.locals.imageUrl(p && p.images && p.images.length ? p.images[0] : '/static/img/placeholder.svg', 700);

// Normalize any phone value to a wa.me-friendly number (digits only, +254 format).
// Used for the second WhatsApp contact fallback when `whatsapp2` is missing.
app.locals.waNumber = (n) => {
  const digits = String(n == null ? '' : n).replace(/\D/g, '');
  return digits.replace(/^0/, '254');
};
app.locals.escapeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
app.locals.esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ------------------------------------------------------------
// Public site
// ------------------------------------------------------------
app.use(auth.optionalUser);
app.use('/', publicRoutes);

// ------------------------------------------------------------
// JSON API (search, contact, map data)
// AI concierge is public — mounted at /api/ai, before the
// auth-gated API so it never requires sign-in
// ------------------------------------------------------------
app.use('/api/ai', aiRoutes);
app.use('/api', apiRoutes);

// ------------------------------------------------------------
// 404 + error handling
// ------------------------------------------------------------
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found', active: '' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
  res.status(500).render('error', { title: 'Server Error', active: '', message: err.message });
});

module.exports = app;
