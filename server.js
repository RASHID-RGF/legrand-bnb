// ============================================================
// LeGrand — Server entry point
// ============================================================
require('dotenv').config();

// This machine's IPv6 route is unreliable (Google resolves to AAAA first),
// which makes Node's fetch stall with "Connect Timeout Error". Prefer IPv4
// for all outbound connections (Google OAuth, etc.).
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { ensureWorkingResolver } = require('./src/config/dns');
const app = require('./src/app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 4000;
const MYSQL_DB_NAME = process.env.MYSQL_DB || 'legrand';

// ------------------------------------------------------------
// Start serving IMMEDIATELY — don't block on MySQL.
// The site runs off the local seed cache (see src/config/db.js
// load() fallback) until MariaDB connects, so `npm run dev`
// opens in about a second. MySQL then syncs in the background
// and the app switches over to live data automatically.
// ------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│              ✦  LEGRAND  ✦                  │');
  console.log('│   Discover Exceptional Stays Across Siaya   │');
  console.log('└──────────────────────────────────────────────┘');
  console.log(`  ▶  Site:      http://localhost:${PORT}`);
  console.log(`  ▶  API:       http://localhost:${PORT}/api/properties`);
  console.log('  ▶  MySQL:     connecting in the background… (site is live meanwhile)');
});

// Friendly message instead of a raw stack trace when the port is already
// taken (e.g. a second `npm run dev`, or a leftover server process).
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✖  Port ${PORT} is already in use.`);
    console.error('   Stop the other server first, or set a different PORT in .env.');
    process.exit(1);
  }
  throw err;
});

// ------------------------------------------------------------
// Background connect: never takes the site down. If MySQL is unreachable the
// app keeps serving the local seed data, just without persistence. Note that
// any writes made before the connection lands (e.g. a contact form in the
// first seconds) live only in memory and are replaced once MySQL syncs.
(async () => {
  try {
    // App-level DNS workaround (idempotent): switches to public DNS only
    // when the system resolver is unreachable. db.connect() also calls it.
    await ensureWorkingResolver();
    // ensureConnected retries a few times, then throws; it is also the entry
    // point used by the serverless deployment (api/index.js).
    await db.ensureConnected();
    console.log(`  ▶  MySQL:     ${MYSQL_DB_NAME} database connected — now serving live data`);
  } catch (err) {
    console.error('✖  Could not connect to MySQL/MariaDB.');
    console.error('   ', err.message);
    console.error('   The site is still running on local seed data, but changes will not be saved.');
    console.error('   Check MYSQL_URL (or MYSQL_*) in your .env file and that MariaDB is running.');
  }
})();
