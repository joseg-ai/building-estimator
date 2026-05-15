const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { generateQuotePDF } = require('./pdf-quote');

const router = express.Router();

// Issue #6: status enum.
const ALLOWED_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'superseded'];

// PR #24 follow-up: valid exposure categories per ASCE 7.
const ALLOWED_EXPOSURE_CATEGORIES = ['B', 'C', 'D'];

// Issue #20: validate additionalStructures shape. Returns null if valid, error string if not.
function validateAdditionalStructures(as) {
  if (as === undefined || as === null) return null; // optional field
  if (typeof as !== 'object' || Array.isArray(as)) return 'additionalStructures must be an object';
  const boolNumStr = (obj, key, type) => {
    if (obj[key] === undefined) return null;
    if (type === 'bool' && typeof obj[key] !== 'boolean') return `${key} must be boolean`;
    if (type === 'num' && typeof obj[key] !== 'number') return `${key} must be number`;
    if (type === 'str' && typeof obj[key] !== 'string') return `${key} must be string`;
    return null;
  };
  const checks = [
    () => as.overhangs && (boolNumStr(as.overhangs, 'enabled', 'bool') || boolNumStr(as.overhangs, 'qty', 'num') || boolNumStr(as.overhangs, 'dims', 'str')),
    () => as.leanTos && (boolNumStr(as.leanTos, 'enabled', 'bool') || boolNumStr(as.leanTos, 'qty', 'num') || boolNumStr(as.leanTos, 'width', 'num') || boolNumStr(as.leanTos, 'length', 'num')),
    () => as.parapets && (boolNumStr(as.parapets, 'enabled', 'bool') || boolNumStr(as.parapets, 'height', 'num')),
    () => as.canopies && (boolNumStr(as.canopies, 'enabled', 'bool') || boolNumStr(as.canopies, 'qty', 'num') || boolNumStr(as.canopies, 'width', 'num') || boolNumStr(as.canopies, 'depth', 'num') || boolNumStr(as.canopies, 'height', 'num')),
    () => as.hssCanopies && (boolNumStr(as.hssCanopies, 'enabled', 'bool') || boolNumStr(as.hssCanopies, 'qty', 'num')),
  ];
  for (const check of checks) {
    const err = check();
    if (err) return err;
  }
  return null;
}

