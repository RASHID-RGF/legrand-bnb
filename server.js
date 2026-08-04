// ============================================================
// LeGrand — Server entry point
// ============================================================
require('dotenv').config();
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
      console.log(`  ▶  Admin:     http://localhost:${PORT}/admin/login`);
      console.log(`  ▶  API:       http://localhost:${PORT}/api/properties`);
      console.log('  ▶  Demo admin: admin@legrand.co.ke / admin123');
    });
  } catch (err) {
    console.error('✖  Failed to connect to MongoDB:');
    console.error('   ', err.message);
    console.error('   Check MONGO_URI in your .env file and that your IP is allow-listed in Atlas.');
    process.exit(1);
  }
})();
