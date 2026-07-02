'use strict';
const express = require('express');
const db = require('../db');
const config = require('../config');

const router = express.Router();

router.get('/businesses', (req, res) => {
  res.json(db.prepare('SELECT * FROM businesses ORDER BY id').all());
});

// Integration/connection status for the settings panel.
router.get('/status', (req, res) => {
  res.json({
    demoMode: config.demoMode,
    integrations: config.configured,
    publicBaseUrl: config.publicBaseUrl,
  });
});

// Everything the dashboard needs in one call.
router.get('/summary', (req, res) => {
  const businesses = db.prepare('SELECT * FROM businesses ORDER BY id').all();

  // Revenue per business — this month + today, from won deals.
  const revByBiz = businesses.map((b) => {
    const month = db
      .prepare(
        `SELECT COALESCE(SUM(amount),0) v FROM deals
         WHERE business_id=? AND status='won'
         AND strftime('%Y-%m', closed_at)=strftime('%Y-%m','now')`
      )
      .get(b.id).v;
    const today = db
      .prepare(
        `SELECT COALESCE(SUM(amount),0) v FROM deals
         WHERE business_id=? AND status='won' AND date(closed_at)=date('now')`
      )
      .get(b.id).v;
    return {
      id: b.id,
      name: b.name,
      color: b.color,
      target: b.monthly_target,
      month_revenue: month,
      today_revenue: today,
      progress: b.monthly_target ? Math.min(100, Math.round((month / b.monthly_target) * 1000) / 10) : 0,
    };
  });

  // Last 6 months revenue trend (all businesses combined, per business series).
  const months = db
    .prepare(
      `SELECT strftime('%Y-%m', closed_at) ym, business_id, SUM(amount) v
       FROM deals WHERE status='won' AND closed_at >= date('now','-5 months','start of month')
       GROUP BY ym, business_id ORDER BY ym`
    )
    .all();

  const today = db
    .prepare(
      `SELECT a.*, c.name AS contact_name, s.name AS service_name, b.name AS business_name, b.color AS business_color
       FROM appointments a
       LEFT JOIN contacts c ON c.id=a.contact_id
       LEFT JOIN services s ON s.id=a.service_id
       LEFT JOIN businesses b ON b.id=a.business_id
       WHERE date(a.starts_at)=date('now') AND a.status='booked'
       ORDER BY a.starts_at`
    )
    .all();

  const unread = db.prepare("SELECT COUNT(*) c FROM messages WHERE direction='in' AND is_read=0").get().c;
  const openDeals = db.prepare("SELECT COUNT(*) c FROM deals WHERE status='open'").get().c;
  const pendingTasks = db.prepare('SELECT COUNT(*) c FROM tasks WHERE done=0').get().c;

  const posts = db
    .prepare(
      `SELECT status, COUNT(*) c FROM posts GROUP BY status`
    )
    .all()
    .reduce((acc, r) => ({ ...acc, [r.status]: r.c }), {});

  const upcomingPosts = db
    .prepare(
      `SELECT p.*, b.name AS business_name, b.color AS business_color
       FROM posts p LEFT JOIN businesses b ON b.id=p.business_id
       WHERE p.status='scheduled' ORDER BY p.scheduled_at ASC LIMIT 8`
    )
    .all();

  const engagement = db
    .prepare(
      `SELECT platform, COALESCE(SUM(likes),0) likes, COALESCE(SUM(comments),0) comments,
              COALESCE(SUM(shares),0) shares, COALESCE(SUM(views),0) views
       FROM engagement GROUP BY platform`
    )
    .all();

  res.json({
    businesses: revByBiz,
    revenueTrend: months,
    todaysAppointments: today,
    counts: { unread, openDeals, pendingTasks },
    posts,
    upcomingPosts,
    engagement,
  });
});

module.exports = router;
