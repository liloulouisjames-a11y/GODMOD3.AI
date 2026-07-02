'use strict';
const express = require('express');
const db = require('../db');
const calendar = require('../services/calendar');
const { upsertContactByPhone } = require('./contacts');

const router = express.Router();

router.get('/services', (req, res) => {
  const { business_id } = req.query;
  const rows = business_id
    ? db.prepare('SELECT * FROM services WHERE business_id=?').all(business_id)
    : db.prepare('SELECT s.*, b.name AS business_name FROM services s JOIN businesses b ON b.id=s.business_id').all();
  res.json(rows);
});

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, c.name AS contact_name, c.phone AS contact_phone,
              s.name AS service_name, b.name AS business_name, b.color AS business_color
       FROM appointments a
       LEFT JOIN contacts c ON c.id=a.contact_id
       LEFT JOIN services s ON s.id=a.service_id
       LEFT JOIN businesses b ON b.id=a.business_id
       ORDER BY a.starts_at ASC`
    )
    .all();
  res.json(rows);
});

// Create an appointment (dashboard or public booking). Syncs to Google Calendar.
async function createAppointment(payload) {
  let { business_id, contact_id, service_id, name, phone, starts_at, notes } = payload;
  if (!starts_at) throw new Error('starts_at required');

  if (!contact_id && phone) {
    contact_id = upsertContactByPhone({ phone, name, business_id, source: 'booking' }).id;
  }
  const service = service_id ? db.prepare('SELECT * FROM services WHERE id=?').get(service_id) : null;
  const duration = service ? service.duration_min : 60;
  const start = new Date(starts_at);
  const end = new Date(start.getTime() + duration * 60000);

  // Double-booking guard within the same business.
  const clash = db
    .prepare(
      `SELECT COUNT(*) c FROM appointments
       WHERE business_id=? AND status='booked'
       AND datetime(starts_at) < datetime(?) AND datetime(ends_at) > datetime(?)`
    )
    .get(business_id, end.toISOString(), start.toISOString()).c;
  if (clash > 0) throw new Error('Time slot clashes with an existing appointment');

  const title = service ? service.name : payload.title || 'Appointment';
  let googleEventId = null;
  try {
    const ev = await calendar.createEvent({
      summary: `${title} — ${name || 'Client'}`,
      description: notes || '',
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
    googleEventId = ev.id;
  } catch (e) {
    // Calendar failure shouldn't block the local booking.
    googleEventId = null;
  }

  const info = db
    .prepare(
      `INSERT INTO appointments(business_id,contact_id,service_id,title,starts_at,ends_at,status,google_event_id,notes)
       VALUES(?,?,?,?,?,?, 'booked', ?, ?)`
    )
    .run(business_id || null, contact_id || null, service_id || null, title, start.toISOString(), end.toISOString(), googleEventId, notes || null);
  return db.prepare('SELECT * FROM appointments WHERE id=?').get(info.lastInsertRowid);
}

router.post('/', async (req, res) => {
  try {
    res.json(await createAppointment(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE appointments SET status=? WHERE id=?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id));
});

router.delete('/:id', async (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (appt && appt.google_event_id) {
    try { await calendar.deleteEvent(appt.google_event_id); } catch (_) {}
  }
  db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
module.exports.createAppointment = createAppointment;
