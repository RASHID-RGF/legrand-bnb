// ============================================================
// LeGrand — JSON file database
// A tiny, dependency-free data layer. Data lives in src/data/db.json
// and is auto-seeded on first run. Swap this module for MongoDB
// later without touching any route code.
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { seedDatabase } = require('../data/seed');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

let cache = null;

function load() {
  if (cache) return cache;
  if (!fs.existsSync(DB_PATH)) {
    cache = seedDatabase();
    save();
  } else {
    try {
      cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (err) {
      console.error('Corrupt db.json — reseeding.', err.message);
      cache = seedDatabase();
      save();
    }
  }
  return cache;
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

function id() {
  return crypto.randomBytes(8).toString('hex');
}

// ---------------- Properties ----------------
function getProperties() {
  return load().properties;
}

function getPropertyById(pid) {
  return load().properties.find((p) => p.id === pid);
}

function getPropertyBySlug(slug) {
  return load().properties.find((p) => p.slug === slug);
}

function addProperty(data) {
  const dbData = load();
  const property = {
    id: id(),
    createdAt: new Date().toISOString(),
    featured: false,
    ...data,
  };
  if (!property.slug) property.slug = uniqueSlug(property.title);
  dbData.properties.unshift(property);
  save();
  return property;
}

function updateProperty(pid, data) {
  const dbData = load();
  const idx = dbData.properties.findIndex((p) => p.id === pid);
  if (idx === -1) return null;
  const merged = { ...dbData.properties[idx], ...data, id: pid };
  if (data.title && data.title !== dbData.properties[idx].title) {
    merged.slug = uniqueSlug(data.title, pid);
  }
  dbData.properties[idx] = merged;
  save();
  return merged;
}

function deleteProperty(pid) {
  const dbData = load();
  dbData.properties = dbData.properties.filter((p) => p.id !== pid);
  save();
}

function uniqueSlug(title, ignoreId) {
  const base = String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
  let slug = base || 'property';
  let n = 2;
  while (load().properties.some((p) => p.slug === slug && p.id !== ignoreId)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// ---------------- Enquiries ----------------
function getEnquiries() {
  return load().enquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addEnquiry(data) {
  const dbData = load();
  const enquiry = {
    id: id(),
    createdAt: new Date().toISOString(),
    read: false,
    ...data,
  };
  dbData.enquiries.unshift(enquiry);
  save();
  return enquiry;
}

function updateEnquiry(eid, data) {
  const dbData = load();
  const idx = dbData.enquiries.findIndex((e) => e.id === eid);
  if (idx === -1) return null;
  dbData.enquiries[idx] = { ...dbData.enquiries[idx], ...data, id: eid };
  save();
  return dbData.enquiries[idx];
}

function deleteEnquiry(eid) {
  const dbData = load();
  dbData.enquiries = dbData.enquiries.filter((e) => e.id !== eid);
  save();
}

// ---------------- Categories ----------------
function getCategories() {
  return load().categories;
}

function addCategory(name) {
  const dbData = load();
  const clean = String(name).trim();
  if (!clean || dbData.categories.includes(clean)) return null;
  dbData.categories.push(clean);
  save();
  return clean;
}

function deleteCategory(name) {
  const dbData = load();
  dbData.categories = dbData.categories.filter((c) => c !== name);
  save();
}

// ---------------- Admins ----------------
function getAdminByEmail(email) {
  return load().admins.find((a) => a.email.toLowerCase() === String(email).toLowerCase());
}

function getAdminById(aid) {
  return load().admins.find((a) => a.id === aid);
}

// ---------------- Testimonials ----------------
function getTestimonials() {
  return load().testimonials || [];
}

module.exports = {
  load,
  save,
  getProperties,
  getPropertyById,
  getPropertyBySlug,
  addProperty,
  updateProperty,
  deleteProperty,
  getEnquiries,
  addEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getCategories,
  addCategory,
  deleteCategory,
  getAdminByEmail,
  getAdminById,
  getTestimonials,
};
