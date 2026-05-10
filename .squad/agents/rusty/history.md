# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — backend for the PEMB estimator. Persists customers, vendors, materials, prices, labor, and saved quotations.
- **Stack:** Node.js + SQLite. Files in server/: index.js (entry), db.js (schema), auth.js + routes-auth.js (auth), routes-quotes.js (quotes).
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-10 (Phase 2 CLOSED):** Customers live, 57 tests green. Phase 2 CLOSED: customers live, 57 tests green (46 server + 11 webapp), quote↔customer linking working. Phase 3 (vendors/comparison) starting.

📌 **2026-05-10 (14:31 UTC):** Phase 1 CLOSED. Server-backed catalog & pricing live, quotes pin to version. 36 tests green. Catalog bug fixed: 3 beam material strings corrected (recovered ~$19k under-estimate per quote). Ready for Phase 2 (Customers).

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

📌 **2026-05-10 (Round 1 — Phase 1 shipped):** API contract finalized and merged to decisions.md. Schema ready: price_list_versions, materials_catalog_versions, materials_catalog_items, quotes.price_list_version_id. Server boots (required `npm rebuild better-sqlite3` for Node 25). ⚠️ Catalog `weight` field is all zeros; needs schema fix (add weight_per_unit, derive at calc time). Routes not yet implemented.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->📌 **2026-05-10 — Phase 1 catalog & price list persistence shipped.**

- **New tables (all `IF NOT EXISTS`, idempotent on every server start):**
  - `price_list_versions` — `id INTEGER PK AUTOINCREMENT`, `name TEXT NOT NULL`, `supplier TEXT DEFAULT 'Central States'`, `is_active INTEGER DEFAULT 0`, `created_at TEXT`, `created_by TEXT FK→users(id)`, `notes TEXT`. Index: `idx_price_list_versions_active(is_active)`.
  - `material_prices` — `id PK`, `version_id FK→price_list_versions ON DELETE CASCADE`, `item_key TEXT`, `description TEXT`, `unit TEXT`, `unit_price REAL`, `category TEXT`. Index: `idx_material_prices_version_key(version_id, item_key)`.
  - `materials_catalog_versions` — same shape as price_list_versions minus supplier.
  - `materials_catalog_items` — `id PK`, `catalog_version_id FK ON DELETE CASCADE`, `category TEXT`, `item_key TEXT`, `payload_json TEXT` (the full catalog row stored as JSON — keeps the schema flexible since catalog rows are wider than prices). Index: `idx_catalog_items_version_cat_key(catalog_version_id, category, item_key)`.
- **`quotes` ALTER:** added `price_list_version_id INTEGER REFERENCES price_list_versions(id)` (nullable). Migration uses a `PRAGMA table_info` check before ALTER to stay idempotent — SQLite has no `ADD COLUMN IF NOT EXISTS`.
- **Routes mounted in `server/index.js`:**
  - `/api/price-list/*` → `routes-pricelist.js`
  - `/api/catalog/*` → `routes-catalog.js`
  - Both mounted **without** the global `authMiddleware` — reads are open during dev, writes apply `authMiddleware` per-route inside the router. Mirrors Danny's "reads open during dev" stance.
- **Error envelope:** `{ error: { code, message } }` with codes `VALIDATION` (400), `NOT_FOUND` (404), `CONFLICT` (409). Auth uses the existing `authMiddleware` which returns 401 with the legacy `{ error: 'Authorization required' }` shape — left untouched to avoid breaking the auth contract; new routes use the structured envelope.
- **Atomicity:** bulk `POST /versions` uses `db.transaction()` from better-sqlite3 to insert version + all items in one shot. `activate` also runs in a tx (clear all → set one).
- **Activate semantics:** only one row per `*_versions` table can have `is_active=1`. Enforced in app code, not via partial unique index (kept simple).
- **Delete guard:** price list versions refuse delete (409) if any quote references them via `price_list_version_id`. Catalog versions have no quote ref yet → always deletable.
- **Seeding:** server does NOT seed defaults. Webapp posts the bundled `priceList.ts` / `catalog.ts` defaults on first load. Keeps server independent of webapp source.
- **Gotcha — native module:** `better-sqlite3@12.8.0` was compiled against `NODE_MODULE_VERSION 127`; current Node 25.9.0 needs 141. Fix: `npm rebuild better-sqlite3` from `server/`. Document this for anyone bumping Node.
- **Gotcha — PowerShell + node -e:** escaped quotes inside `node -e "..."` on Windows PowerShell choke. Use a temp `.js` file instead when verifying.
- **Verified boot:** server starts on port 3099 in ~1s, `GET /api/health`, `GET /api/price-list/versions`, `GET /api/catalog/versions` all return 200; unauthenticated `POST /api/price-list/versions` returns 401.

