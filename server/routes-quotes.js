const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const router = express.Router();

// All routes here require authentication (middleware applied in index.js)

/** GET /api/quotes -- list all quotes for the current user */
router.get('/', (req, res) => {
  const customerIdFilter = req.query.customerId !== undefined ? Number(req.query.customerId) : null;
  let sql = `
    SELECT id, project_name, customer_name, job_location, grand_total, status,
           created_at, updated_at, price_list_version_id, customer_id
    FROM quotes
    WHERE user_id = ?
  `;
  const params = [req.user.id];
  if (customerIdFilter !== null && !isNaN(customerIdFilter)) {
    sql += ' AND customer_id = ?';
    params.push(customerIdFilter);
  }
  sql += ' ORDER BY updated_at DESC';
  const rows = db.prepare(sql).all(...params);

  res.json(rows.map((row) => ({
    id: row.id,
    projectName: row.project_name,
    customerName: row.customer_name,
    jobLocation: row.job_location,
    grandTotal: row.grand_total,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    priceListVersionId: row.price_list_version_id,
    customerId: row.customer_id,
  })));
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
    priceListVersionId: row.price_list_version_id ?? null,
    customerId: row.customer_id ?? null,
  });
});

/** POST /api/quotes -- create a new quote */
router.post('/', (req, res) => {
  const { config, grandTotal, customerId } = req.body;

  if (!config) return res.status(400).json({ error: 'config is required' });

  // Validate customerId if provided
  let resolvedCustomerId = null;
  if (customerId !== undefined && customerId !== null) {
    const cidNum = Number(customerId);
    if (!Number.isInteger(cidNum) || cidNum <= 0) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'customerId must be a positive integer' } });
    }
    const cust = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(cidNum, req.user.id);
    if (!cust) {
      return res.status(400).json({ error: { code: 'INVALID_CUSTOMER', message: 'Customer not found or does not belong to you' } });
    }
    resolvedCustomerId = cidNum;
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO quotes (id, user_id, project_name, customer_name, job_location, config_json, grand_total, status, created_at, updated_at, customer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
  `).run(
    id,
    req.user.id,
    config.projectName || '',
    config.customerName || '',
    config.jobLocation || '',
    JSON.stringify(config),
    grandTotal || 0,
    now,
    now,
    resolvedCustomerId
  );

  res.status(201).json({ id, status: 'draft', createdAt: now, customerId: resolvedCustomerId });
});

/** PUT /api/quotes/:id -- update an existing quote */
router.put('/:id', (req, res) => {
  const { config, grandTotal, status, customerId } = req.body;
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
  if (customerId !== undefined) {
    if (customerId === null) {
      updates.push('customer_id = ?');
      params.push(null);
    } else {
      const cidNum = Number(customerId);
      if (!Number.isInteger(cidNum) || cidNum <= 0) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'customerId must be a positive integer' } });
      }
      const cust = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(cidNum, req.user.id);
      if (!cust) {
        return res.status(400).json({ error: { code: 'INVALID_CUSTOMER', message: 'Customer not found or does not belong to you' } });
      }
      updates.push('customer_id = ?');
      params.push(cidNum);
    }
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
