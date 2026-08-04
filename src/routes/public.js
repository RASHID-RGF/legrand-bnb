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
