const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const router = express.Router();

// All routes here require authentication (middleware applied in index.js)

/** GET /api/quotes -- list all quotes for the current user */
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, project_name, customer_name, job_location, grand_total, status, created_at, updated_at
    FROM quotes
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.user.id);

  res.json(rows);
});

/** GET /api/quotes/:id -- get a single quote with full config */
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!row) return res.status(404).json({ error: 'Quote not found' });

  res.json({
    id: row.id,
    projectName: row.project_name,
    customerName: row.customer_name,
    jobLocation: row.job_location,
    config: JSON.parse(row.config_json),
    grandTotal: row.grand_total,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
});

/** POST /api/quotes -- create a new quote */
router.post('/', (req, res) => {
  const { config, grandTotal } = req.body;

  if (!config) return res.status(400).json({ error: 'config is required' });

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO quotes (id, user_id, project_name, customer_name, job_location, config_json, grand_total, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `).run(
    id,
    req.user.id,
    config.projectName || '',
    config.customerName || '',
    config.jobLocation || '',
    JSON.stringify(config),
    grandTotal || 0,
    now,
    now
  );

  res.status(201).json({ id, status: 'draft', createdAt: now });
});

/** PUT /api/quotes/:id -- update an existing quote */
router.put('/:id', (req, res) => {
  const { config, grandTotal, status } = req.body;
  const existing = db.prepare('SELECT id FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!existing) return res.status(404).json({ error: 'Quote not found' });

  const now = new Date().toISOString();
  const updates = [];
  const params = [];

  if (config) {
    updates.push('config_json = ?', 'project_name = ?', 'customer_name = ?', 'job_location = ?');
    params.push(JSON.stringify(config), config.projectName || '', config.customerName || '', config.jobLocation || '');
  }
  if (grandTotal !== undefined) {
    updates.push('grand_total = ?');
    params.push(grandTotal);
  }
  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  updates.push('updated_at = ?');
  params.push(now);
  params.push(req.params.id, req.user.id);

  db.prepare(`UPDATE quotes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

  res.json({ id: req.params.id, updatedAt: now });
});

/** DELETE /api/quotes/:id -- delete a quote */
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM quotes WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Quote not found' });

  res.json({ deleted: true });
});

module.exports = router;
