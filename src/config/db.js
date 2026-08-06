// ============================================================
// LeGrand — MongoDB data layer (Mongoose)
// All data lives in MongoDB Atlas. The module keeps the exact
// same synchronous API the routes were written against, backed
// by an in-memory cache that mirrors the collections; every
// mutation is written through to Mongo immediately.
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { seedDatabase } = require('../data/seed');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB = process.env.MONGO_DB || 'legrand';

const COLLECTIONS = [
  'properties',
  'users',
  'enquiries',
  'categories',
  'testimonials',
  'team',
  'destinations',
  'settings',
];

mongoose.set('strictQuery', false);

let cache = null;
let connected = false;

// ---------------- Mongoose models ----------------
// strict:false keeps the flexible document shapes the app relies on.
// id:false disables Mongoose's built-in `id` virtual so the app's own
// `id` field is stored as a real, queryable field (JWT auth depends on it).
const flexible = new mongoose.Schema({}, { strict: false, id: false, versionKey: false });

const models = {
  properties: mongoose.model('Property', flexible, 'properties'),
  users: mongoose.model('User', flexible, 'users'),
  enquiries: mongoose.model('Enquiry', flexible, 'enquiries'),
  categories: mongoose.model('Category', flexible, 'categories'),
  testimonials: mongoose.model('Testimonial', flexible, 'testimonials'),
  team: mongoose.model('TeamMember', flexible, 'team'),
  destinations: mongoose.model('Destination', flexible, 'destinations'),
  settings: mongoose.model('SiteSettings', flexible, 'settings'),
};

function stripMongo({ _id, __v, ...rest }) {
  return rest;
}

// ---------------- Connection, seeding, cache ----------------
async function connect() {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is missing — add it to your .env file (see .env.example).');
  }
  await mongoose.connect(MONGO_URI, {
    dbName: MONGO_DB,
    serverSelectionTimeoutMS: 15000,
  });
  connected = true;
  await ensureSeeded();
  await ensureIndexes();
  await reloadCache();
  return mongoose.connection;
}

// Unique indexes make duplicate documents impossible even if two
// processes (e.g. `node --watch` restarts) ever write at the same time.
// Only collections carrying app `id` fields get the id index.
async function ensureIndexes() {
  const withIds = ['properties', 'users', 'enquiries'];
  for (const name of withIds) {
    try {
      await models[name].collection.createIndex({ id: 1 }, { unique: true });
    } catch (err) {
      console.error(`[mongo] could not create unique index on "${name}.id":`, err.message);
    }
  }
  try {
    await models.users.collection.createIndex({ email: 1 }, { unique: true });
  } catch (err) {
    console.error('[mongo] could not create unique index on users.email:', err.message);
  }
  try {
    await models.users.collection.createIndex({ googleId: 1 }, { unique: true, sparse: true });
  } catch (err) {
    console.error('[mongo] could not create unique index on users.googleId:', err.message);
  }
}

