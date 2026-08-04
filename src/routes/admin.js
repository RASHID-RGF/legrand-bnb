// ============================================================
// LeGrand — Admin dashboard routes (JWT protected)
// ============================================================
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('../config/db');
const { signToken, requireAuth, guestOnly } = require('../middleware/auth');

const router = express.Router();

// ---------------- Image upload (multer) ----------------
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `prop-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpe?g|png|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only images are allowed'), ok);
  },
});

// ---------------- Auth ----------------
router.get('/login', guestOnly, (req, res) => {
  res.render('admin/login', { title: 'Admin Login — LeGrand', active: '', error: null, message: null });
});

router.post('/login', guestOnly, (req, res) => {
  const { email, password } = req.body;
  const admin = db.getAdminByEmail(email || '');
  if (!admin || !bcrypt.compareSync(password || '', admin.passwordHash)) {
    return res.status(401).render('admin/login', {
      title: 'Admin Login — LeGrand',
      active: '',
      error: 'Invalid email or password.',
      message: null,
    });
  }
  const token = signToken(admin);
  res.cookie('legrand_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  res.clearCookie('legrand_token');
  res.redirect('/admin/login');
});

// Everything below requires auth
router.use(requireAuth);

// ---------------- Dashboard ----------------
router.get('/', (req, res) => {
  const properties = db.getProperties();
  const enquiries = db.getEnquiries();
  const categories = db.getCategories();
  const featured = properties.filter((p) => p.featured).length;
  const unread = enquiries.filter((e) => !e.read).length;
  const recentEnquiries = enquiries.slice(0, 5);

  res.render('admin/dashboard', {
    title: 'Dashboard — LeGrand Admin',
    active: 'dashboard',
    admin: req.admin,
    stats: {
      properties: properties.length,
      featured,
      categories: categories.length,
      enquiries: enquiries.length,
      unread,
    },
    recentEnquiries,
    featuredProperties: properties.filter((p) => p.featured).slice(0, 3),
    latestProperties: properties.slice(0, 5),
  });
});

// ---------------- Properties ----------------
router.get('/properties', (req, res) => {
  res.render('admin/properties', {
    title: 'Properties — LeGrand Admin',
    active: 'properties',
    admin: req.admin,
    properties: db.getProperties(),
  });
});

router.get('/properties/new', (req, res) => {
  res.render('admin/property-form', {
    title: 'Add Property — LeGrand Admin',
    active: 'properties',
    admin: req.admin,
    property: null,
    categories: db.getCategories(),
    error: null,
  });
});

router.post('/properties', upload.array('images', 12), (req, res) => {
  try {
    const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const property = db.addProperty({
      title: req.body.title,
      description: req.body.description,
      pricePerNight: Number(req.body.pricePerNight) || 0,
      location: req.body.location,
      subCounty: req.body.subCounty,
      county: req.body.county || 'Siaya',
      propertyType: req.body.propertyType,
      category: req.body.category,
      bedrooms: Number(req.body.bedrooms) || 1,
      bathrooms: Number(req.body.bathrooms) || 1,
      guests: Number(req.body.guests) || 2,
      phone: req.body.phone,
      phone2: req.body.phone2,
      whatsapp: req.body.whatsapp,
      email: req.body.email,
      instagram: req.body.instagram,
      tiktok: req.body.tiktok,
      facebook: req.body.facebook,
      lat: Number(req.body.lat) || null,
      lng: Number(req.body.lng) || null,
      rating: 0,
      reviews: 0,
      featured: req.body.featured === 'on',
      amenities: Array.isArray(req.body.amenities)
        ? req.body.amenities
        : req.body.amenities
        ? [req.body.amenities]
        : [],
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut,
      highlights: String(req.body.highlights || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      houseRules: String(req.body.houseRules || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      images,
    });
    res.redirect(`/admin/properties/${property.id}/edit?added=1`);
  } catch (err) {
    res.status(400).render('admin/property-form', {
      title: 'Add Property — LeGrand Admin',
      active: 'properties',
      admin: req.admin,
      property: null,
      categories: db.getCategories(),
      error: err.message,
    });
  }
});

router.get('/properties/:id/edit', (req, res) => {
  const property = db.getPropertyById(req.params.id);
  if (!property) return res.redirect('/admin/properties');
  res.render('admin/property-form', {
    title: `Edit ${property.title} — LeGrand Admin`,
    active: 'properties',
    admin: req.admin,
    property,
    categories: db.getCategories(),
    error: null,
    notice: req.query.added ? 'Property created successfully.' : req.query.saved ? 'Changes saved.' : null,
  });
});

router.post('/properties/:id', upload.array('images', 12), (req, res) => {
  const property = db.getPropertyById(req.params.id);
  if (!property) return res.status(404).send('Property not found');

  const keepImages = Array.isArray(req.body.existingImages) ? req.body.existingImages : req.body.existingImages ? [req.body.existingImages] : [];
  const removed = String(req.body.removedImages || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const kept = keepImages.filter((img) => !removed.includes(img));
  const newImages = (req.files || []).map((f) => `/uploads/${f.filename}`);

  const updated = db.updateProperty(req.params.id, {
    title: req.body.title,
    description: req.body.description,
    pricePerNight: Number(req.body.pricePerNight) || 0,
    location: req.body.location,
    subCounty: req.body.subCounty,
    county: req.body.county || 'Siaya',
    propertyType: req.body.propertyType,
    category: req.body.category,
    bedrooms: Number(req.body.bedrooms) || 1,
    bathrooms: Number(req.body.bathrooms) || 1,
    guests: Number(req.body.guests) || 2,
    phone: req.body.phone,
    phone2: req.body.phone2,
    whatsapp: req.body.whatsapp,
    email: req.body.email,
    instagram: req.body.instagram,
    tiktok: req.body.tiktok,
    facebook: req.body.facebook,
    lat: Number(req.body.lat) || null,
    lng: Number(req.body.lng) || null,
    featured: req.body.featured === 'on',
    amenities: Array.isArray(req.body.amenities)
      ? req.body.amenities
      : req.body.amenities
      ? [req.body.amenities]
      : [],
    checkIn: req.body.checkIn,
    checkOut: req.body.checkOut,
    highlights: String(req.body.highlights || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
    houseRules: String(req.body.houseRules || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
    images: [...kept, ...newImages],
  });

  if (req.query.ajax) return res.json({ ok: true });
  res.redirect(`/admin/properties/${req.params.id}/edit?saved=1`);
});

router.post('/properties/:id/delete', (req, res) => {
  db.deleteProperty(req.params.id);
  if (req.query.ajax) return res.json({ ok: true });
  res.redirect('/admin/properties?deleted=1');
});

router.post('/properties/:id/toggle-featured', (req, res) => {
  const property = db.getPropertyById(req.params.id);
  if (property) db.updateProperty(req.params.id, { featured: !property.featured });
  res.redirect(req.get('referer') || '/admin/properties');
});

// ---------------- Categories ----------------
router.get('/categories', (req, res) => {
  res.render('admin/categories', {
    title: 'Categories — LeGrand Admin',
    active: 'categories',
    admin: req.admin,
    categories: db.getCategories(),
    propertyCounts: db
      .getProperties()
      .reduce((acc, p) => ((acc[p.category || 'Uncategorized'] = (acc[p.category || 'Uncategorized'] || 0) + 1), acc), {}),
  });
});

router.post('/categories', (req, res) => {
  db.addCategory(req.body.name);
  res.redirect('/admin/categories');
});

router.post('/categories/delete', (req, res) => {
  db.deleteCategory(req.body.name);
  res.redirect('/admin/categories');
});

// ---------------- Enquiries ----------------
router.get('/enquiries', (req, res) => {
  res.render('admin/enquiries', {
    title: 'Enquiries — LeGrand Admin',
    active: 'enquiries',
    admin: req.admin,
    enquiries: db.getEnquiries(),
  });
});

router.post('/enquiries/:id/read', (req, res) => {
  db.updateEnquiry(req.params.id, { read: true });
  res.redirect('/admin/enquiries');
});

router.post('/enquiries/:id/delete', (req, res) => {
  db.deleteEnquiry(req.params.id);
  res.redirect('/admin/enquiries');
});

module.exports = router;