// Issue #6: quote number format QT-YYYY-NNNN, per-user per-year sequence.
// Padded to 4 digits; rolls over above 9999 (unlikely in practice).
function generateQuoteNumber(userId) {
  const year = new Date().getUTCFullYear();
  const prefix = `QT-${year}-`;
  const row = db.prepare(
    `SELECT quote_number FROM quotes
     WHERE user_id = ? AND quote_number LIKE ?
     ORDER BY quote_number DESC LIMIT 1`
  ).get(userId, prefix + '%');
  let next = 1;
  if (row && row.quote_number) {
    const tail = row.quote_number.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return prefix + String(next).padStart(4, '0');
}

// Issue #6: default valid_until = +30 days from now (UTC, YYYY-MM-DD).
function defaultValidUntil() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

function isValidDateString(s) {
  if (typeof s !== 'string') return false;
  // Accept YYYY-MM-DD or full ISO date-time; reject anything Date can't parse.
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function rowToQuote(row, { includeConfig = false } = {}) {
  const base = {
    id: row.id,
    projectName: row.project_name,
    customerName: row.customer_name,
    jobLocation: row.job_location,
    grandTotal: row.grand_total,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    priceListVersionId: row.price_list_version_id ?? null,
    customerId: row.customer_id ?? null,
    quoteNumber: row.quote_number ?? null,
    revision: row.revision ?? 0,
    parentQuoteId: row.parent_quote_id ?? null,
    validUntil: row.valid_until ?? null,
    windSpeedMph: row.wind_speed_mph ?? 115,
    exposureCategory: row.exposure_category ?? 'C',
    roofLiveLoadPsf: row.roof_live_load_psf ?? 20,
    snowLoadPsf: row.snow_load_psf ?? 20,
    roofColor: row.roof_color ?? '',
    wallColor: row.wall_color ?? '',
    trimColor: row.trim_color ?? '',
  };
  if (includeConfig) base.config = JSON.parse(row.config_json);
  return base;
}

// All routes here require authentication (middleware applied in index.js)

/** GET /api/quotes -- list all quotes for the current user */
router.get('/', (req, res) => {
  const customerIdFilter = req.query.customerId !== undefined ? Number(req.query.customerId) : null;
  let sql = `
    SELECT id, project_name, customer_name, job_location, grand_total, status,
           created_at, updated_at, price_list_version_id, customer_id,
           quote_number, revision, parent_quote_id, valid_until,
           wind_speed_mph, exposure_category, roof_live_load_psf, snow_load_psf,
           roof_color, wall_color, trim_color
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
  res.json(rows.map((r) => rowToQuote(r)));
});

/** GET /api/quotes/:id/pdf -- generate and stream a PDF for a quote */
router.get('/:id/pdf', (req, res) => {
  const row = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!row) return res.status(404).json({ error: 'Quote not found' });

  try {
    generateQuotePDF(row, res);
  } catch (err) {
    // If headers haven't been sent yet, return JSON error; otherwise just end.
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'PDF_ERROR', message: err.message } });
    }
  }
});

/** GET /api/quotes/:id -- get a single quote with full config */
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!row) return res.status(404).json({ error: 'Quote not found' });
  res.json(rowToQuote(row, { includeConfig: true }));
});

/** POST /api/quotes -- create a new quote */
router.post('/', (req, res) => {
  const { config, grandTotal, customerId, validUntil, status } = req.body;

  if (!config) return res.status(400).json({ error: 'config is required' });

  // Validate status (if provided)
  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
    });
  }

  // Issue #20: validate additionalStructures shape if provided
  const asErr = validateAdditionalStructures(config.additionalStructures);
  if (asErr) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: `additionalStructures: ${asErr}` } });
  }

  // PR #24 follow-up: validate design loads + colors from config
  if (config.exposureCategory !== undefined && !ALLOWED_EXPOSURE_CATEGORIES.includes(config.exposureCategory)) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: `exposureCategory must be one of: ${ALLOWED_EXPOSURE_CATEGORIES.join(', ')}` } });
  }
  for (const numField of ['windSpeedMph', 'roofLiveLoadPsf', 'snowLoadPsf']) {
    if (config[numField] !== undefined && typeof config[numField] !== 'number') {
      return res.status(400).json({ error: { code: 'VALIDATION', message: `${numField} must be a number` } });
    }
  }
  for (const strField of ['roofColor', 'wallColor', 'trimColor']) {
    if (config[strField] !== undefined && typeof config[strField] !== 'string') {
      return res.status(400).json({ error: { code: 'VALIDATION', message: `${strField} must be a string` } });
    }
  }

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

  // Validate validUntil if provided
  let resolvedValidUntil = defaultValidUntil();
  if (validUntil !== undefined && validUntil !== null) {
    if (!isValidDateString(validUntil)) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'validUntil must be an ISO date (YYYY-MM-DD)' } });
    }
    resolvedValidUntil = validUntil.slice(0, 10);
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const quoteNumber = generateQuoteNumber(req.user.id);
  const initialStatus = status || 'draft';
  const additionalStructuresJson = config.additionalStructures ? JSON.stringify(config.additionalStructures) : null;

  db.prepare(`
    INSERT INTO quotes (
      id, user_id, project_name, customer_name, job_location, config_json,
      grand_total, status, created_at, updated_at, customer_id,
      quote_number, revision, parent_quote_id, valid_until, additional_structures_json,
      wind_speed_mph, exposure_category, roof_live_load_psf, snow_load_psf,
      roof_color, wall_color, trim_color
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.id,
    config.projectName || '',
    config.customerName || '',
    config.jobLocation || '',
    JSON.stringify(config),
    grandTotal || 0,
    initialStatus,
    now,
    now,
    resolvedCustomerId,
    quoteNumber,
    resolvedValidUntil,
    additionalStructuresJson,
    config.windSpeedMph ?? 115,
    config.exposureCategory ?? 'C',
    config.roofLiveLoadPsf ?? 20,
    config.snowLoadPsf ?? 20,
    config.roofColor ?? '',
    config.wallColor ?? '',
    config.trimColor ?? ''
  );

  res.status(201).json({
    id,
    status: initialStatus,
    createdAt: now,
    customerId: resolvedCustomerId,
    quoteNumber,
    revision: 0,
    parentQuoteId: null,
    validUntil: resolvedValidUntil,
    windSpeedMph: config.windSpeedMph ?? 115,
    exposureCategory: config.exposureCategory ?? 'C',
    roofLiveLoadPsf: config.roofLiveLoadPsf ?? 20,
    snowLoadPsf: config.snowLoadPsf ?? 20,
    roofColor: config.roofColor ?? '',
    wallColor: config.wallColor ?? '',
    trimColor: config.trimColor ?? '',
  });
});

/** POST /api/quotes/:id/revisions -- create a new revision of an existing quote.
 *  Copies parent config/fields, increments revision, links via parent_quote_id,
 *  and marks the parent as 'superseded'. New revision shares the parent's
 *  quote_number (revisions of the same quote keep the same number). */
router.post('/:id/revisions', (req, res) => {
  const parent = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!parent) return res.status(404).json({ error: 'Quote not found' });

  const newId = uuidv4();
  const now = new Date().toISOString();
  const validUntil = defaultValidUntil();
  const newRevision = (parent.revision ?? 0) + 1;

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO quotes (
        id, user_id, project_name, customer_name, job_location, config_json,
        grand_total, status, created_at, updated_at, price_list_version_id,
        customer_id, quote_number, revision, parent_quote_id, valid_until,
        wind_speed_mph, exposure_category, roof_live_load_psf, snow_load_psf,
        roof_color, wall_color, trim_color
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      parent.user_id,
      parent.project_name,
      parent.customer_name,
      parent.job_location,
      parent.config_json,
      parent.grand_total,
      now,
      now,
      parent.price_list_version_id,
      parent.customer_id,
      parent.quote_number,
      newRevision,
      parent.id,
      validUntil,
      parent.wind_speed_mph ?? 115,
      parent.exposure_category ?? 'C',
      parent.roof_live_load_psf ?? 20,
      parent.snow_load_psf ?? 20,
      parent.roof_color ?? '',
      parent.wall_color ?? '',
      parent.trim_color ?? ''
    );
    db.prepare('UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?')
      .run('superseded', now, parent.id);
  });
  tx();

  const row = db.prepare('SELECT * FROM quotes WHERE id = ?').get(newId);
  res.status(201).json(rowToQuote(row, { includeConfig: true }));
});

