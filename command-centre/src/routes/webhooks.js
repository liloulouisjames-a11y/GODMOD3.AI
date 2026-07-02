'use strict';
// Public (no-auth) endpoints Twilio calls when SMS/WhatsApp arrive.
// Point your Twilio number's "A MESSAGE COMES IN" webhook to:
//   {PUBLIC_BASE_URL}/webhooks/twilio/sms         (SMS)
//   {PUBLIC_BASE_URL}/webhooks/twilio/whatsapp     (WhatsApp)
// Use a tunnel (ngrok/cloudflared) to expose your laptop.
const express = require('express');
const db = require('../db');
const { upsertContactByPhone } = require('./contacts');

const router = express.Router();

function ingest(channel, req, res) {
  const from = (req.body.From || '').replace('whatsapp:', '');
  const body = req.body.Body || '';
  const profileName = req.body.ProfileName || null;
  if (from) {
    const contact = upsertContactByPhone({ phone: from, name: profileName, source: channel });
    db.prepare(
      `INSERT INTO messages(contact_id,channel,direction,body,meta,is_read)
       VALUES(?,?, 'in', ?, ?, 0)`
    ).run(contact.id, channel, body, JSON.stringify({ sid: req.body.MessageSid || null }));
  }
  // Empty TwiML — we reply from the dashboard, not auto-response.
  res.set('Content-Type', 'text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
}

router.post('/twilio/sms', (req, res) => ingest('sms', req, res));
router.post('/twilio/whatsapp', (req, res) => ingest('whatsapp', req, res));

// Twilio voice status callback — logs completed calls.
router.post('/twilio/voice', (req, res) => {
  const from = (req.body.From || '').replace('whatsapp:', '');
  const duration = req.body.CallDuration || '0';
  const direction = req.body.Direction && req.body.Direction.includes('outbound') ? 'out' : 'in';
  if (from) {
    const contact = upsertContactByPhone({ phone: from, source: 'call' });
    db.prepare(
      `INSERT INTO messages(contact_id,channel,direction,body,meta,is_read)
       VALUES(?, 'call', ?, ?, ?, 0)`
    ).run(contact.id, direction, `Call — ${duration}s`, JSON.stringify({ sid: req.body.CallSid, duration }));
  }
  res.set('Content-Type', 'text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});

module.exports = router;
