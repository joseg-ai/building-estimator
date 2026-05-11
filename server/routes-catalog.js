const express = require('express');
const db = require('./db');
const { authMiddleware } = require('./auth');

const router = express.Router();

const err = (code, message) => ({ error: { code, message } });

function getVersionRow(id) {
  return db.prepare(`
    SELECT v.id, v.name, v.is_active, v.created_at, v.created_by, v.notes,
      (SELECT COUNT(*) FROM materials_catalog_items i WHERE i.catalog_version_id = v.id) AS item_count
    FROM materials_catalog_versions v
    WHERE v.id = ?
  `).get(id);
}

function rowToItem(r) {
  let payload;
  try { payload = JSON.parse(r.payload_json); } catch { payload = null; }
  return { id: r.id, category: r.category, item_key: r.item_key, payload };
}

/** GET /api/catalog/versions */
router.get('/versions', (_req, res) => {
  const rows = db.prepare(`
    SELECT v.id, v.name, v.is_active, v.created_at, v.created_by, v.notes,
      (SELECT COUNT(*) FROM materials_catalog_items i WHERE i.catalog_version_id = v.id) AS item_count
    FROM materials_catalog_versions v
    ORDER BY v.is_active DESC, v.created_at DESC
  `).all();
  res.json(rows);
});

/** GET /api/catalog/active */
router.get('/active', (_req, res) => {
  const version = db.prepare(`
    SELECT id, name, is_active, created_at, created_by, notes
    FROM materials_catalog_versions WHERE is_active = 1 LIMIT 1
  `).get();
  if (!version) return res.status(404).json(err('NOT_FOUND', 'No active catalog version'));
  const items = db.prepare(`
    SELECT id, category, item_key, payload_json
    FROM materials_catalog_items WHERE catalog_version_id = ?
    ORDER BY category, item_key
  `).all(version.id).map(rowToItem);
  res.json({ version, items });
});

/** GET /api/catalog/versions/:id */
router.get('/versions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const version = getVersionRow(id);
  if (!version) return res.status(404).json(err('NOT_FOUND', `catalog version ${id} not found`));
  const items = db.prepare(`
    SELECT id, category, item_key, payload_json
    FROM materials_catalog_items WHERE catalog_version_id = ?
    ORDER BY category, item_key
  `).all(id).map(rowToItem);
  res.json({ version, items });
});

/** POST /api/catalog/versions -- create version + items */
router.post('/versions', authMiddleware, (req, res) => {
  const { name, notes, items } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json(err('VALIDATION', 'name is required'));
  }
  if (!Array.isArray(items)) {
    return res.status(400).json(err('VALIDATION', 'items must be an array'));
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || typeof it.category !== 'string' || !it.category) {
      return res.status(400).json(err('VALIDATION', `items[${i}].category is required`));
    }
    if (typeof it.item_key !== 'string' || !it.item_key) {
      return res.status(400).json(err('VALIDATION', `items[${i}].item_key is required`));
    }
    if (it.payload === undefined || it.payload === null) {
      return res.status(400).json(err('VALIDATION', `items[${i}].payload is required`));
    }
  }

  const insertVersion = db.prepare(`
    INSERT INTO materials_catalog_versions (name, is_active, created_by, notes)
    VALUES (?, 0, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO materials_catalog_items (catalog_version_id, category, item_key, payload_json)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const info = insertVersion.run(name, req.user.id, notes || null);
    const versionId = info.lastInsertRowid;
    for (const it of items) {
      insertItem.run(versionId, it.category, it.item_key, JSON.stringify(it.payload));
    }
    return versionId;
  });

  const versionId = tx();
  res.status(201).json(getVersionRow(versionId));
});

/** PUT /api/catalog/versions/:id/items/:itemKey -- update payload */
router.put('/versions/:id/items/:itemKey', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const { itemKey } = req.params;
  const { payload, category } = req.body || {};
  if (payload === undefined || payload === null) {
    return res.status(400).json(err('VALIDATION', 'payload is required'));
  }
  const existing = db.prepare(
    'SELECT id FROM materials_catalog_items WHERE catalog_version_id = ? AND item_key = ?'
  ).get(id, itemKey);
  if (!existing) return res.status(404).json(err('NOT_FOUND', `item ${itemKey} not found in catalog version ${id}`));

  const updates = ['payload_json = ?'];
  const params = [JSON.stringify(payload)];
  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  params.push(id, itemKey);

  db.prepare(
    `UPDATE materials_catalog_items SET ${updates.join(', ')} WHERE catalog_version_id = ? AND item_key = ?`
  ).run(...params);

  const row = db.prepare(
    'SELECT id, category, item_key, payload_json FROM materials_catalog_items WHERE catalog_version_id = ? AND item_key = ?'
  ).get(id, itemKey);
  res.json(rowToItem(row));
});

/** PUT /api/catalog/versions/:id/activate */
router.put('/versions/:id/activate', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const existing = db.prepare('SELECT id FROM materials_catalog_versions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json(err('NOT_FOUND', `catalog version ${id} not found`));

  const tx = db.transaction(() => {
    db.prepare('UPDATE materials_catalog_versions SET is_active = 0 WHERE is_active = 1').run();
    db.prepare('UPDATE materials_catalog_versions SET is_active = 1 WHERE id = ?').run(id);
  });
  tx();
  res.json(getVersionRow(id));
});

/** DELETE /api/catalog/versions/:id -- no quote ref yet, always allowed */
router.delete('/versions/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json(err('VALIDATION', 'id must be an integer'));
  const existing = db.prepare('SELECT id FROM materials_catalog_versions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json(err('NOT_FOUND', `catalog version ${id} not found`));
  db.prepare('DELETE FROM materials_catalog_versions WHERE id = ?').run(id);
  res.json({ deleted: true, id });
});

module.exports = router;
