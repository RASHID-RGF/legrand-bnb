// ============================================================
// LeGrand — JSON API routes
// ============================================================
const express = require('express');
const db = require('../config/db');
const { applyFilters } = require('./public');
const { requireUserAuth } = require('../middleware/auth');

const router = express.Router();

// All API endpoints require a signed-in visitor
router.use(requireUserAuth);

// Property search + filter (used by live search & map view)
router.get('/properties', (req, res) => {
  const properties = db.getProperties();
  const filtered = applyFilters(properties, req.query);
  const brief = filtered.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    propertyType: p.propertyType,
    pricePerNight: p.pricePerNight,
    location: p.location,
    subCounty: p.subCounty,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    guests: p.guests,
    rating: p.rating,
    image: p.images[0],
    featured: p.featured,
    lat: p.lat,
    lng: p.lng,
    category: p.category,
  }));
  res.json({ count: brief.length, properties: brief });
});

// Public filter metadata (dropdown options)
router.get('/meta', (req, res) => {
  const properties = db.getProperties();
  res.json({
    types: [...new Set(properties.map((p) => p.propertyType))].sort(),
    locations: [...new Set(properties.map((p) => p.subCounty))].sort(),
    categories: db.getCategories(),
    amenities: [...new Set(properties.flatMap((p) => p.amenities || []))].sort(),
  });
});

// Contact form submission (also used by the contact page)
router.post('/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required.' });
  }
  const enquiry = db.addEnquiry({
    name: String(name).slice(0, 120),
    email: String(email || '').slice(0, 120),
    phone: String(phone || '').slice(0, 40),
    subject: String(subject || 'General enquiry').slice(0, 200),
    message: String(message).slice(0, 4000),
  });
  res.status(201).json({ ok: true, id: enquiry.id });
});

module.exports = router;
