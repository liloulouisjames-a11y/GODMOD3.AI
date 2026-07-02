'use strict';
// Background jobs: publish due posts, send 24h appointment reminders,
// and (demo) refresh engagement numbers.
const cron = require('node-cron');
const db = require('./db');
const config = require('./config');
const { publishPost } = require('./routes/posts');
const messaging = require('./services/messaging');

// Publish any scheduled post whose time has arrived. Runs every minute.
async function publishDuePosts() {
  const due = db
    .prepare(
      `SELECT * FROM posts
       WHERE status='scheduled' AND scheduled_at IS NOT NULL
       AND datetime(scheduled_at) <= datetime('now')`
    )
    .all();
  for (const post of due) {
    const out = await publishPost(post);
    console.log(`[scheduler] post #${post.id} (${post.platform}) → ${out.ok ? 'published' : 'FAILED: ' + out.error}`);
  }
}

// Send WhatsApp/SMS reminders ~24h before an appointment. Runs every 15 min.
async function sendReminders() {
  const due = db
    .prepare(
      `SELECT a.*, c.phone, c.name FROM appointments a
       JOIN contacts c ON c.id=a.contact_id
       WHERE a.status='booked' AND a.reminder_sent=0 AND c.phone IS NOT NULL
       AND datetime(a.starts_at) BETWEEN datetime('now') AND datetime('now','+24 hours')`
    )
    .all();
  for (const appt of due) {
    const when = new Date(appt.starts_at).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' });
    const body = `Reminder: your appointment "${appt.title}" is on ${when}. Reply to reschedule.`;
    try {
      const channel = config.configured.twilioWhatsapp ? 'whatsapp' : 'sms';
      await messaging.send(channel, appt.phone, body);
      db.prepare('UPDATE appointments SET reminder_sent=1 WHERE id=?').run(appt.id);
      db.prepare(
        `INSERT INTO messages(contact_id,channel,direction,body,is_read) VALUES(?,?, 'out', ?, 1)`
      ).run(appt.contact_id, channel, body);
      console.log(`[scheduler] reminder sent for appt #${appt.id}`);
    } catch (e) {
      console.warn(`[scheduler] reminder failed for appt #${appt.id}: ${e.message}`);
    }
  }
}

// In demo mode, gently grow engagement numbers on published posts so the
// charts have data to show. No-op when real APIs are wired (fetch instead).
function refreshEngagementDemo() {
  if (!config.demoMode) return;
  const published = db.prepare("SELECT * FROM posts WHERE status='published'").all();
  const upsert = db.prepare(
    `INSERT INTO engagement(post_id,platform,likes,comments,shares,views)
     VALUES(?,?,?,?,?,?)`
  );
  const seed = (id, salt) => ((id * 2654435761 + salt) % 97); // deterministic pseudo-random
  for (const p of published) {
    const existing = db.prepare('SELECT id FROM engagement WHERE post_id=?').get(p.id);
    if (existing) continue;
    upsert.run(p.id, p.platform, seed(p.id, 3) + 20, seed(p.id, 7) % 20, seed(p.id, 11) % 10, seed(p.id, 13) * 5 + 100);
  }
}

function start() {
  cron.schedule('* * * * *', () => publishDuePosts().catch((e) => console.error(e)));
  cron.schedule('*/15 * * * *', () => sendReminders().catch((e) => console.error(e)));
  cron.schedule('*/10 * * * *', () => refreshEngagementDemo());
  // Run once shortly after boot.
  setTimeout(() => {
    publishDuePosts().catch(() => {});
    refreshEngagementDemo();
  }, 3000);
  console.log('[scheduler] started (posts:1m, reminders:15m)');
}

module.exports = { start, publishDuePosts, sendReminders };
