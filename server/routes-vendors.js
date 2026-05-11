const express = require('express');
const { authMiddleware } = require('./auth');
const db = require('./db');

const router = express.Router();

router.use(authMiddleware);

const err = (code, message) => ({ error: { code, message } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VENDOR_FIELDS = [
  'name', 'contact_name', 'email', 'phone',
  'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country',
  'notes', 'is_default',
];

const CAMEL_TO_SNAKE = {
  name: 'name',
  contactName: 'contact_name',
  email: 'email',
  phone: 'phone',
  addressLine1: 'address_line1',
  addressLine2: 'address_line2',
  city: 'city',
  state: 'state',
  postalCode: 'postal_code',
  country: 'country',
  notes: 'notes',
  isDefault: 'is_default',
};

function toCamel(row) {
  if (!row) return row;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    notes: row.notes,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function priceRow(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    itemKey: row.item_key,
    unitPrice: row.unit_price,
    currency: row.currency,
    leadTimeDays: row.lead_time_days,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

function pickFields(body) {
  const out = {};
  for (const [camel, snake] of Object.entries(CAMEL_TO_SNAKE)) {
    if (body[camel] !== undefined) out[snake] = body[camel];
  }
  return out;
}

// Coerce JS boolean / 0 / 1 → SQLite integer; returns undefined for invalid input
function coerceIsDefault(val) {
  if (val === true || val === 1) return 1;
  if (val === false || val === 0) return 0;
  return undefined;
}

function validate(fields, { requireName }) {
  if (requireName) {
    if (typeof fields.name !== 'string' || fields.name.trim() === '') {
      return 'name is required';
    }
  } else if (fields.name !== undefined) {
    if (typeof fields.name !== 'string' || fields.name.trim() === '') {
      return 'name must be a non-empty string';
    }
  }
  if (fields.email !== undefined && fields.email !== null && fields.email !== '') {
    if (typeof fields.email !== 'string' || !EMAIL_RE.test(fields.email)) {
      return 'email is not a valid format';
    }
  }
  return null;
}

/** GET /api/vendors -- list current user's vendors; ?search= LIKE on name */
router.get('/', (req, res) => {
  const search = (req.query.search || '').toString().trim();
  let sql = `SELECT * FROM vendors WHERE user_id = ?`;
  const params = [req.user.id];
  if (search) {
    sql += ` AND name LIKE ?`;
    params.push(`%${search}%`);
  }
  sql += ` ORDER BY name COLLATE NOCASE ASC`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(toCamel));
});

/** GET /api/vendors/:id */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const row = db.prepare('SELECT * FROM vendors WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json(err('NOT_FOUND', 'Vendor not found'));
  res.json(toCamel(row));
});

/** POST /api/vendors */
router.post('/', (req, res) => {
  const fields = pickFields(req.body || {});

  if (fields.is_default !== undefined) {
    const coerced = coerceIsDefault(fields.is_default);
    if (coerced === undefined) return res.status(400).json(err('VALIDATION', 'isDefault must be a boolean'));
    fields.is_default = coerced;
  }

  const verr = validate(fields, { requireName: true });
  if (verr) return res.status(400).json(err('VALIDATION', verr));

  const now = Date.now();
  const setDefault = fields.is_default === 1;
  const cols = ['user_id', 'created_at', 'updated_at', ...VENDOR_FIELDS.filter((c) => fields[c] !== undefined)];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [req.user.id, now, now, ...VENDOR_FIELDS.filter((c) => fields[c] !== undefined).map((c) => fields[c])];

  const newId = db.transaction(() => {
    if (setDefault) {
      db.prepare('UPDATE vendors SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }
    const result = db.prepare(`INSERT INTO vendors (${cols.join(', ')}) VALUES (${placeholders})`).run(...values);
    return result.lastInsertRowid;
  })();

  const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(newId);
  res.status(201).json(toCamel(row));
});

/** PUT /api/vendors/:id */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const existing = db.prepare('SELECT id FROM vendors WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json(err('NOT_FOUND', 'Vendor not found'));

  const fields = pickFields(req.body || {});

  if (fields.is_default !== undefined) {
    const coerced = coerceIsDefault(fields.is_default);
    if (coerced === undefined) return res.status(400).json(err('VALIDATION', 'isDefault must be a boolean'));
    fields.is_default = coerced;
  }

  const verr = validate(fields, { requireName: false });
  if (verr) return res.status(400).json(err('VALIDATION', verr));

  const provided = VENDOR_FIELDS.filter((c) => fields[c] !== undefined);
  const now = Date.now();
  const setDefault = fields.is_default === 1;

  db.transaction(() => {
    if (setDefault) {
      db.prepare('UPDATE vendors SET is_default = 0 WHERE user_id = ? AND id != ?').run(req.user.id, id);
    }
    if (provided.length > 0) {
      const setClause = [...provided.map((c) => `${c} = ?`), 'updated_at = ?'].join(', ');
      const values = [...provided.map((c) => fields[c]), now, id, req.user.id];
      db.prepare(`UPDATE vendors SET ${setClause} WHERE id = ? AND user_id = ?`).run(...values);
    } else {
      db.prepare('UPDATE vendors SET updated_at = ? WHERE id = ? AND user_id = ?').run(now, id, req.user.id);
    }
  })();

  const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  res.json(toCamel(row));
});

/** DELETE /api/vendors/:id -- CASCADE deletes vendor_prices automatically */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const existing = db.prepare('SELECT id FROM vendors WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json(err('NOT_FOUND', 'Vendor not found'));
  db.prepare('DELETE FROM vendors WHERE id = ? AND user_id = ?').run(id, req.user.id);
  res.json({ deleted: true, id });
});

/** GET /api/vendors/:id/prices -- list all price overrides for this vendor */
router.get('/:id/prices', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const vendor = db.prepare('SELECT id FROM vendors WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!vendor) return res.status(404).json(err('NOT_FOUND', 'Vendor not found'));
  const rows = db.prepare('SELECT * FROM vendor_prices WHERE vendor_id = ? ORDER BY item_key ASC').all(id);
  res.json(rows.map(priceRow));
});

/** PUT /api/vendors/:id/prices/:itemKey -- upsert a single price override */
router.put('/:id/prices/:itemKey', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const vendor = db.prepare('SELECT id FROM vendors WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!vendor) return res.status(404).json(err('NOT_FOUND', 'Vendor not found'));

  const { unitPrice, currency, leadTimeDays, notes } = req.body || {};

  if (typeof unitPrice !== 'number' || isNaN(unitPrice) || unitPrice < 0) {
    return res.status(400).json(err('VALIDATION', 'unitPrice must be a non-negative number'));
  }
  if (leadTimeDays !== undefined && leadTimeDays !== null && !Number.isInteger(leadTimeDays)) {
    return res.status(400).json(err('VALIDATION', 'leadTimeDays must be an integer or null'));
  }

  const itemKey = req.params.itemKey;
  const now = Date.now();

  db.prepare(`
    INSERT INTO vendor_prices (vendor_id, item_key, unit_price, currency, lead_time_days, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(vendor_id, item_key) DO UPDATE SET
      unit_price = excluded.unit_price,
      currency = COALESCE(excluded.currency, currency),
      lead_time_days = excluded.lead_time_days,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(id, itemKey, unitPrice, currency || 'USD', leadTimeDays ?? null, notes ?? null, now);

  const row = db.prepare('SELECT * FROM vendor_prices WHERE vendor_id = ? AND item_key = ?').get(id, itemKey);
  res.json(priceRow(row));
});

/** DELETE /api/vendors/:id/prices/:itemKey -- remove a single price override */
router.delete('/:id/prices/:itemKey', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const vendor = db.prepare('SELECT id FROM vendors WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!vendor) return res.status(404).json(err('NOT_FOUND', 'Vendor not found'));
  const result = db.prepare('DELETE FROM vendor_prices WHERE vendor_id = ? AND item_key = ?').run(id, req.params.itemKey);
  if (result.changes === 0) return res.status(404).json(err('NOT_FOUND', 'Price override not found'));
  res.json({ deleted: true, vendorId: id, itemKey: req.params.itemKey });
});

/** POST /api/vendors/:id/prices/bulk -- upsert many price overrides (import from price list) */
router.post('/:id/prices/bulk', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const vendor = db.prepare('SELECT id FROM vendors WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!vendor) return res.status(404).json(err('NOT_FOUND', 'Vendor not found'));

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json(err('VALIDATION', 'items must be a non-empty array'));
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.itemKey || typeof item.itemKey !== 'string') {
      return res.status(400).json(err('VALIDATION', `items[${i}].itemKey is required`));
    }
    if (typeof item.unitPrice !== 'number' || isNaN(item.unitPrice) || item.unitPrice < 0) {
      return res.status(400).json(err('VALIDATION', `items[${i}].unitPrice must be a non-negative number`));
    }
    if (item.leadTimeDays !== undefined && item.leadTimeDays !== null && !Number.isInteger(item.leadTimeDays)) {
      return res.status(400).json(err('VALIDATION', `items[${i}].leadTimeDays must be an integer or null`));
    }
  }

  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO vendor_prices (vendor_id, item_key, unit_price, currency, lead_time_days, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(vendor_id, item_key) DO UPDATE SET
      unit_price = excluded.unit_price,
      currency = COALESCE(excluded.currency, currency),
      lead_time_days = excluded.lead_time_days,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  db.transaction(() => {
    for (const item of items) {
      stmt.run(id, item.itemKey, item.unitPrice, item.currency || 'USD', item.leadTimeDays ?? null, item.notes ?? null, now);
    }
  })();

  res.json({ upserted: items.length, vendorId: id });
});

module.exports = router;
