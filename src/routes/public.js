// ============================================================
// LeGrand — Public site routes
// ============================================================
const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Helper: filter properties from query params (shared with API)
function applyFilters(properties, q) {
  const {
    q: query,
    location,
    type,
    category,
    min,
    max,
    bedrooms,
    amenity,
    featured,
    sort,
  } = q;

  let list = [...properties];

  if (featured === 'true') list = list.filter((p) => p.featured);

  if (query) {
    const needle = String(query).toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.location.toLowerCase().includes(needle) ||
        p.subCounty.toLowerCase().includes(needle) ||
        p.propertyType.toLowerCase().includes(needle)
    );
  }

  if (location && location !== 'all') {
    const loc = String(location).toLowerCase();
    list = list.filter(
      (p) =>
        p.location.toLowerCase() === loc ||
        p.subCounty.toLowerCase() === loc ||
        p.county.toLowerCase() === loc
    );
  }

  if (type && type !== 'all') {
    list = list.filter((p) => p.propertyType.toLowerCase() === String(type).toLowerCase());
  }

  if (category && category !== 'all') {
    list = list.filter((p) => (p.category || '').toLowerCase() === String(category).toLowerCase());
  }

  if (min) list = list.filter((p) => Number(p.pricePerNight) >= Number(min));
  if (max) list = list.filter((p) => Number(p.pricePerNight) <= Number(max));

  if (bedrooms && bedrooms !== 'any') {
    const b = Number(bedrooms);
    list = list.filter((p) => Number(p.bedrooms) >= b);
  }

  if (amenity && amenity !== 'all') {
    list = list.filter((p) => (p.amenities || []).includes(String(amenity)));
  }

  switch (sort) {
    case 'price-asc':
      list.sort((a, b) => a.pricePerNight - b.pricePerNight);
      break;
    case 'price-desc':
      list.sort((a, b) => b.pricePerNight - a.pricePerNight);
      break;
    case 'rating':
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'newest':
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    default:
      break;
  }

  return list;
}

// ---------------- Home ----------------
router.get('/', (req, res) => {
  const properties = db.getProperties();
  const featured = applyFilters(properties, { featured: 'true', sort: 'rating' }).slice(0, 6);
  const categories = db.getCategories();
  const testimonials = db.getTestimonials();
  const destinations = db.load().destinations || [];
  const settings = db.load().settings;
  const propertiesByCategory = properties.reduce((acc, p) => {
    const key = p.category || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  res.render('home', {
    title: 'LeGrand — Discover Exceptional Stays Across Siaya',
    active: 'home',
    featured,
    categories,
    testimonials,
    destinations,
    settings,
    propertiesByCategory,
    allProperties: properties,
  });
});

// ---------------- Auth (public) ----------------
const bcrypt = require('bcryptjs');
const { signUserToken, guestUserOnly, requireUserAuth } = require('../middleware/auth');

router.get('/login', guestUserOnly, (req, res) => {
  res.render('login', {
    title: 'Sign In — LeGrand',
    active: '',
    error: null,
    message: null,
    next: req.query.next || '/',
  });
});

router.post('/login', guestUserOnly, (req, res) => {
  const { email, password } = req.body;
  const user = db.getUserByEmail(email || '');
  if (user && !user.passwordHash) {
    return res.status(401).render('login', {
      title: 'Sign In — LeGrand',
      active: '',
      error: 'This account uses Google sign-in. Please continue with Google below.',
      message: null,
      next: req.query.next || '/',
    });
  }
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).render('login', {
      title: 'Sign In — LeGrand',
      active: '',
      error: 'Invalid email or password.',
      message: null,
      next: req.query.next || '/',
    });
  }
  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
  res.cookie('legrand_user_token', signUserToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.redirect(safeNext(req.query.next));
});

router.get('/register', guestUserOnly, (req, res) => {
  res.render('register', {
    title: 'Create Account — LeGrand',
    active: '',
    error: null,
    next: req.query.next || '/',
  });
});

router.post('/register', guestUserOnly, (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  if (!cleanName || !cleanEmail || !password) {
    return res.status(400).render('register', {
      title: 'Create Account — LeGrand',
      active: '',
      error: 'Name, email and password are all required.',
      next: req.query.next || '/',
    });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return res.status(400).render('register', {
      title: 'Create Account — LeGrand',
      active: '',
      error: 'Please enter a valid email address.',
      next: req.query.next || '/',
    });
  }
  if (String(password).length < 6) {
    return res.status(400).render('register', {
      title: 'Create Account — LeGrand',
      active: '',
      error: 'Password must be at least 6 characters.',
      next: req.query.next || '/',
    });
  }
  if (password !== confirmPassword) {
    return res.status(400).render('register', {
      title: 'Create Account — LeGrand',
      active: '',
      error: 'Passwords do not match. Please re-enter both passwords.',
      next: req.query.next || '/',
    });
  }
  if (db.getUserByEmail(cleanEmail)) {
    return res.status(409).render('register', {
      title: 'Create Account — LeGrand',
      active: '',
      error: 'An account with that email already exists. Try signing in instead.',
      next: req.query.next || '/',
    });
  }
  const user = db.addUser({
    name: cleanName,
    email: cleanEmail,
    passwordHash: bcrypt.hashSync(password, 10),
  });
  res.cookie('legrand_user_token', signUserToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  // Always land on the home page after signing up, regardless of `next`.
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  res.clearCookie('legrand_user_token');
  res.redirect('/');
});

// ---------------- Google OAuth ("Continue with Google") ----------------
// Google accounts are stored in the MongoDB users collection via db helpers.
// Accounts created through Google have no password and provider:'google'.
const crypto = require('crypto');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `http://localhost:${process.env.PORT || 4000}/auth/google/callback`;

const googleEnabled = () => Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

// Fetch JSON from Google with a per-attempt timeout and retries. This machine's
// connection to Google is flaky (dead IPv6 route / intermittent connect timeouts),
// so a single shot can fail even though the network is up. Only network-level
// failures are retried — an HTTP error response (e.g. invalid_grant) is returned
// as-is so the real problem surfaces instead of being masked.
async function googleFetchJson(url, options, { retries = 3, timeoutMs = 10000 } = {}) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }
  throw lastErr;
}