📌 **2026-05-10 — Phase 1 quote pinning wired.**

- **Routes-quotes.js wired for priceListVersionId:**
  - POST (create quote): accepts optional `priceListVersionId` from body, validates as integer or null, verifies it exists in `price_list_versions` table, returns 400 with `{ error: { code: 'INVALID_VERSION', message: 'Unknown price list version' } }` if not found, inserts into `price_list_version_id` column.
  - PUT (update quote): same validation and upsert logic as POST.
  - GET (single quote) and GET (list): both now return `priceListVersionId` (camelCase) in response payloads.
  - Error envelope mirrors pricelist routes: `{ error: { code, message } }`.
- **Delete protection in routes-pricelist.js DELETE handler:** already implemented (lines 160–163). Blocks deletion of `price_list_versions` row if any quote references it via `price_list_version_id`, returns 409 with `{ error: { code: 'CONFLICT', message: 'version {id} is referenced by {n} quote(s)' } }`.
- **Tests:** all 25 tests in `server/test/` pass without modification. Quote routes now persist and read priceListVersionId transparently.
- **Idempotency:** Column already exists in db.js schema (idempotent migration), so fresh and existing databases both work.

📌 **2026-05-10 — Phase 2 customers master shipped.**

- **New table `customers`** (idempotent `IF NOT EXISTS`):
  - PK `id INTEGER AUTOINCREMENT`, owner `user_id TEXT FK→users(id)` (TEXT because users.id is uuid, NOT integer — matches existing convention).
  - Identity: `name NOT NULL`, plus optional `company`, `contact_name`, `email`, `phone`.
  - Address: `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country DEFAULT 'USA'`.
  - Free text: `notes`.
  - Per-customer overrides: `default_labor_rate`, `default_overhead_pct`, `default_profit_pct`, `default_commission_pct` — all REAL nullable so the calc engine can fall back to the global ProjectOverheads when null.
  - Timestamps: `created_at INTEGER`, `updated_at INTEGER` (epoch ms — Phase 2 uses numeric timestamps; Phase 1 used `datetime('now')` text. Mixed convention — flagged for future unification).
  - Index: `idx_customers_user_name(user_id, name)` — multi-tenant queries always filter by user_id first.
