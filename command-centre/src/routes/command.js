'use strict';
// Lightweight natural-language command bar (rule/regex based — no LLM needed).
// Supported examples:
//   "post tomorrow at 9am to all platforms: New arrivals this week!"
//   "post today 18:00 to facebook,instagram: Solar savings 🌞"
//   "create lead John from whatsapp +23057123456"
//   "add task Call Priya tomorrow"
const express = require('express');
const db = require('../db');
const { upsertContactByPhone } = require('./contacts');

const router = express.Router();

const ALL_PLATFORMS = ['facebook', 'instagram', 'tiktok', 'youtube'];

function parseWhen(text) {
  const now = new Date();
  let base = new Date(now);
  if (/tomorrow/i.test(text)) base.setDate(base.getDate() + 1);
  const t = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let hh = 9, mm = 0;
  if (t) {
    hh = parseInt(t[1], 10);
    mm = t[2] ? parseInt(t[2], 10) : 0;
    if (t[3]) {
      if (/pm/i.test(t[3]) && hh < 12) hh += 12;
      if (/am/i.test(t[3]) && hh === 12) hh = 0;
    }
  }
  base.setHours(hh, mm, 0, 0);
  return base;
}

router.post('/', (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty command' });
  const lower = text.toLowerCase();

  // --- POST scheduling ---
  if (lower.startsWith('post')) {
    let platforms = ALL_PLATFORMS;
    const toMatch = text.match(/to\s+([a-z, ]+?)(?::|$| at | on | tomorrow| today)/i);
    if (toMatch && !/all/i.test(toMatch[1])) {
      platforms = toMatch[1].split(',').map((s) => s.trim().toLowerCase()).filter((p) => ALL_PLATFORMS.includes(p));
    }
    if (!platforms.length) platforms = ALL_PLATFORMS;
    const caption = text.includes(':') ? text.split(':').slice(1).join(':').trim() : '';
    const when = parseWhen(text);
    const ins = db.prepare(
      `INSERT INTO posts(business_id,platform,caption,media_type,scheduled_at,status)
       VALUES(NULL,?,?, 'text', ?, 'scheduled')`
    );
    const created = platforms.map((p) => {
      const info = ins.run(p, caption, when.toISOString());
      return db.prepare('SELECT * FROM posts WHERE id=?').get(info.lastInsertRowid);
    });
    return res.json({ action: 'scheduled_posts', when: when.toISOString(), platforms, created });
  }

  // --- CREATE LEAD ---
  if (/^(create|add)\s+lead/i.test(text)) {
    const phone = (text.match(/\+?\d[\d\s]{6,}/) || [null])[0];
    const nameMatch = text.match(/lead\s+([A-Za-z ]+?)(?:\s+from|\s+\+|\s*$)/i);
    const source = (text.match(/from\s+(whatsapp|sms|call|manual)/i) || [null, 'manual'])[1];
    const contact = upsertContactByPhone({
      phone: phone ? phone.replace(/\s/g, '') : null,
      name: nameMatch ? nameMatch[1].trim() : 'New Lead',
      source: source.toLowerCase(),
    });
    return res.json({ action: 'created_lead', contact });
  }

  // --- ADD TASK ---
  if (/^add\s+task/i.test(text)) {
    const title = text.replace(/^add\s+task/i, '').trim();
    const due = /tomorrow|today|\d/.test(title) ? parseWhen(title).toISOString() : null;
    const info = db.prepare('INSERT INTO tasks(title,due_at) VALUES(?,?)').run(title, due);
    return res.json({ action: 'created_task', task: db.prepare('SELECT * FROM tasks WHERE id=?').get(info.lastInsertRowid) });
  }

  return res.status(422).json({
    error: 'Command not understood',
    hint: 'Try: "post tomorrow at 9am to all platforms: ...", "create lead John from whatsapp +230...", "add task Call client tomorrow"',
  });
});

module.exports = router;
