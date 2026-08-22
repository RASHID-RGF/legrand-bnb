// ============================================================
// LeGrand — Server entry point
// ============================================================
require('dotenv').config();

// This machine's IPv6 route is unreliable (Google resolves to AAAA first),
// which makes Node's fetch stall with "Connect Timeout Error". Prefer IPv4
// for all outbound connections (MongoDB Atlas, Google OAuth, etc.).
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { ensureWorkingResolver } = require('./src/config/dns');
const app = require('./src/app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 4000;

// ------------------------------------------------------------
// Start serving IMMEDIATELY — don't block on MongoDB.
// The site runs off the local seed cache (see src/config/db.js
// load() fallback) until Atlas connects, so `npm run dev`
// opens in about a second. Mongo then syncs in the background
// and the app switches over to live data automatically.
// ------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│              ✦  LEGRAND  ✦                  │');
  console.log('│   Discover Exceptional Stays Across Siaya   │');
  console.log('└──────────────────────────────────────────────┘');
  console.log(`  ▶  Site:      http://localhost:${PORT}`);
  console.log(`  ▶  API:       http://localhost:${PORT}/api/properties`);
  console.log('  ▶  Mongo:     connecting in the background… (site is live meanwhile)');
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

// Retry the Mongo connection a few times — this machine's path to Atlas is
// intermittently slow and a single attempt can stall past the timeout.
async function connectWithRetry(attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await db.connect();
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      console.warn(`[boot] Mongo connect attempt ${attempt} failed — retrying... (${err.message})`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// Background connect: never takes the site down. If Atlas is unreachable the
// app keeps serving the local seed data, just without persistence. Note that
// any writes made before the connection lands (e.g. a contact form in the
// first seconds) live only in memory and are replaced once Mongo syncs.
(async () => {
  try {
    // App-level DNS workaround (idempotent): switches to public DNS only
    // when the system resolver is unreachable. db.connect() also calls it.
    await ensureWorkingResolver();
    await connectWithRetry();
    console.log(`  ▶  Mongo:     ${process.env.MONGO_DB || 'legrand'} database connected — now serving live data`);
  } catch (err) {
    console.error('✖  Could not connect to MongoDB.');
    console.error('   ', err.message);
    console.error('   The site is still running on local seed data, but changes will not be saved.');
    console.error('   Check MONGO_URI in your .env file and that your IP is allow-listed in Atlas.');
  }
})();
