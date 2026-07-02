'use strict';
// Idempotent seed: creates the admin user, the two businesses, default
// services, posting schedule, and (optionally) demo CRM data.
const bcrypt = require('bcryptjs');
const db = require('./db');
const config = require('./config');

function upsertSetting(key, value) {
  db.prepare(
    `INSERT INTO settings(key,value) VALUES(?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`
  ).run(key, value);
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username=?').get(config.admin.username);
  const hash = bcrypt.hashSync(config.admin.password, 10);
  if (existing) {
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, existing.id);
  } else {
    db.prepare('INSERT INTO users(username,password_hash) VALUES(?,?)').run(
      config.admin.username,
      hash
    );
  }
  console.log(`[seed] admin user "${config.admin.username}" ready`);
}

function seedBusinesses() {
  const businesses = [
    { name: 'Shanghai Beauty Mauritius', slug: 'shanghai-beauty', color: '#ec4899' },
    { name: 'Green Eco Solar', slug: 'green-eco-solar', color: '#22c55e' },
  ];
  const ins = db.prepare(
    `INSERT INTO businesses(name,slug,monthly_target,color) VALUES(?,?,10000000,?)
     ON CONFLICT(slug) DO UPDATE SET name=excluded.name, color=excluded.color`
  );
  businesses.forEach((b) => ins.run(b.name, b.slug, b.color));
  console.log('[seed] businesses ready');
}

function seedServices() {
  const beauty = db.prepare('SELECT id FROM businesses WHERE slug=?').get('shanghai-beauty').id;
  const solar = db.prepare('SELECT id FROM businesses WHERE slug=?').get('green-eco-solar').id;
  const count = db.prepare('SELECT COUNT(*) c FROM services').get().c;
  if (count > 0) return;
  const ins = db.prepare('INSERT INTO services(business_id,name,duration_min,price) VALUES(?,?,?,?)');
  ins.run(beauty, 'Signature Facial', 60, 2500);
  ins.run(beauty, 'Full Body Massage', 90, 3500);
  ins.run(beauty, 'Bridal Makeup', 120, 8000);
  ins.run(solar, 'Solar Consultation (site visit)', 60, 0);
  ins.run(solar, 'Residential System Quote', 45, 0);
  ins.run(solar, 'Commercial Energy Audit', 120, 15000);
  console.log('[seed] services ready');
}

function seedSchedule() {
  const count = db.prepare('SELECT COUNT(*) c FROM post_schedule').get().c;
  if (count > 0) return;
  const ins = db.prepare('INSERT INTO post_schedule(platform,slot,time_hhmm) VALUES(?,?,?)');
  const platforms = ['facebook', 'instagram', 'tiktok', 'youtube'];
  platforms.forEach((p) => {
    ins.run(p, 1, '09:00');
    ins.run(p, 2, '18:00');
  });
  console.log('[seed] posting schedule ready (2 posts/day per platform)');
}

function seedDemo() {
  if (db.prepare('SELECT COUNT(*) c FROM contacts').get().c > 0) return;
  const beauty = db.prepare('SELECT id FROM businesses WHERE slug=?').get('shanghai-beauty').id;
  const solar = db.prepare('SELECT id FROM businesses WHERE slug=?').get('green-eco-solar').id;

  const insContact = db.prepare(
    `INSERT INTO contacts(business_id,name,phone,email,source,stage,notes)
     VALUES(?,?,?,?,?,?,?)`
  );
  const insMsg = db.prepare(
    `INSERT INTO messages(contact_id,channel,direction,body,is_read,created_at)
     VALUES(?,?,?,?,?,datetime('now',?))`
  );
  const insDeal = db.prepare(
    `INSERT INTO deals(contact_id,business_id,title,amount,status,closed_at)
     VALUES(?,?,?,?,?,?)`
  );

  const c1 = insContact.run(beauty, 'Priya Ramgoolam', '+23057123456', 'priya@example.mu', 'whatsapp', 'qualified', 'Interested in bridal package for December wedding.').lastInsertRowid;
  insMsg.run(c1, 'whatsapp', 'in', 'Hi, do you do bridal makeup? What are your prices?', 1, '-2 days');
  insMsg.run(c1, 'whatsapp', 'out', 'Hello Priya! Yes, our bridal package is Rs 8000 incl. trial. When is the big day?', 1, '-2 days');
  insMsg.run(c1, 'whatsapp', 'in', 'December 14th. Can I book a trial next week?', 0, '-1 hours');

  const c2 = insContact.run(solar, 'Jean-Marc Laval', '+23052987654', 'jm.laval@example.mu', 'call', 'proposal', 'Villa in Tamarin, wants 8kW system. Quote sent.').lastInsertRowid;
  insMsg.run(c2, 'call', 'in', 'Inbound call — 4m 12s. Discussed roof size and CEB rebate.', 1, '-3 days');
  insMsg.run(c2, 'sms', 'out', 'Hi Jean-Marc, your 8kW solar quote is ready: Rs 480,000 installed. Reply YES to proceed.', 1, '-1 days');
  insMsg.run(c2, 'sms', 'in', 'Looks good. Can we meet Friday?', 0, '-20 minutes');

  const c3 = insContact.run(beauty, 'Aisha Boodhun', '+23057555111', null, 'sms', 'won', 'Regular client — monthly facial.').lastInsertRowid;
  insMsg.run(c3, 'sms', 'in', 'Booking my usual facial for Saturday please', 1, '-5 days');
  insDeal.run(c3, beauty, 'Signature Facial x3 package', 7000, 'won', "datetime('now','-4 days')");

  const c4 = insContact.run(solar, 'Green Warehouse Ltd', '+23054001122', 'ops@greenwarehouse.mu', 'manual', 'won', 'Commercial rooftop — 40kW.').lastInsertRowid;
  insDeal.run(c4, solar, 'Commercial 40kW installation', 2100000, 'won', "datetime('now','-10 days')");

  // Fix closed_at for won deals to real datetimes
  db.prepare("UPDATE deals SET closed_at=datetime('now','-4 days') WHERE contact_id=?").run(c3);
  db.prepare("UPDATE deals SET closed_at=datetime('now','-10 days') WHERE contact_id=?").run(c4);

  console.log('[seed] demo CRM data inserted');
}

function run() {
  seedAdmin();
  seedBusinesses();
  seedServices();
  seedSchedule();
  if (config.demoMode) seedDemo();
  upsertSetting('seeded_at', new Date().toISOString());
  console.log('[seed] complete');
}

run();
module.exports = { run };
