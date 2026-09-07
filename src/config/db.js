// ============================================================
// LeGrand — MySQL (MariaDB) data layer
// All data lives in a local MySQL/MariaDB database. The module
// keeps the exact same synchronous API the routes were written
// against, backed by an in-memory cache that mirrors the tables;
// every mutation is written through to MySQL immediately.
//
// Schema: one table per collection with a JSON `data` column.
// Documents keep their app-level `id` field (indexed & unique),
// so lookups and writes stay identical to the previous store.
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const { seedDatabase } = require('../data/seed');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'legrand';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DB = process.env.MYSQL_DB || 'legrand';

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

let pool = null;
let cache = null;
let connected = false;

// ---------------- Connection, seeding, cache ----------------
async function connect() {
  if (!MYSQL_PASSWORD && !process.env.MYSQL_ALLOW_EMPTY) {
    throw new Error('MYSQL_PASSWORD is missing — add it to your .env file.');
  }
  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
    // MariaDB auth plugins (unix_socket etc.) are handled automatically;
    // keep unicode safe end-to-end.
    charset: 'utf8mb4',
  });

  // Fail fast if the database/user is not reachable.
  await pool.query('SELECT 1');
  connected = true;

  await ensureTables();
  await ensureSeeded();
  await reloadCache();
  return pool;
}

async function ensureTables() {
  // Unique key on `doc_id` makes duplicate documents impossible even if
  // two processes (e.g. `node --watch` restarts) ever write at the same time.
  for (const name of COLLECTIONS) {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS \`${name}\` (
         seq BIGINT AUTO_INCREMENT PRIMARY KEY,
         doc_id VARCHAR(64) NULL,
         data JSON NOT NULL,
         UNIQUE KEY uniq_doc (\`doc_id\`)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  }
  // Extra unique index for user emails (case-sensitive compare happens in
  // app code, same as before; this just blocks exact duplicates).
  // MariaDB syntax: index over a PERSISTENT virtual column (MySQL 8's
  // functional-index syntax is not supported here).
  try {
    await pool.query(
      "ALTER TABLE users ADD COLUMN email_vc VARCHAR(255) AS (JSON_UNQUOTE(JSON_EXTRACT(data, '$.email'))) PERSISTENT, ADD UNIQUE KEY uniq_user_email (email_vc)"
    );
  } catch (err) {
    // 1060 = column exists, 1061 = index exists (already migrated) — safe.
    if (err.errno !== 1060 && err.errno !== 1061) {
      console.error('[mysql] could not create users.email index:', err.message);
    }
  }
}

// Seed ONLY when the database is completely empty — never clobber
// existing data. Existing db.json is migrated on first run so no data
// is lost (the old demo visitor account is dropped).
async function ensureSeeded() {
  const [[{ total }]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM properties) + (SELECT COUNT(*) FROM users) AS total`
  );
  if (total > 0) return;

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
  console.log(`[mysql] database "${MYSQL_DB}" seeded`);
}

async function reloadCache() {
  const fresh = {};
  for (const name of COLLECTIONS) {
    const [rows] = await pool.query(
      `SELECT data FROM \`${name}\` ORDER BY seq ASC`
    );
    const docs = rows.map((r) => normalizeRow(r.data));
    if (name === 'categories') {
      fresh[name] = docs.map((d) => d.name);
    } else if (name === 'settings') {
      fresh[name] = (docs[0] && docs[0].data) || {};
    } else {
      fresh[name] = docs;
    }
  }
  cache = fresh;
}

// JSON column values can arrive as strings depending on driver/config.
function normalizeRow(value) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function writeCollection(name, docs) {
  await pool.query(`DELETE FROM \`${name}\``);
  if (name === 'categories') {
    if (Array.isArray(docs) && docs.length) {
      const values = docs.filter(Boolean).map((d) => [null, JSON.stringify({ name: d })]);
      if (values.length) {
        await pool.query(
          `INSERT INTO \`${name}\` (doc_id, data) VALUES ?`,
          [values]
        );
      }
    }
  } else if (name === 'settings') {
    if (docs && Object.keys(docs).length) {
      await pool.query(`INSERT INTO \`${name}\` (doc_id, data) VALUES (?, ?)`, [
        'settings',
        JSON.stringify({ data: docs }),
      ]);
    }
  } else if (Array.isArray(docs) && docs.length) {
    const values = docs.map((d) => [d && d.id ? String(d.id) : null, JSON.stringify(d)]);
    await pool.query(`INSERT INTO \`${name}\` (doc_id, data) VALUES ?`, [values]);
  }
}

// Serialize writes per collection so DELETE+INSERT from concurrent
// mutations never interleave (which would duplicate documents).
const writeQueues = {};

function persist(name) {
  if (!connected || !pool || !cache) return Promise.resolve();
  const prev = writeQueues[name] || Promise.resolve();
  const next = prev
    .then(() => writeCollection(name, cache[name]))
    .catch((err) => console.error(`[mysql] failed to save "${name}":`, err.message));
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
  const idx = load().enquiries.findIndex((e) => e.id === eid);
  if (idx === -1) return null;
  load().enquiries[idx] = { ...load().enquiries[idx], ...data, id: eid };
  persist('enquiries');
  return load().enquiries[idx];
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
