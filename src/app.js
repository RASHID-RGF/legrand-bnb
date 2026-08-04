// ============================================================
// LeGrand — Express app core
// Discover Exceptional Stays Across Siaya.
// ============================================================
require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const db = require('./config/db');
const auth = require('./middleware/auth');

const publicRoutes = require('./routes/public');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();

// ------------------------------------------------------------
// View engine (server-rendered EJS — pure Node.js, no build step)
// ------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Static assets
app.use('/static', express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

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

app.locals.firstImage = (p) => (p && p.images && p.images.length ? p.images[0] : '/static/img/placeholder.svg');
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
// ------------------------------------------------------------
app.use('/api', apiRoutes);

// ------------------------------------------------------------
// Admin dashboard (JWT protected)
// ------------------------------------------------------------
app.use('/admin', adminRoutes);

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
