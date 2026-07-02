'use strict';
const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const social = require('../services/social');
const config = require('../config');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, '_')}`),
});
const upload = multer({ storage });

// Create/schedule a post. Accepts multipart (media) or JSON.
// fields: business_id, platform(s), caption, scheduled_at, media_type
router.post('/', upload.single('media'), (req, res) => {
  const { business_id, caption, scheduled_at, media_type } = req.body;
  let platforms = req.body.platforms || req.body.platform;
  if (typeof platforms === 'string') platforms = platforms.split(',').map((s) => s.trim());
  if (!Array.isArray(platforms) || !platforms.length) {
    return res.status(400).json({ error: 'platform(s) required' });
  }
  const mediaPath = req.file ? `/uploads/${req.file.filename}` : null;
  const type = media_type || (req.file ? (/(mp4|mov|avi)$/i.test(req.file.filename) ? 'video' : 'image') : 'text');
  const ins = db.prepare(
    `INSERT INTO posts(business_id,platform,caption,media_path,media_type,scheduled_at,status)
     VALUES(?,?,?,?,?,?, 'scheduled')`
  );
  const created = [];
  for (const platform of platforms) {
    const info = ins.run(business_id || null, platform, caption || '', mediaPath, type, scheduled_at || null);
    created.push(db.prepare('SELECT * FROM posts WHERE id=?').get(info.lastInsertRowid));
  }
  res.json(created);
});

// List posts (calendar feed). Optional status/business filter.
router.get('/', (req, res) => {
  const { status, business_id } = req.query;
  const filters = [];
  const args = [];
  if (status) { filters.push('p.status=?'); args.push(status); }
  if (business_id) { filters.push('p.business_id=?'); args.push(business_id); }
  const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
  const rows = db
    .prepare(
      `SELECT p.*, b.name AS business_name, b.color AS business_color
       FROM posts p LEFT JOIN businesses b ON b.id=p.business_id
       ${where} ORDER BY COALESCE(p.scheduled_at, p.created_at) ASC`
    )
    .all(...args);
  res.json(rows);
});

// Publish a post immediately (also used by the scheduler).
async function publishPost(post) {
  try {
    const mediaUrl = post.media_path ? `${config.publicBaseUrl}${post.media_path}` : null;
    const result = await social.publish(post.platform, { caption: post.caption, mediaUrl });
    db.prepare(
      `UPDATE posts SET status='published', external_id=?, published_at=datetime('now'), error=NULL WHERE id=?`
    ).run(result.externalId || null, post.id);
    return { ok: true, result };
  } catch (err) {
    db.prepare(`UPDATE posts SET status='failed', error=? WHERE id=?`).run(err.message, post.id);
    return { ok: false, error: err.message };
  }
}

router.post('/:id/publish', async (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'not found' });
  const out = await publishPost(post);
  res.json({ ...out, post: db.prepare('SELECT * FROM posts WHERE id=?').get(post.id) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Posting schedule config (2 slots/day per platform).
router.get('/schedule/config', (req, res) => {
  res.json(db.prepare('SELECT * FROM post_schedule ORDER BY platform, slot').all());
});
router.put('/schedule/config', (req, res) => {
  const { updates } = req.body; // [{id, time_hhmm}]
  const stmt = db.prepare('UPDATE post_schedule SET time_hhmm=? WHERE id=?');
  (updates || []).forEach((u) => stmt.run(u.time_hhmm, u.id));
  res.json(db.prepare('SELECT * FROM post_schedule ORDER BY platform, slot').all());
});

module.exports = router;
module.exports.publishPost = publishPost;
