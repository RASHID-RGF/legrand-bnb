// ============================================================
// LeGrand — Server entry point
// ============================================================
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│              ✦  LEGRAND  ✦                  │');
  console.log('│   Discover Exceptional Stays Across Siaya   │');
  console.log('└──────────────────────────────────────────────┘');
  console.log(`  ▶  Site:      http://localhost:${PORT}`);
  console.log(`  ▶  Admin:     http://localhost:${PORT}/admin/login`);
  console.log(`  ▶  API:       http://localhost:${PORT}/api/properties`);
  console.log('  ▶  Demo admin: admin@legrand.co.ke / admin123');
});