// Seed/migrate ONLY when the database is completely empty — never clobber
// existing Atlas data. Existing db.json is migrated on first run so no data
// is lost (the old demo visitor account is dropped).
async function ensureSeeded() {
  const [props, users] = await Promise.all([
    models.properties.estimatedDocumentCount(),
    models.users.estimatedDocumentCount(),
  ]);
  if (props > 0 || users > 0) return;

  let payload = null;
  if (fs.existsSync(DB_PATH)) {
    try {
      payload = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (err) {
      console.error('Unreadable db.json — falling back to seed data.', err.message);
    }
  }
  if (!payload || !Array.isArray(payload.properties)) payload = seedDatabase();

  // Never carry the old demo visitor account forward
  payload.users = (payload.users || []).filter(
    (u) => u.email !== 'user@legrand.co.ke' && u.id !== 'user-1'
  );
  // No admin accounts anymore — drop any legacy admin payload
  delete payload.admins;

  for (const name of COLLECTIONS) {
    await writeCollection(name, payload[name]);
  }
  console.log(`[mongo] database "${MONGO_DB}" seeded`);
}

async function reloadCache() {
  cache = {};
  for (const name of COLLECTIONS) {
    const Model = models[name];
    if (name === 'categories') {
      cache[name] = (await Model.find().lean()).map((d) => d.name);
    } else if (name === 'settings') {
      const doc = await Model.findOne().lean();
      cache[name] = (doc && doc.data) || {};
    } else {
      cache[name] = (await Model.find().lean()).map(stripMongo);
    }
  }
}

async function writeCollection(name, docs) {
  const Model = models[name];
  await Model.deleteMany({});
  if (name === 'categories') {
    if (Array.isArray(docs)) await Model.insertMany(docs.map((d) => ({ name: d })));
  } else if (name === 'settings') {
    if (docs) await Model.insertMany([{ data: docs }]);
  } else if (Array.isArray(docs) && docs.length) {
    await Model.insertMany(docs);
  }
}

// Serialize writes per collection so deleteMany+insertMany from concurrent
// mutations never interleave (which would duplicate documents).
const writeQueues = {};

function persist(name) {
  if (!connected || !cache) return Promise.resolve();
  const prev = writeQueues[name] || Promise.resolve();
  const next = prev
    .then(() => writeCollection(name, cache[name]))
    .catch((err) => console.error(`[mongo] failed to save "${name}":`, err.message));
  writeQueues[name] = next;
  return next;
}

// Force a full reseed (used by `npm run seed`).
async function seedAll(payload) {
  for (const name of COLLECTIONS) {
    await writeCollection(name, payload[name]);
  }
  await reloadCache();
}

// ---------------- Sync API (route-compatible) ----------------
function load() {
  if (cache) return cache;
  cache = seedDatabase(); // pre-connect fallback; connect() replaces it
  return cache;
}

function save() {
  return Promise.all(COLLECTIONS.map((name) => persist(name)));
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
  persist('properties');
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
  persist('properties');
  return merged;
}

function deleteProperty(pid) {
  const dbData = load();
  dbData.properties = dbData.properties.filter((p) => p.id !== pid);
  persist('properties');
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
  persist('enquiries');
  return enquiry;
}

function updateEnquiry(eid, data) {
  const dbData = load();
  const idx = dbData.enquiries.findIndex((e) => e.id === eid);
  if (idx === -1) return null;
  dbData.enquiries[idx] = { ...dbData.enquiries[idx], ...data, id: eid };
  persist('enquiries');
  return dbData.enquiries[idx];
}

function deleteEnquiry(eid) {
  const dbData = load();
  dbData.enquiries = dbData.enquiries.filter((e) => e.id !== eid);
  persist('enquiries');
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
  persist('categories');
  return clean;
}

function deleteCategory(name) {
  const dbData = load();
  dbData.categories = dbData.categories.filter((c) => c !== name);
  persist('categories');
}

// ---------------- Users ----------------
function getUsers() {
  return load().users || [];
}

function getUserByEmail(email) {
  return getUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function getUserById(uid) {
  return getUsers().find((u) => u.id === uid);
}

function addUser(data) {
  const dbData = load();
  if (!dbData.users) dbData.users = [];
  const user = {
    id: id(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  dbData.users.push(user);
  persist('users');
  return user;
}

function updateUser(uid, patch) {
  const dbData = load();
  const idx = dbData.users.findIndex((u) => u.id === uid);
  if (idx === -1) return null;
  dbData.users[idx] = { ...dbData.users[idx], ...patch, id: uid };
  persist('users');
  return dbData.users[idx];
}

function deleteUser(uid) {
  const dbData = load();
  dbData.users = dbData.users.filter((u) => u.id !== uid);
  persist('users');
}

// ---------------- Google OAuth users ----------------
function getUserByGoogleId(googleId) {
  return getUsers().find((u) => u.googleId === googleId);
}

// Find a user by Google profile and create one if needed. Matches on googleId
// first, then on verified email so a Google sign-in links to an existing
// password account instead of creating a duplicate.
function findOrCreateGoogleUser({ googleId, email, name, picture }) {
  const dbData = load();
  if (!dbData.users) dbData.users = [];
  const cleanEmail = String(email || '').trim().toLowerCase();
  const existing =
    getUserByGoogleId(googleId) ||
    dbData.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
  if (existing) {
    const patch = { lastLoginAt: new Date().toISOString() };
    if (!existing.googleId) patch.googleId = googleId;
    if (!existing.provider) patch.provider = 'google';
    if (picture && !existing.picture) patch.picture = picture;
    if (name && (!existing.name || existing.name === existing.email)) patch.name = name;
    return updateUser(existing.id, patch) || existing;
  }
  const user = {
    provider: 'google',
    googleId,
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0],
    picture: picture || null,
    emailVerified: true,
    lastLoginAt: new Date().toISOString(),
  };
  return addUser(user);
}

// ---------------- Testimonials ----------------
function getTestimonials() {
  return load().testimonials || [];
}

module.exports = {
  connect,
  seedAll,
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
  getUsers,
  getUserByEmail,
  getUserById,
  getUserByGoogleId,
  addUser,
  updateUser,
  deleteUser,
  findOrCreateGoogleUser,
  getTestimonials,
};
