'use strict';
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(cors({ origin(origin, cb) {
  if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
  return cb(new Error('Origin not allowed'));
}}));
app.use(express.json({ limit: '12kb' }));
app.get('/health', (_req, res) => res.json({ ok: true, configured: Boolean(GROQ_API_KEY) }));
app.post('/api/chat', async (req, res) => {
  if (!GROQ_API_KEY) return res.status(503).json({ error: 'Groq backend is not configured.' });
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt || prompt.length > 8000) return res.status(400).json({ error: 'A prompt of 1–8000 characters is required.' });
  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 450 })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 502;
      console.error('Groq API returned status', upstream.status);
      return res.status(status).json({ error: upstream.status === 429 ? 'AI rate limit reached. Try again shortly.' : 'Groq API request failed.' });
    }
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) return res.status(502).json({ error: 'Groq returned an empty response.' });
    return res.json({ text: text.trim() });
  } catch (err) {
    console.error('Groq backend request failed:', err.message);
    return res.status(502).json({ error: 'Could not reach Groq.' });
  }
});
app.listen(PORT, () => console.log(`Groq proxy listening on ${PORT}`));
