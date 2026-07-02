'use strict';
const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT t.*, c.name AS contact_name FROM tasks t
         LEFT JOIN contacts c ON c.id=t.contact_id
         ORDER BY t.done, COALESCE(t.due_at, t.created_at)`
      )
      .all()
  );
});

router.post('/', (req, res) => {
  const { title, due_at, contact_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const info = db.prepare('INSERT INTO tasks(title,due_at,contact_id) VALUES(?,?,?)').run(title, due_at || null, contact_id || null);
  res.json(db.prepare('SELECT * FROM tasks WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { done, title, due_at } = req.body;
  db.prepare('UPDATE tasks SET done=COALESCE(?,done), title=COALESCE(?,title), due_at=COALESCE(?,due_at) WHERE id=?')
    .run(done === undefined ? null : done ? 1 : 0, title ?? null, due_at ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
