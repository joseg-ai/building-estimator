# Decisions Log

**Updated:** 2026-05-14T19:22:29-05:00

---

## UI Fixes — 2026-05-14

**Author:** Linus (Frontend Dev)  
**Date:** 2026-05-14T19:22:29-05:00  
**Requested by:** Jose Guajardo

### Fix 1: Login Screen — Register section removed

`webapp/src/pages/LoginPage.tsx`

Stripped the Sign In / Register tab bar, the Display Name field, the `mode` state, and the `register` branch from `handleSubmit`. The `/api/auth/register` server route is untouched (Rusty's call). The login page is now a clean single-purpose form.

---

### Fix 2: Customer Form — Company Name replaces Customer Name + Company

`webapp/src/pages/CustomersPage.tsx`

- Removed `company` from `FormData` interface, `emptyForm()`, `customerToForm()`, and `formToWritable()` (sends `company: null` going forward).
- Renamed "Customer Name" input label → **"Company Name"** (same underlying `name` field, maps to `name` column in DB — backend `routes-customers.js` requires `name`; the `company` column is now ignored in new records).
- Added HTML `required` attribute to the Company Name `<input>` (the `textInput()` helper was showing the asterisk but not forwarding `required` to the DOM element — fixed).
- Disabled submit button when Company Name is empty (`disabled={submitting || !form.name.trim()}`).
- Removed "Company" column from the customers table; renamed "Name" column header → "Company Name".

**API contract unchanged:** `name` is still the primary key field sent to the server.

---

### Fix 3: Quotes Page blank after opening — fixed

**Root cause:** `GET /api/quotes` in `server/routes-quotes.js` returns raw SQLite rows in snake_case (`project_name`, `grand_total`, `updated_at`, etc.). The TypeScript type `QuoteListItem` expects camelCase. `formatUSD(q.grandTotal)` received `undefined` → `undefined.toLocaleString()` threw a TypeError during render → React unmounted the component tree → blank page.

**Fix in `webapp/src/api.ts`:** `apiListQuotes()` now maps the raw response, accepting both `row.grandTotal` and `row.grand_total` (and same for all other fields), so it works regardless of whether the server transforms or not.

**Defensive guards in `webapp/src/pages/QuotesPage.tsx`:**
- `formatUSD(q.grandTotal ?? 0)` — won't throw on undefined
- `q.updatedAt ? new Date(q.updatedAt).toLocaleDateString() : '-'` — won't render "Invalid Date"

**Note:** All other quote routes (`GET /quotes/:id`, customer `GET /:id/quotes`) already perform camelCase transformation. This was an oversight in the list route.

---

### Build Verification

`cd webapp && npm run build` → exit 0, 54 modules, no TypeScript errors.

---

## Customers 500 Fix — 2026-05-14

**Author:** Rusty (Backend Dev)  
**Date:** 2026-05-14  
**Status:** SHIPPED

### Problem

The Customers page in the webapp returned `<!DOCTYPE html>… Internal Server Error` on every request — both GET (list) and POST (create). No JSON error body reached the UI.

### Root Causes (4)

| # | Where | What |
|---|-------|------|
| 1 | `server/db.js` | Only `users` and `quotes` had `CREATE TABLE IF NOT EXISTS`. All Phase 2/3 tables (`customers`, `vendors`, `vendor_prices`, `price_list_versions`, `material_prices`, `materials_catalog_*`) were never added. Fresh DBs (tests, new deployments) had no customers table → unhandled `SqliteError` → HTML 500. |
| 2 | `server/index.js` | No global error-handling middleware. Any unhandled throw returned Express's default HTML page instead of `{ error: { code, message } }` JSON. |
| 3 | `server/routes-quotes.js` | Phase 2 was never applied: POST/PUT didn't handle `customerId`; GET didn't return it. Customer delete-guard (counting linked quotes) always returned 0 → wrong 200 on DELETE with quotes. |
| 4 | `server/db.js` vendor_prices DDL | `UNIQUE(vendor_id, item_key)` missing → `INSERT … ON CONFLICT(vendor_id, item_key)` threw `SQLITE_ERROR` on upsert. |

### Decisions / Fixes

#### 1. All schema DDL in `db.js` — forever

Every table must have `CREATE TABLE IF NOT EXISTS` in `db.js`. One-off `CREATE TABLE` run directly against the live DB without committing to `db.js` is forbidden. Fresh test DBs and Azure containers need full bootstrap from code.

#### 2. Idempotent migration block in `db.js`

For columns added to existing tables after initial deploy, use a `PRAGMA table_info` check then `ALTER TABLE … ADD COLUMN`. The migration block runs at every startup but only does work when columns are absent. No migration framework needed for SQLite.

#### 3. Global error middleware always last in `index.js`

```js
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
});
```

Must be after all `app.use(route)` calls. In production mode, masks internal 500 message text.

#### 4. `routes-quotes.js` customerId support

POST validates customerId ownership (400 INVALID_CUSTOMER if absent/foreign). PUT accepts `null` to clear or a new id. GET list accepts `?customerId=N` filter. GET /:id returns `customerId` and `priceListVersionId` in JSON body.

### Result

- `node --test test/*.test.js` → **74 pass, 0 fail** (was 60/14 before).
- Live POST /api/customers `{ name: "Acme Corp" }` → 201 with row in DB.
- Future unhandled throws now return `{ error: { code, message } }` JSON instead of HTML.

### Additive-only — no destructive migration

All changes are backwards-compatible. Existing `estimator.db` was untouched; `customers` table with both `name` and `company` columns preserved. Linus's upcoming form update (company name → `name` field) works with current schema: `name NOT NULL`, `company` nullable.
