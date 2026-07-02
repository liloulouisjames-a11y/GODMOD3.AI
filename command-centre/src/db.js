'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'command-centre.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
//  Schema / migrations
//  A tiny migration runner: each entry runs once, tracked in _migrations.
// ---------------------------------------------------------------------------
const migrations = [
  {
    name: '001_init',
    sql: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      monthly_target INTEGER DEFAULT 10000000, -- MUR
      color TEXT DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER REFERENCES businesses(id),
      name TEXT,
      phone TEXT,
      email TEXT,
      source TEXT,            -- whatsapp | sms | call | manual | booking
      stage TEXT DEFAULT 'new', -- new | contacted | qualified | proposal | won | lost
      notes TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,       -- whatsapp | sms | call
      direction TEXT NOT NULL,     -- in | out
      body TEXT,
      meta TEXT,                   -- JSON: call duration, media url, provider id, etc.
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id);

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      business_id INTEGER REFERENCES businesses(id),
      title TEXT,
      amount INTEGER DEFAULT 0,    -- MUR
      status TEXT DEFAULT 'open',  -- open | won | lost
      closed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_deals_business ON deals(business_id);

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      due_at TEXT,
      done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER REFERENCES businesses(id),
      name TEXT NOT NULL,
      duration_min INTEGER DEFAULT 60,
      price INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER REFERENCES businesses(id),
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      service_id INTEGER REFERENCES services(id),
      title TEXT,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      status TEXT DEFAULT 'booked', -- booked | completed | cancelled | no_show
      reminder_sent INTEGER DEFAULT 0,
      google_event_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_appts_start ON appointments(starts_at);

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER REFERENCES businesses(id),
      platform TEXT NOT NULL,   -- facebook | instagram | tiktok | youtube
      caption TEXT,
      media_path TEXT,
      media_type TEXT,          -- text | image | video
      scheduled_at TEXT,        -- ISO time to publish
      status TEXT DEFAULT 'scheduled', -- scheduled | published | failed
      external_id TEXT,
      error TEXT,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, scheduled_at);

    -- default posting times per platform (2 posts/day)
    CREATE TABLE IF NOT EXISTS post_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      slot INTEGER NOT NULL,    -- 1 or 2
      time_hhmm TEXT NOT NULL   -- "09:00"
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    `,
  },
  {
    name: '002_engagement',
    sql: `
    CREATE TABLE IF NOT EXISTS engagement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      platform TEXT,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      captured_at TEXT DEFAULT (datetime('now'))
    );
    `,
  },
];

function runMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    run_at TEXT DEFAULT (datetime('now'))
  );`);
  const done = new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name));
  const insert = db.prepare('INSERT INTO _migrations (name) VALUES (?)');
  for (const m of migrations) {
    if (done.has(m.name)) continue;
    db.exec(m.sql);
    insert.run(m.name);
    console.log(`[db] applied migration ${m.name}`);
  }
}

runMigrations();

module.exports = db;
