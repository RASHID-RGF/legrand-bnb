// ============================================================
// LeGrand — JSON API routes
// ============================================================
const express = require('express');
const db = require('../config/db');
const { applyFilters } = require('./public');
const { requireUserAuth } = require('../middleware/auth');
const { sendContactNotification, sendContactConfirmation } = require('../config/mail');

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
router.post('/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  const cleanName = String(name).slice(0, 120);
  const cleanEmail = String(email).slice(0, 120);
  const cleanPhone = String(phone || '').slice(0, 40);
  const cleanMessage = String(message).slice(0, 4000);

  const enquiry = db.addEnquiry({
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    subject: 'Contact Form Enquiry',
    message: cleanMessage,
    emailStatus: { notification: 'pending', confirmation: 'pending' },
  });

  // Send emails and record status in the database
  (async () => {
    try {
      const [notifResult, confirmResult] = await Promise.all([
        sendContactNotification({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          subject: 'Contact Form Enquiry',
          message: cleanMessage,
        }),
        sendContactConfirmation({ name: cleanName, email: cleanEmail }),
      ]);

      db.updateEnquiry(enquiry.id, {
        emailStatus: {
          notification: notifResult.ok ? 'sent' : 'failed',
          notificationId: notifResult.id || null,
          notificationError: notifResult.error || null,
          confirmation: confirmResult.ok ? 'sent' : 'failed',
          confirmationId: confirmResult.id || null,
          confirmationError: confirmResult.error || null,
          sentAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('[api] Email send failed:', err.message);
      db.updateEnquiry(enquiry.id, {
        emailStatus: {
          notification: 'failed',
          confirmation: 'failed',
          error: err.message,
          sentAt: new Date().toISOString(),
        },
      });
    }
  })();

  res.status(201).json({ ok: true, id: enquiry.id });
});

module.exports = router;
