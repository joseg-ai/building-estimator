const express = require('express');
const { authMiddleware } = require('./auth');
const db = require('./db');

const router = express.Router();

router.use(authMiddleware);

const err = (code, message) => ({ error: { code, message } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CUSTOMER_FIELDS = [
  'name', 'company', 'contact_name', 'email', 'phone',
  'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country',
  'notes',
  'default_labor_rate', 'default_overhead_pct', 'default_profit_pct', 'default_commission_pct',
];

const CAMEL_TO_SNAKE = {
  name: 'name',
  company: 'company',
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
  defaultLaborRate: 'default_labor_rate',
  defaultOverheadPct: 'default_overhead_pct',
  defaultProfitPct: 'default_profit_pct',
  defaultCommissionPct: 'default_commission_pct',
};

function toCamel(row) {
  if (!row) return row;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    company: row.company,
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
    defaultLaborRate: row.default_labor_rate,
    defaultOverheadPct: row.default_overhead_pct,
    defaultProfitPct: row.default_profit_pct,
    defaultCommissionPct: row.default_commission_pct,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    quoteCount: row.quote_count,
  };
}

function pickFields(body) {
  const out = {};
  for (const [camel, snake] of Object.entries(CAMEL_TO_SNAKE)) {
    if (body[camel] !== undefined) out[snake] = body[camel];
  }
  return out;
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
  for (const k of ['default_labor_rate', 'default_overhead_pct', 'default_profit_pct', 'default_commission_pct']) {
    if (fields[k] !== undefined && fields[k] !== null && typeof fields[k] !== 'number') {
      return `${k} must be a number or null`;
    }
  }
  return null;
}

/** GET /api/customers -- list current user's customers */
router.get('/', (req, res) => {
  const search = (req.query.search || '').toString().trim();
  let sql = `
    SELECT c.*, COUNT(q.id) AS quote_count
    FROM customers c
    LEFT JOIN quotes q ON q.customer_id = c.id
    WHERE c.user_id = ?
  `;
  const params = [req.user.id];
  if (search) {
    sql += ` AND (c.name LIKE ? OR c.company LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like);
  }
  sql += ` GROUP BY c.id ORDER BY c.name COLLATE NOCASE ASC`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(toCamel));
});

/** GET /api/customers/:id */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const row = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM quotes q WHERE q.customer_id = c.id) AS quote_count
    FROM customers c WHERE c.id = ? AND c.user_id = ?
  `).get(id, req.user.id);
  if (!row) return res.status(404).json(err('NOT_FOUND', 'Customer not found'));
  res.json(toCamel(row));
});

/** POST /api/customers */
router.post('/', (req, res) => {
  const fields = pickFields(req.body || {});
  const verr = validate(fields, { requireName: true });
  if (verr) return res.status(400).json(err('VALIDATION', verr));

  const now = Date.now();
  const cols = ['user_id', 'created_at', 'updated_at', ...CUSTOMER_FIELDS.filter((c) => fields[c] !== undefined)];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [req.user.id, now, now, ...CUSTOMER_FIELDS.filter((c) => fields[c] !== undefined).map((c) => fields[c])];
  const result = db.prepare(`INSERT INTO customers (${cols.join(', ')}) VALUES (${placeholders})`).run(...values);
  const row = db.prepare(`
    SELECT c.*, 0 AS quote_count FROM customers c WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(toCamel(row));
});

/** PUT /api/customers/:id */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const existing = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json(err('NOT_FOUND', 'Customer not found'));

  const fields = pickFields(req.body || {});
  const verr = validate(fields, { requireName: false });
  if (verr) return res.status(400).json(err('VALIDATION', verr));

  const provided = CUSTOMER_FIELDS.filter((c) => fields[c] !== undefined);
  const now = Date.now();
  if (provided.length > 0) {
    const setClause = [...provided.map((c) => `${c} = ?`), 'updated_at = ?'].join(', ');
    const values = [...provided.map((c) => fields[c]), now, id, req.user.id];
    db.prepare(`UPDATE customers SET ${setClause} WHERE id = ? AND user_id = ?`).run(...values);
  } else {
    db.prepare('UPDATE customers SET updated_at = ? WHERE id = ? AND user_id = ?').run(now, id, req.user.id);
  }
  const row = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM quotes q WHERE q.customer_id = c.id) AS quote_count
    FROM customers c WHERE c.id = ?
  `).get(id);
  res.json(toCamel(row));
});

/** DELETE /api/customers/:id */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const existing = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json(err('NOT_FOUND', 'Customer not found'));

  const force = String(req.query.force || '').toLowerCase() === 'true';
  const refCount = db.prepare('SELECT COUNT(*) AS n FROM quotes WHERE customer_id = ?').get(id).n;
  if (refCount > 0 && !force) {
    return res.status(409).json(err('IN_USE', `${refCount} quotes reference this customer. Reassign first.`));
  }
  db.prepare('DELETE FROM customers WHERE id = ? AND user_id = ?').run(id, req.user.id);
  res.json({ deleted: true, id, quotesUnlinked: force ? refCount : 0 });
});

/** GET /api/customers/:id/quotes -- list quotes for this customer */
router.get('/:id/quotes', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const owner = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!owner) return res.status(404).json(err('NOT_FOUND', 'Customer not found'));

  const rows = db.prepare(`
    SELECT id, project_name, customer_name, job_location, grand_total, status,
           created_at, updated_at, price_list_version_id, customer_id
    FROM quotes
    WHERE customer_id = ? AND user_id = ?
    ORDER BY updated_at DESC
  `).all(id, req.user.id);

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

module.exports = router;