- **`quotes` ALTER:** added `customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL`. Same `PRAGMA table_info` guard pattern as `price_list_version_id`. Index `idx_quotes_customer(customer_id)`.
- **ON DELETE SET NULL** is the right choice: deleting a customer should not destroy historical quote records. Quotes survive with `customer_id=NULL` and the original `customer_name` text snapshot still in the row.
- **Routes mounted at `/api/customers`** via `routes-customers.js`. Auth applied at the router level (`router.use(authMiddleware)`) — different from pricelist/catalog (per-route on writes only) because **all** customer routes need owner scoping, no public reads.
- **Owner scoping:** every query filters `WHERE user_id = ?`. 404 returned for both missing-id and foreign-owned (don't leak existence of other tenants' records).
- **Delete semantics:** 409 `IN_USE` if any quote references the customer, unless `?force=true` query param — then DELETE proceeds and FK SET NULL unlinks quotes. Response includes `quotesUnlinked` count for force deletes.
- **List endpoint** includes `quote_count` aggregate via `LEFT JOIN quotes ... GROUP BY c.id`. `?search=` does case-sensitive `LIKE` on name+company. Order is `ORDER BY name COLLATE NOCASE`.
- **Validation:**
  - `name` required and non-empty on POST. On PUT, if provided must be non-empty (cannot blank an existing name).
  - `email` regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` only when provided + non-empty. Empty string skips check.
  - Numeric fields validated as `typeof === 'number'` or null.
- **Quotes integration:**
  - POST/PUT `/api/quotes` accept optional `customerId`. Validates integer + ownership (`SELECT id FROM customers WHERE id = ? AND user_id = ?`). Returns 400 `INVALID_CUSTOMER` on miss — important: ownership check uses **current user**, so a malicious user can't link to another tenant's customer.
  - GET single + list now return `customerId` (camelCase).
  - List supports `?customerId=N` filter — useful for the "deals with this customer" view.
- **camelCase mapping:** `routes-customers.js` has explicit `CAMEL_TO_SNAKE` map and `toCamel()` row mapper. Keeps DB snake_case clean and API camelCase consistent.
- **All 25 prior tests pass** unchanged — no regression. Saul will add the customers test suite separately.
- **Files touched:** `db.js` (+30 lines schema), `index.js` (+2 lines wiring), `routes-quotes.js` (+customerId validation/storage), `routes-customers.js` (NEW, ~210 lines).

📌 **2026-05-10 — Phase 2 bug fix: customerId non-integer error code corrected.**

- **Bug (Saul BUG-1):** `POST /api/quotes` and `PUT /api/quotes/:id` were returning `code: 'VALIDATION'` when `customerId` was not an integer. Spec says `INVALID_CUSTOMER`.
- **Fix:** Two `err('VALIDATION', ...)` calls in `routes-quotes.js` (lines ~86 and ~145) changed to `err('INVALID_CUSTOMER', 'customerId must be an integer')`. HTTP 400 status unchanged.
- **Test impact:** 46/46 still pass. Test 19 now gets the canonical code.

📌 **2026-05-10 — Phase 3 vendor backend kicked off.**

📌 **EPIC COMPLETE** — Phase 3 shipped. 28 new vendor tests + 46 prior = 74 server tests green. All 9 vendor routes live (CRUD, prices, bulk upsert). `item_key` persistence pattern locked. isDefault atomic swap verified. CASCADE delete on vendor working. Bug fix in Phase 2 customer routes. Ready for next epic.

- **New tables (idempotent `IF NOT EXISTS` in `db.js`):**
  - `vendors` — `id INTEGER PK AUTOINCREMENT`, `user_id TEXT FK→users`, `name NOT NULL`, optional `contact_name`, `email`, `phone`, address fields (line1/line2/city/state/postal_code, `country DEFAULT 'USA'`), `notes`, `is_default INTEGER DEFAULT 0` (0/1 flag), `created_at/updated_at INTEGER` (epoch ms). Index: `idx_vendors_user_name(user_id, name)`.
  - `vendor_prices` — `id PK AUTOINCREMENT`, `vendor_id FK→vendors ON DELETE CASCADE`, `item_key TEXT`, `unit_price REAL NOT NULL`, `currency TEXT DEFAULT 'USD'`, `lead_time_days INTEGER NULL`, `notes TEXT NULL`, `updated_at INTEGER`. `UNIQUE(vendor_id, item_key)`. Index: `idx_vendor_prices_item(item_key)`.
- **Key design decision — `item_key` not `price_list_item_id`:** `vendor_prices` is keyed on `item_key` (the same string key used in `materials_catalog_items` and `material_prices`). This means vendor overrides survive price list version rotations and do not require a price_list join to be useful. The tradeoff: item_key is a string identity contract; renaming a key orphans vendor prices (same risk as catalog key renames).
- **`is_default` semantics:** At most one vendor per user can have `is_default = 1`. POST/PUT with `isDefault: true` runs inside a `db.transaction()` that first clears all other vendors' flags for that user, then sets the target row. Enforced in app code; SQLite partial unique indexes not used (keeps schema simple, matches Phase 1 activate pattern).
- **New file `routes-vendors.js`** (~260 lines). All routes require auth (router-level `authMiddleware`). Mirrors `routes-customers.js` style: `toCamel()` mapper, `CAMEL_TO_SNAKE` dict, `pickFields()`, `validate()`. Error envelope `{ error: { code, message } }`. Codes: `VALIDATION` (400), `NOT_FOUND` (404).
- **Routes shipped:**
  - `GET /api/vendors` (with `?search=` LIKE on name)
  - `GET /api/vendors/:id`
  - `POST /api/vendors` (validates name required, email format, isDefault bool coerce)
  - `PUT /api/vendors/:id`
  - `DELETE /api/vendors/:id` (CASCADE removes vendor_prices automatically — no force needed)
  - `GET /api/vendors/:id/prices` — list all price overrides
  - `PUT /api/vendors/:id/prices/:itemKey` — upsert single price (uses SQLite `ON CONFLICT ... DO UPDATE`)
  - `DELETE /api/vendors/:id/prices/:itemKey` — remove single override
  - `POST /api/vendors/:id/prices/bulk` — bulk upsert array of `{itemKey, unitPrice, leadTimeDays?, notes?}`; validates all items before any write, runs in single transaction.
- **Wired in `server/index.js`:** `app.use('/api/vendors', vendorsRoutes)` — mirrors customers mounting.
- **All 46 prior tests pass unchanged** after schema additions. No new tests this round (Saul owns test authoring).