// Only allow internal relative redirects — blocks open-redirect attacks.
function safeNext(value) {
  const target = String(value || '/');
  return target.startsWith('/') && !target.startsWith('//') ? target : '/';
}

router.post('/auth/google', (req, res) => {
  if (!googleEnabled()) {
    return res.status(501).render('error', {
      title: 'Google Sign-In Unavailable',
      active: '',
      message: 'Google sign-in is not configured yet. Please use email and password instead.',
    });
  }
  const state = crypto.randomBytes(16).toString('hex');
  const next = safeNext(req.body.next || req.query.next);
  res.cookie('legrand_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
  res.cookie('legrand_oauth_next', next, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const savedState = req.cookies && req.cookies.legrand_oauth_state;
  const next = safeNext(req.cookies && req.cookies.legrand_oauth_next);
  res.clearCookie('legrand_oauth_state');
  res.clearCookie('legrand_oauth_next');

  const renderFailure = (message) =>
    res.status(400).render('login', {
      title: 'Sign In — LeGrand',
      active: '',
      error: message,
      message: null,
      next,
    });

  if (error === 'access_denied') {
    return renderFailure('Google sign-in was cancelled. Please try again or use email and password.');
  }
  if (!googleEnabled()) {
    return renderFailure('Google sign-in is not configured yet.');
  }
  if (!code || !savedState || state !== savedState) {
    return renderFailure('Google sign-in failed. Please try again.');
  }

  try {
    const { ok: tokenOk, status: tokenStatus, json: tokens } = await googleFetchJson(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      }
    );
    if (!tokenOk || !tokens.access_token) {
      throw new Error(
        `Google token exchange failed (HTTP ${tokenStatus}): ${tokens.error_description || tokens.error || 'unknown error'}`
      );
    }

    const { ok: userOk, status: userStatus, json: profile } = await googleFetchJson(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );
    if (!userOk || !profile.email || !profile.email_verified) {
      throw new Error(`Could not verify the Google account (HTTP ${userStatus})`);
    }

    const user = db.findOrCreateGoogleUser({
      googleId: String(profile.sub),
      email: String(profile.email),
      name: String(profile.name || profile.given_name || ''),
      picture: profile.picture || null,
    });
    res.cookie('legrand_user_token', signUserToken(user), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(safeNext(next));
  } catch (err) {
    console.error('[google-auth]', err.message, err.cause && err.cause.code ? `(${err.cause.code})` : '');
    return res.status(500).render('login', {
      title: 'Sign In — LeGrand',
      active: '',
      error:
        'Google sign-in failed. This is usually a temporary network issue — please try again, or use email and password.',
      message: null,
      next,
    });
  }
});

// Everything below requires a signed-in visitor.
// Skip /api — the API router has its own auth and must not be intercepted
// by the public router's catch-all.
router.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  return requireUserAuth(req, res, next);
});

// ---------------- Blog ----------------
router.get('/blog', (req, res) => {
  res.render('blog', {
    title: 'Blog — LeGrand',
    active: 'blog',
    settings: db.load().settings,
  });
});

// ---------------- Properties (with filters) ----------------
router.get('/properties', (req, res) => {
  const properties = db.getProperties();
  const filtered = applyFilters(properties, req.query);
  const categories = db.getCategories();
  const settings = db.load().settings;
  const types = [...new Set(properties.map((p) => p.propertyType))].sort();
  const locations = [...new Set(properties.map((p) => p.subCounty))].sort();
  const allAmenities = [...new Set(properties.flatMap((p) => p.amenities || []))].sort();

  res.render('properties', {
    title: 'Properties — LeGrand',
    active: 'properties',
    properties: filtered,
    total: properties.length,
    count: filtered.length,
    query: req.query,
    categories,
    types,
    locations,
    allAmenities,
    settings,
  });
});

// ---------------- Property detail ----------------
router.get('/properties/:slug', (req, res) => {
  const property = db.getPropertyBySlug(req.params.slug);
  if (!property) return res.status(404).render('404', { title: 'Not Found', active: '' });

  const related = db
    .getProperties()
    .filter((p) => p.id !== property.id && (p.subCounty === property.subCounty || p.category === property.category))
    .slice(0, 3);

  res.render('property-detail', {
    title: `${property.title} — LeGrand`,
    active: 'properties',
    property,
    related,
    settings: db.load().settings,
    description: property.description.slice(0, 160),
  });
});

// ---------------- About ----------------
router.get('/about', (req, res) => {
  const team = db.load().team || [];
  const settings = db.load().settings;
  res.render('about', { title: 'About LeGrand', active: 'about', team, settings });
});

// ---------------- Contact ----------------
router.get('/contact', (req, res) => {
  const settings = db.load().settings;
  res.render('contact', {
    title: 'Contact — LeGrand',
    active: 'contact',
    settings,
    flash: req.query.sent ? 'Your message has been sent. We will get back to you shortly!' : null,
  });
});

// ---------------- Favorites ----------------
router.get('/favorites', (req, res) => {
  const settings = db.load().settings;
  res.render('favorites', {
    title: 'Favorites — LeGrand',
    active: 'favorites',
    allProperties: db.getProperties(),
    settings,
  });
});

module.exports = router;
module.exports.applyFilters = applyFilters;
