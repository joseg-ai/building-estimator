const express = require('express');
const db = require('./db');
const { authMiddleware } = require('./auth');

const router = express.Router();

const err = (code, message) => ({ error: { code, message } });

function getVersionRow(id) {
  return db.prepare(`
    SELECT v.id, v.name, v.supplier, v.is_active, v.created_at, v.created_by, v.notes,
      (SELECT COUNT(*) FROM material_prices p WHERE p.version_id = v.id) AS item_count
    FROM price_list_versions v
    WHERE v.id = ?
  `).get(id);
}

/** GET /api/price-list/versions -- list all versions */
router.get('/versions', (_req, res) => {
  const rows = db.prepare(`
    SELECT v.id, v.name, v.supplier, v.is_active, v.created_at, v.created_by, v.notes,
      (SELECT COUNT(*) FROM material_prices p WHERE p.version_id = v.id) AS item_count
    FROM price_list_versions v
    ORDER BY v.is_active DESC, v.created_at DESC
  `).all();
  res.json(rows);
});

/** GET /api/price-list/active -- the active version + items */
router.get('/active', (_req, res) => {
  const version = db.prepare(`
    SELECT v.id, v.name, v.supplier, v.is_active, v.created_at, v.created_by, v.notes
    FROM price_list_versions v WHERE v.is_active = 1 LIMIT 1
  `).get();
  if (!version) return res.status(404).json(err('NOT_FOUND', 'No active price list version'));
  const items = db.prepare(`
    SELECT id, item_key, description, unit, unit_price, category
    FROM material_prices WHERE version_id = ?
    ORDER BY category, item_key
  `).all(version.id);
  res.json({ version, items });
});

/** GET /api/price-list/versions/:id -- full version + items */
router.get('/versions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const version = getVersionRow(id);
  if (!version) return res.status(404).json(err('NOT_FOUND', `price list version ${id} not found`));
  const items = db.prepare(`
    SELECT id, item_key, description, unit, unit_price, category
    FROM material_prices WHERE version_id = ?
    ORDER BY category, item_key
  `).all(id);
  res.json({ version, items });
});

/** POST /api/price-list/versions -- create version + bulk items (atomic) */
router.post('/versions', authMiddleware, (req, res) => {
  const { name, supplier, notes, items } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json(err('VALIDATION', 'name is required'));
  }
  if (!Array.isArray(items)) {
    return res.status(400).json(err('VALIDATION', 'items must be an array'));
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || typeof it.item_key !== 'string' || !it.item_key) {
      return res.status(400).json(err('VALIDATION', `items[${i}].item_key is required`));
    }
    if (typeof it.unit_price !== 'number' || Number.isNaN(it.unit_price)) {
      return res.status(400).json(err('VALIDATION', `items[${i}].unit_price must be a number`));
    }
  }

  const insertVersion = db.prepare(`
    INSERT INTO price_list_versions (name, supplier, is_active, created_by, notes)
    VALUES (?, ?, 0, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO material_prices (version_id, item_key, description, unit, unit_price, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const info = insertVersion.run(
      name,
      supplier || 'Central States',
      req.user.id,
      notes || null
    );
    const versionId = info.lastInsertRowid;
    for (const it of items) {
      insertItem.run(
        versionId,
        it.item_key,
        it.description || '',
        it.unit || '',
        it.unit_price,
        it.category || ''
      );
    }
    return versionId;
  });

  const versionId = tx();
  res.status(201).json(getVersionRow(versionId));
});

/** PUT /api/price-list/versions/:id/items/:itemKey -- update one item */
router.put('/versions/:id/items/:itemKey', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const { itemKey } = req.params;
  const { unit_price, description, unit, category } = req.body || {};
  if (typeof unit_price !== 'number' || Number.isNaN(unit_price)) {
    return res.status(400).json(err('VALIDATION', 'unit_price must be a number'));
  }
  const existing = db.prepare(
    'SELECT id FROM material_prices WHERE version_id = ? AND item_key = ?'
  ).get(id, itemKey);
  if (!existing) return res.status(404).json(err('NOT_FOUND', `item ${itemKey} not found in version ${id}`));

  const updates = ['unit_price = ?'];
  const params = [unit_price];
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (unit !== undefined)        { updates.push('unit = ?');        params.push(unit); }
  if (category !== undefined)    { updates.push('category = ?');    params.push(category); }
  params.push(id, itemKey);

  db.prepare(`UPDATE material_prices SET ${updates.join(', ')} WHERE version_id = ? AND item_key = ?`).run(...params);
  const row = db.prepare(
    'SELECT id, item_key, description, unit, unit_price, category FROM material_prices WHERE version_id = ? AND item_key = ?'
  ).get(id, itemKey);
  res.json(row);
});

/** PUT /api/price-list/versions/:id/activate -- mark as active, deactivate others */
router.put('/versions/:id/activate', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const existing = db.prepare('SELECT id FROM price_list_versions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json(err('NOT_FOUND', `price list version ${id} not found`));

  const tx = db.transaction(() => {
    db.prepare('UPDATE price_list_versions SET is_active = 0 WHERE is_active = 1').run();
    db.prepare('UPDATE price_list_versions SET is_active = 1 WHERE id = ?').run(id);
  });
  tx();
  res.json(getVersionRow(id));
});

/** DELETE /api/price-list/versions/:id -- refuse if any quote references it */
router.delete('/versions/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const existing = db.prepare('SELECT id FROM price_list_versions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json(err('NOT_FOUND', `price list version ${id} not found`));
  const ref = db.prepare('SELECT COUNT(*) AS n FROM quotes WHERE price_list_version_id = ?').get(id);
  if (ref.n > 0) {
    return res.status(409).json(err('CONFLICT', `version ${id} is referenced by ${ref.n} quote(s)`));
  }
  db.prepare('DELETE FROM price_list_versions WHERE id = ?').run(id);
  res.json({ deleted: true, id });
});

module.exports = router;
