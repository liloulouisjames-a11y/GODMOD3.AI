'use strict';
const express = require('express');
const db = require('../db');

const router = express.Router();

// Upsert a contact by phone (used by CRM + inbound webhooks). Exported helper.
function upsertContactByPhone({ phone, name, business_id, source, email }) {
  let contact = phone ? db.prepare('SELECT * FROM contacts WHERE phone=?').get(phone) : null;
  if (contact) {
    db.prepare(
      `UPDATE contacts SET name=COALESCE(?,name), business_id=COALESCE(?,business_id),
       updated_at=datetime('now') WHERE id=?`
    ).run(name || null, business_id || null, contact.id);
    return db.prepare('SELECT * FROM contacts WHERE id=?').get(contact.id);
  }
  const info = db
    .prepare(
      `INSERT INTO contacts(business_id,name,phone,email,source,stage)
       VALUES(?,?,?,?,?, 'new')`
    )
    .run(business_id || null, name || phone || 'Unknown', phone || null, email || null, source || 'manual');
  return db.prepare('SELECT * FROM contacts WHERE id=?').get(info.lastInsertRowid);
}

// List contacts (with last message + unread count) — optional filters.
router.get('/', (req, res) => {
  const { business_id, stage, q } = req.query;
  const filters = [];
  const args = [];
  if (business_id) { filters.push('c.business_id=?'); args.push(business_id); }
  if (stage) { filters.push('c.stage=?'); args.push(stage); }
  if (q) { filters.push('(c.name LIKE ? OR c.phone LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
  const rows = db
    .prepare(
      `SELECT c.*, b.name AS business_name, b.color AS business_color,
        (SELECT body FROM messages m WHERE m.contact_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages m WHERE m.contact_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_at,
        (SELECT COUNT(*) FROM messages m WHERE m.contact_id=c.id AND m.direction='in' AND m.is_read=0) AS unread
       FROM contacts c LEFT JOIN businesses b ON b.id=c.business_id
       ${where}
       ORDER BY COALESCE(last_at, c.created_at) DESC`
    )
    .all(...args);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'not found' });
  const messages = db
    .prepare('SELECT * FROM messages WHERE contact_id=? ORDER BY created_at ASC')
    .all(contact.id);
  const deals = db.prepare('SELECT * FROM deals WHERE contact_id=? ORDER BY created_at DESC').all(contact.id);
  const tasks = db.prepare('SELECT * FROM tasks WHERE contact_id=? ORDER BY done, due_at').all(contact.id);
  res.json({ contact, messages, deals, tasks });
});

router.post('/', (req, res) => {
  const { name, phone, email, business_id, source, stage, notes } = req.body;
  const info = db
    .prepare(
      `INSERT INTO contacts(name,phone,email,business_id,source,stage,notes)
       VALUES(?,?,?,?,?,?,?)`
    )
    .run(name || 'Unknown', phone || null, email || null, business_id || null, source || 'manual', stage || 'new', notes || null);
  res.json(db.prepare('SELECT * FROM contacts WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, phone, email, business_id, stage, notes, tags } = req.body;
  db.prepare(
    `UPDATE contacts SET
       name=COALESCE(?,name), phone=COALESCE(?,phone), email=COALESCE(?,email),
       business_id=COALESCE(?,business_id), stage=COALESCE(?,stage),
       notes=COALESCE(?,notes), tags=COALESCE(?,tags), updated_at=datetime('now')
     WHERE id=?`
  ).run(name, phone, email, business_id, stage, notes, tags, req.params.id);
  res.json(db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id));
});

// Mark a contact's inbound messages as read.
router.post('/:id/read', (req, res) => {
  db.prepare("UPDATE messages SET is_read=1 WHERE contact_id=? AND direction='in'").run(req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
module.exports.upsertContactByPhone = upsertContactByPhone;
