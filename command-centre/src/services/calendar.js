'use strict';
// Google Calendar sync via OAuth refresh token. Degrades to a no-op (returns a
// local pseudo event id) in DEMO MODE so appointment booking still works.
const axios = require('axios');
const config = require('../config');

let cachedToken = { value: null, expiresAt: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken.value && now < cachedToken.expiresAt - 60000) return cachedToken.value;
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    refresh_token: config.google.refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await axios.post('https://oauth2.googleapis.com/token', params);
  cachedToken = {
    value: res.data.access_token,
    expiresAt: now + res.data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function createEvent({ summary, description, startIso, endIso, timeZone = 'Indian/Mauritius' }) {
  if (!config.configured.google) {
    if (config.demoMode) return { id: 'DEMO-GCAL-' + Date.now(), demo: true };
    throw new Error('Google Calendar not configured');
  }
  const token = await getAccessToken();
  const res = await axios.post(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.google.calendarId)}/events`,
    {
      summary,
      description,
      start: { dateTime: startIso, timeZone },
      end: { dateTime: endIso, timeZone },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return { id: res.data.id };
}

async function deleteEvent(eventId) {
  if (!config.configured.google || !eventId || String(eventId).startsWith('DEMO-')) return;
  const token = await getAccessToken();
  await axios.delete(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      config.google.calendarId
    )}/events/${eventId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

module.exports = { createEvent, deleteEvent };