/** PUT /api/quotes/:id -- update an existing quote */
router.put('/:id', (req, res) => {
  const { config, grandTotal, status, customerId, validUntil } = req.body;
  const existing = db.prepare('SELECT id FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!existing) return res.status(404).json({ error: 'Quote not found' });

  const now = new Date().toISOString();
  const updates = [];
  const params = [];

  if (config) {
    // Issue #20: validate additionalStructures shape if provided in config
    const asErr = validateAdditionalStructures(config.additionalStructures);
    if (asErr) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: `additionalStructures: ${asErr}` } });
    }
    // PR #24 follow-up: validate design loads + colors
    if (config.exposureCategory !== undefined && !ALLOWED_EXPOSURE_CATEGORIES.includes(config.exposureCategory)) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: `exposureCategory must be one of: ${ALLOWED_EXPOSURE_CATEGORIES.join(', ')}` } });
    }
    for (const numField of ['windSpeedMph', 'roofLiveLoadPsf', 'snowLoadPsf']) {
      if (config[numField] !== undefined && typeof config[numField] !== 'number') {
        return res.status(400).json({ error: { code: 'VALIDATION', message: `${numField} must be a number` } });
      }
    }
    for (const strField of ['roofColor', 'wallColor', 'trimColor']) {
      if (config[strField] !== undefined && typeof config[strField] !== 'string') {
        return res.status(400).json({ error: { code: 'VALIDATION', message: `${strField} must be a string` } });
      }
    }
    updates.push('config_json = ?', 'project_name = ?', 'customer_name = ?', 'job_location = ?');
    params.push(JSON.stringify(config), config.projectName || '', config.customerName || '', config.jobLocation || '');
    updates.push('additional_structures_json = ?');
    params.push(config.additionalStructures ? JSON.stringify(config.additionalStructures) : null);
    updates.push('wind_speed_mph = ?', 'exposure_category = ?', 'roof_live_load_psf = ?', 'snow_load_psf = ?', 'roof_color = ?', 'wall_color = ?', 'trim_color = ?');
    params.push(
      config.windSpeedMph ?? 115,
      config.exposureCategory ?? 'C',
      config.roofLiveLoadPsf ?? 20,
      config.snowLoadPsf ?? 20,
      config.roofColor ?? '',
      config.wallColor ?? '',
      config.trimColor ?? ''
    );
  }
  if (grandTotal !== undefined) {
    updates.push('grand_total = ?');
    params.push(grandTotal);
  }
  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
      });
    }
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
  if (validUntil !== undefined) {
    if (validUntil === null) {
      updates.push('valid_until = ?');
      params.push(null);
    } else {
      if (!isValidDateString(validUntil)) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'validUntil must be an ISO date (YYYY-MM-DD)' } });
      }
      updates.push('valid_until = ?');
      params.push(validUntil.slice(0, 10));
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
