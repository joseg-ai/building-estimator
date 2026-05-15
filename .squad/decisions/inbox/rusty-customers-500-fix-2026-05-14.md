# Decision: Customers 500 Fix — 2026-05-14

**Author:** Rusty (Backend Dev)  
**Date:** 2026-05-14  
**Status:** SHIPPED

## Problem

The Customers page in the webapp returned `<!DOCTYPE html>… Internal Server Error` on every request — both GET (list) and POST (create). No JSON error body reached the UI.

## Root Causes (4)

| # | Where | What |
|---|-------|------|
| 1 | `server/db.js` | Only `users` and `quotes` had `CREATE TABLE IF NOT EXISTS`. All Phase 2/3 tables (`customers`, `vendors`, `vendor_prices`, `price_list_versions`, `material_prices`, `materials_catalog_*`) were never added. Fresh DBs (tests, new deployments) had no customers table → unhandled `SqliteError` → HTML 500. |
| 2 | `server/index.js` | No global error-handling middleware. Any unhandled throw returned Express's default HTML page instead of `{ error: { code, message } }` JSON. |
| 3 | `server/routes-quotes.js` | Phase 2 was never applied: POST/PUT didn't handle `customerId`; GET didn't return it. Customer delete-guard (counting linked quotes) always returned 0 → wrong 200 on DELETE with quotes. |
| 4 | `server/db.js` vendor_prices DDL | `UNIQUE(vendor_id, item_key)` missing → `INSERT … ON CONFLICT(vendor_id, item_key)` threw `SQLITE_ERROR` on upsert. |

## Decisions / Fixes

### 1. All schema DDL in `db.js` — forever
Every table must have `CREATE TABLE IF NOT EXISTS` in `db.js`. One-off `CREATE TABLE` run directly against the live DB without committing to `db.js` is forbidden. Fresh test DBs and Azure containers need full bootstrap from code.

### 2. Idempotent migration block in `db.js`
For columns added to existing tables after initial deploy, use a `PRAGMA table_info` check then `ALTER TABLE … ADD COLUMN`. The migration block runs at every startup but only does work when columns are absent. No migration framework needed for SQLite.

### 3. Global error middleware always last in `index.js`
```js
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
});
```
Must be after all `app.use(route)` calls. In production mode, masks internal 500 message text.

### 4. `routes-quotes.js` customerId support
POST validates customerId ownership (400 INVALID_CUSTOMER if absent/foreign). PUT accepts `null` to clear or a new id. GET list accepts `?customerId=N` filter. GET /:id returns `customerId` and `priceListVersionId` in JSON body.

## Result

- `node --test test/*.test.js` → **74 pass, 0 fail** (was 60/14 before).
- Live POST /api/customers `{ name: "Acme Corp" }` → 201 with row in DB.
- Future unhandled throws now return `{ error: { code, message } }` JSON instead of HTML.

## Additive-only — no destructive migration
All changes are backwards-compatible. Existing `estimator.db` was untouched; `customers` table with both `name` and `company` columns preserved. Linus's upcoming form update (company name → `name` field) works with current schema: `name NOT NULL`, `company` nullable.
