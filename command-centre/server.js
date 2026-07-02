'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');

const config = require('./src/config');
const db = require('./src/db');
const seed = require('./src/seed'); // runs seeding on require
const { login, requireApiAuth, requirePageAuth } = require('./src/auth');
const scheduler = require('./src/scheduler');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 12 }, // 12h
  })
);

// Serve uploaded media publicly (needed so social APIs can pull image/video URLs).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Public webhooks (Twilio) — no auth ----
app.use('/webhooks', require('./src/routes/webhooks'));

// ---- Auth ----
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = login(username, password);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  req.session.user = user;
  res.json({ ok: true, user });
});
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) return res.json({ user: req.session.user });
  res.status(401).json({ error: 'unauthorized' });
});

// ---- Protected API ----
app.use('/api/dashboard', requireApiAuth, require('./src/routes/dashboard'));
app.use('/api/contacts', requireApiAuth, require('./src/routes/contacts'));
app.use('/api/messages', requireApiAuth, require('./src/routes/messages'));
app.use('/api/posts', requireApiAuth, require('./src/routes/posts'));
app.use('/api/appointments', requireApiAuth, require('./src/routes/appointments'));
app.use('/api/tasks', requireApiAuth, require('./src/routes/tasks'));
app.use('/api/command', requireApiAuth, require('./src/routes/command'));

// ---- Public booking API (no auth — used by public booking page) ----
const apptRoutes = require('./src/routes/appointments');
app.get('/api/public/services', (req, res) => {
  const { business_id } = req.query;
  const rows = business_id
    ? db.prepare('SELECT id,name,duration_min,price FROM services WHERE business_id=?').all(business_id)
    : db.prepare('SELECT id,name,duration_min,price,business_id FROM services').all();
  res.json(rows);
});
app.get('/api/public/businesses', (req, res) => {
  res.json(db.prepare('SELECT id,name,slug,color FROM businesses').all());
});
app.post('/api/public/book', async (req, res) => {
  try {
    const appt = await apptRoutes.createAppointment({ ...req.body });
    res.json({ ok: true, appointment: appt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- Pages ----
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/book', (req, res) => res.sendFile(path.join(__dirname, 'public', 'book.html')));
app.get('/', requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Boot ----
app.listen(config.port, () => {
  console.log('\n============================================================');
  console.log('  COMMAND CENTRE is running');
  console.log(`  Dashboard:     ${config.publicBaseUrl}/`);
  console.log(`  Booking page:  ${config.publicBaseUrl}/book`);
  console.log(`  Login:         ${config.admin.username} / (your ADMIN_PASSWORD)`);
  console.log(`  DEMO MODE:     ${config.demoMode ? 'ON (integrations simulated)' : 'OFF'}`);
  console.log('============================================================\n');
  scheduler.start();
});
