// ============================================================
// LeGrand — Server entry point
// ============================================================
require('dotenv').config();

// This machine's IPv6 route is unreliable (Google resolves to AAAA first),
// which makes Node's fetch stall with "Connect Timeout Error". Prefer IPv4
// for all outbound connections (MongoDB Atlas, Google OAuth, etc.).
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const app = require('./src/app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await db.connect();
    app.listen(PORT, () => {
      console.log('┌──────────────────────────────────────────────┐');
      console.log('│              ✦  LEGRAND  ✦                  │');
      console.log('│   Discover Exceptional Stays Across Siaya   │');
      console.log('└──────────────────────────────────────────────┘');
      console.log(`  ▶  Mongo:     ${process.env.MONGO_DB || 'legrand'} database connected`);
      console.log(`  ▶  Site:      http://localhost:${PORT}`);
      console.log(`  ▶  API:       http://localhost:${PORT}/api/properties`);
    });
  } catch (err) {
    console.error('✖  Failed to connect to MongoDB:');
    console.error('   ', err.message);
    console.error('   Check MONGO_URI in your .env file and that your IP is allow-listed in Atlas.');
    process.exit(1);
  }
})();
