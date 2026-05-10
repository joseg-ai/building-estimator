# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — backend for the PEMB estimator. Persists customers, vendors, materials, prices, labor, and saved quotations.
- **Stack:** Node.js + SQLite. Files in server/: index.js (entry), db.js (schema), auth.js + routes-auth.js (auth), routes-quotes.js (quotes).
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-10 (14:31 UTC):** Phase 1 CLOSED. Server-backed catalog & pricing live, quotes pin to version. 36 tests green. Catalog bug fixed: 3 beam material strings corrected (recovered ~$19k under-estimate per quote). Ready for Phase 2 (Customers).

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

📌 **2026-05-10 (Round 1 — Phase 1 shipped):** API contract finalized and merged to decisions.md. Schema ready: price_list_versions, materials_catalog_versions, materials_catalog_items, quotes.price_list_version_id. Server boots (required `npm rebuild better-sqlite3` for Node 25). ⚠️ Catalog `weight` field is all zeros; needs schema fix (add weight_per_unit, derive at calc time). Routes not yet implemented.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

📌 **2026-05-10 — Phase 1 catalog & price list persistence shipped.**

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
