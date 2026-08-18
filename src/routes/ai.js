// ============================================================
// LeGrand — AI concierge API (public, no sign-in required)
// ============================================================
const express = require('express');
const ai = require('../config/ai');

const router = express.Router();

// Simple in-memory per-IP rate limit (30 requests / 10 minutes)
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > rec.resetAt) {
    rec.count = 0;
    rec.resetAt = now + RATE_WINDOW_MS;
  }
  rec.count += 1;
  hits.set(ip, rec);
  // Keep the map from growing forever
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }
  return rec.count > RATE_MAX;
}

router.post('/chat', async (req, res) => {
  if (!ai.isEnabled()) {
    return res.status(503).json({ error: 'The AI assistant is not configured yet.' });
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const raw = Array.isArray(req.body.messages) ? req.body.messages : null;
  if (!raw || !raw.length) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  // Normalize + cap history, keep only the most recent messages
  const messages = raw
    .slice(-12)
    .map((m) => ({
      role: m && m.role === 'assistant' ? 'assistant' : 'user',
      text: String((m && m.text) || '').slice(0, 1000),
    }))
    .filter((m) => m.text.trim().length > 0);

  if (!messages.length || !messages[messages.length - 1].text.trim()) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  try {
    const reply = await ai.chat({ messages });
    res.json({ reply });
  } catch (err) {
    console.error('[ai] chat failed:', err.message);
    res.status(502).json({ error: 'The AI assistant hit an error — please try again in a moment.' });
  }
});

// Anything else under /api/ai (wrong method or unknown path) — clean 404,
// so requests never fall through to the auth-gated /api router.
router.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = router;
