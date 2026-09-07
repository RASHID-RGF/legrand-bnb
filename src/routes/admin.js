// ============================================================
// LeGrand — Admin dashboard (/admin)
// Protected by ADMIN_PASSWORD from .env (session cookie).
// • Read-only browser for every database collection
// • Full user management: list, create, edit, delete
// ============================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const ADMIN_COOKIE = 'legrand_admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS || 12);

// Every collection exposed in the DB browser (order = sidebar order)
const COLLECTIONS = [
  { name: 'properties', label: 'Properties', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6' },
  { name: 'users', label: 'Users', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { name: 'enquiries', label: 'Enquiries', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { name: 'categories', label: 'Categories', icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' },
  { name: 'testimonials', label: 'Testimonials', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { name: 'team', label: 'Team', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
  { name: 'destinations', label: 'Destinations', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6' },
  { name: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
];

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ---------------- Auth gate ----------------
function isAdmin(req) {
  const token = req.cookies && req.cookies[ADMIN_COOKIE];
  if (!token || !ADMIN_PASSWORD) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).render('admin/login', {
      title: 'Admin — LeGrand',
      error: 'ADMIN_PASSWORD is not set. Add it to your .env file and restart the server.',
      isAuthed: false,
    });
  }
  if (!isAdmin(req)) {
    if (req.method === 'GET') {
      return res.render('admin/login', { title: 'Admin — LeGrand', error: null, isAuthed: false });
    }
    return res.status(401).json({ error: 'Admin session expired. Reload the page.' });
  }
  next();
}

// Local helpers shared by every admin view
router.use((req, res, next) => {
  res.locals.esc = esc;
  res.locals.formatDate = (d) => {
    const date = d ? new Date(d) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—';
  };
  next();
});

// ---------------- Session ----------------
router.get('/admin', (req, res) => {
  if (isAdmin(req)) return res.redirect('/admin/overview');
  if (!ADMIN_PASSWORD) {
    return res.status(503).render('admin/login', {
      title: 'Admin — LeGrand',
      error: 'ADMIN_PASSWORD is not set. Add it to your .env file and restart the server.',
      isAuthed: false,
    });
  }
  res.render('admin/login', { title: 'Admin — LeGrand', error: null, isAuthed: false });
});

router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (!ADMIN_PASSWORD || String(password || '') !== ADMIN_PASSWORD) {
    return res.status(401).render('admin/login', {
      title: 'Admin — LeGrand',
      error: 'Incorrect password.',
      isAuthed: false,
    });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, {
    expiresIn: `${SESSION_HOURS}h`,
  });
  res.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  });
  res.redirect('/admin/overview');
});

router.post('/admin/logout', (req, res) => {
  res.clearCookie(ADMIN_COOKIE);
  res.redirect('/admin');
});

// Everything below requires the admin session
router.use('/admin', requireAdmin);

// ---------------- Overview ----------------
router.get('/admin/overview', (req, res) => {
  res.render('admin/overview', {
    title: 'Admin — LeGrand',
    page: 'overview',
    stats: {
      properties: db.getProperties().length,
      users: db.getUsers().length,
      enquiries: db.getEnquiries().length,
      testimonials: db.getTestimonials().length,
    },
  });
});

// ---------------- Database browser (read-only) ----------------
router.get('/admin/db', (req, res) => {
  const name = COLLECTIONS.some((c) => c.name === req.query.c) ? req.query.c : 'properties';
  const data = db.load();

  let docs = [];
  if (name === 'categories') {
    docs = (data.categories || []).map((c) => ({ name: c }));
  } else if (name === 'settings') {
    docs = [data.settings || {}];
  } else {
    docs = data[name] || [];
  }

  // Union of top-level keys, ordered sensibly, capped so wide docs stay readable
  const keyOrder = ['id', 'name', 'title', 'email', 'slug', 'location', 'category', 'createdAt'];
  const keys = [...new Set(docs.flatMap((d) => Object.keys(d)))].sort((a, b) => {
    const ia = keyOrder.indexOf(a);
    const ib = keyOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  res.render('admin/db', {
    title: 'Admin — LeGrand',
    page: 'db',
    collections: COLLECTIONS,
    current: name,
    docs,
    keys,
  });
});

// ---------------- Users ----------------
router.get('/admin/users', (req, res) => {
  const users = db
    .getUsers()
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.render('admin/users', { title: 'Admin — LeGrand', page: 'users', users });
});

router.get('/admin/users/new', (req, res) => {
  res.render('admin/user-form', {
    title: 'Admin — LeGrand',
    page: 'users',
    user: null,
    error: null,
  });
});

router.post('/admin/users', (req, res) => {
  const { name, email, password, provider } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  if (!cleanName || !cleanEmail || !password) {
    return res.status(400).render('admin/user-form', {
      title: 'Admin — LeGrand',
      page: 'users',
      user: null,
      error: 'Name, email and password are all required.',
    });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return res.status(400).render('admin/user-form', {
      title: 'Admin — LeGrand',
      page: 'users',
      user: null,
      error: 'Please enter a valid email address.',
    });
  }
  if (String(password).length < 6) {
    return res.status(400).render('admin/user-form', {
      title: 'Admin — LeGrand',
      page: 'users',
      user: null,
      error: 'Password must be at least 6 characters.',
    });
  }
  if (db.getUserByEmail(cleanEmail)) {
    return res.status(409).render('admin/user-form', {
      title: 'Admin — LeGrand',
      page: 'users',
      user: null,
      error: 'An account with that email already exists.',
    });
  }
  db.addUser({
    name: cleanName,
    email: cleanEmail,
    passwordHash: bcrypt.hashSync(String(password), 10),
    provider: provider === 'google' ? 'google' : 'local',
  });
  res.redirect('/admin/users');
});

router.get('/admin/users/:id/edit', (req, res, next) => {
  const user = db.getUserById(req.params.id);
  if (!user) return next();
  res.render('admin/user-form', { title: 'Admin — LeGrand', page: 'users', user, error: null });
});

router.post('/admin/users/:id', (req, res, next) => {
  const user = db.getUserById(req.params.id);
  if (!user) return next();

  const { name, email, password, provider } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  if (!cleanName || !cleanEmail) {
    return res.status(400).render('admin/user-form', {
      title: 'Admin — LeGrand',
      page: 'users',
      user,
      error: 'Name and email are both required.',
    });
  }
  const clash = db.getUserByEmail(cleanEmail);
  if (clash && clash.id !== user.id) {
    return res.status(409).render('admin/user-form', {
      title: 'Admin — LeGrand',
      page: 'users',
      user,
      error: 'Another account already uses that email.',
    });
  }

  const patch = {
    name: cleanName,
    email: cleanEmail,
    provider: provider === 'google' ? 'google' : 'local',
  };
  if (password) {
    if (String(password).length < 6) {
      return res.status(400).render('admin/user-form', {
        title: 'Admin — LeGrand',
        page: 'users',
        user,
        error: 'Password must be at least 6 characters.',
      });
    }
    patch.passwordHash = bcrypt.hashSync(String(password), 10);
  }
  db.updateUser(user.id, patch);
  res.redirect('/admin/users');
});

router.post('/admin/users/:id/delete', (req, res, next) => {
  const user = db.getUserById(req.params.id);
  if (!user) return next();
  db.deleteUser(user.id);
  res.redirect('/admin/users');
});

module.exports = router;
