'use strict';
const express = require('express');
const db = require('../db');
const messaging = require('../services/messaging');
const { upsertContactByPhone } = require('./contacts');

const router = express.Router();

// Log a message (manual entry — e.g. from Microsoft Phone Link) or record a call.
// body: { contact_id?, phone?, name?, business_id?, channel, direction, body, meta? }
router.post('/log', (req, res) => {
  let { contact_id, phone, name, business_id, channel, direction, body, meta } = req.body;
  if (!channel || !direction) return res.status(400).json({ error: 'channel and direction required' });
  if (!contact_id) {
    if (!phone) return res.status(400).json({ error: 'contact_id or phone required' });
    contact_id = upsertContactByPhone({ phone, name, business_id, source: channel }).id;
  }
  const info = db
    .prepare(
      `INSERT INTO messages(contact_id,channel,direction,body,meta,is_read)
       VALUES(?,?,?,?,?,?)`
    )
    .run(contact_id, channel, direction, body || '', meta ? JSON.stringify(meta) : null, direction === 'out' ? 1 : 0);
  res.json(db.prepare('SELECT * FROM messages WHERE id=?').get(info.lastInsertRowid));
});

// Reply to a contact on a channel — actually sends via Twilio (or demo).
// body: { contact_id, channel, body }
router.post('/reply', async (req, res) => {
  const { contact_id, channel, body } = req.body;
  const contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(contact_id);
  if (!contact) return res.status(404).json({ error: 'contact not found' });
  if (!contact.phone) return res.status(400).json({ error: 'contact has no phone' });
  if (!body) return res.status(400).json({ error: 'body required' });
  try {
    const result = await messaging.send(channel, contact.phone, body);
    const info = db
      .prepare(
        `INSERT INTO messages(contact_id,channel,direction,body,meta,is_read)
         VALUES(?,?, 'out', ?, ?, 1)`
      )
      .run(contact_id, channel, body, JSON.stringify(result));
    res.json({
      message: db.prepare('SELECT * FROM messages WHERE id=?').get(info.lastInsertRowid),
      demo: !!result.demo,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Mark a conversation as a SALE with revenue attribution.
// body: { contact_id, amount, title? }
router.post('/sale', (req, res) => {
  const { contact_id, amount, title } = req.body;
  const contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(contact_id);
  if (!contact) return res.status(404).json({ error: 'contact not found' });
  const info = db
    .prepare(
      `INSERT INTO deals(contact_id,business_id,title,amount,status,closed_at)
       VALUES(?,?,?,?, 'won', datetime('now'))`
    )
    .run(contact_id, contact.business_id, title || 'Sale', Math.round(Number(amount) || 0));
  db.prepare("UPDATE contacts SET stage='won', updated_at=datetime('now') WHERE id=?").run(contact_id);
  res.json(db.prepare('SELECT * FROM deals WHERE id=?').get(info.lastInsertRowid));
});

// Unified inbox — most recent inbound-first across all contacts.
router.get('/inbox', (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.*, c.name AS contact_name, c.phone AS contact_phone, c.business_id,
              b.name AS business_name, b.color AS business_color
       FROM messages m
       JOIN contacts c ON c.id=m.contact_id
       LEFT JOIN businesses b ON b.id=c.business_id
       ORDER BY m.created_at DESC LIMIT 100`
    )
    .all();
  res.json(rows);
});

module.exports = router;
