'use strict';
// Twilio-backed WhatsApp + SMS. Falls back to DEMO MODE (simulated send) when
// credentials are absent, so the CRM reply flow works out of the box.
const axios = require('axios');
const config = require('../config');

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

async function twilioSend({ from, to, body }) {
  const url = `${TWILIO_BASE}/Accounts/${config.twilio.accountSid}/Messages.json`;
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const res = await axios.post(url, params, {
    auth: { username: config.twilio.accountSid, password: config.twilio.authToken },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data; // includes sid
}

async function sendSms(to, body) {
  if (!config.configured.twilioSms) {
    if (config.demoMode) return { demo: true, sid: 'DEMO-SMS-' + Date.now() };
    throw new Error('Twilio SMS not configured');
  }
  return twilioSend({ from: config.twilio.smsNumber, to, body });
}

async function sendWhatsApp(to, body) {
  if (!config.configured.twilioWhatsapp) {
    if (config.demoMode) return { demo: true, sid: 'DEMO-WA-' + Date.now() };
    throw new Error('Twilio WhatsApp not configured');
  }
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  return twilioSend({ from: config.twilio.whatsappNumber, to: toAddr, body });
}

// Dispatch by channel. Used by CRM reply endpoint + reminders.
async function send(channel, to, body) {
  if (channel === 'whatsapp') return sendWhatsApp(to, body);
  if (channel === 'sms') return sendSms(to, body);
  throw new Error(`Cannot send on channel: ${channel}`);
}

module.exports = { send, sendSms, sendWhatsApp };
