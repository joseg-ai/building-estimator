# rusty — Backend Dev

## Project Context
- **Building Estimator:** Backend for PEMB estimator. Persists customers, vendors, materials, prices, labor, saved quotations.
- **Stack:** Node.js + SQLite (server/) + React (webapp/). Tests: 74 server green + 11 webapp = 85 total.
- **Started:** 2026-05-10

## Phase Milestones

| Phase | Shipped | Status |
|-------|---------|--------|
| 1 | Catalog & pricing persistence, quote pinning | ✓ CLOSED (36→46 tests) |
| 2 | Customers master, customerId FK to quotes, delete guards | ✓ CLOSED (57 tests) |
| 3 | Vendors CRUD, prices, is_default atomicity, bulk upsert, CASCADE delete | ✓ COMPLETE (74 tests) |
| Azure | Static serving (SERVE_WEBAPP=true), prod-mode setup, DB_PATH env-driven | ✓ READY |

📌 **2026-05-14 (20:06 UTC):** Danny backlog triage → **GH issue #6** assigned (Add quote number, revision, valid-until, status enum). Sprint 1 (S1): Small effort. Unblocks downstream features (#8 wire color, #9 legal language, #12 print). See `.squad/orchestration-log/2026-05-14-danny-triage.md` for context.

## Recent Work (2026-05-11 to 2026-05-12)

- **2026-05-11:** Azure deploy architecture greenlit (Tier 1: B1 + SQLite + KeyVault ~\–15/mo; Tier 2: PostgreSQL + scaled App Service). Prod-mode static serving wired (SERVE_WEBAPP guard, SPA fallback via \pp.use()\ not \pp.get('*')\). Auth \/me\ fix (missing authMiddleware inline). Routes audit: all 4 routers (auth, quotes, catalog, pricelist, customers, vendors) now mounted.
- **2026-05-12 (dev):** Login "Failed to fetch" fix (Vite proxy + root npm run dev) completed by Rusty -- but those changes were only in the working tree; never committed.
- **2026-05-12 (prod):** Azure "Failed to fetch" on login diagnosed and fixed. Root cause: api.ts had API_BASE = 'http://localhost:3001/api' hardcoded; Azure HTTPS page calling HTTP localhost = mixed content blocked by browser. Fix: committed api.ts env-driven approach + set VITE_API_URL: '/api' in deploy.yml. Pushed to main; deploy triggered (run 25766914057).

## Key Learnings

📌 **Vite dev proxy prevents CORS headaches**
- Webapp absolute VITE_API_URL caused cross-origin requests. Root \
pm run dev\ + proxy in \webapp/vite.config.ts\ (/api → localhost:3001) eliminates need for two terminals.

📌 **SQLite schema migration idiom**
- Use \PRAGMA table_info\ check before ALTER TABLE to stay idempotent (SQLite has no IF EXISTS for columns).

📌 **Foreign key strategy**
- Quote↔Customer: ON DELETE SET NULL (keep historical quotes alive). Vendor↔Price: ON DELETE CASCADE (vendor gone = orphaned prices gone).

📌 **ActiveRecord pattern for 1-of-N flag**
- \is_default=1\ enforced in app code via \db.transaction()\ clear-then-set, not SQLite partial unique index (simpler, matches activate pattern).

📌 **item_key persistence contract**
- \endor_prices\ keyed on \item_key\ (not \price_list_item_id\) survives price list rotations but orphans on key rename. Accepted tradeoff.

📌 **Error envelope consistency**
- New routes use \{ error: { code, message } }\. Legacy auth uses \{ error: 'string' }\ (left untouched). Future: unify.

📌 **Native module gotchas**
- \etter-sqlite3\ compiled against NODE_MODULE_VERSION 127; Node 25.9.0 needs 141. Fix: \
pm rebuild better-sqlite3\ from server/.

📌 **Mixed timestamp convention**
- Phase 1 uses \datetime('now')\ TEXT; Phase 2+ use INTEGER epoch-ms. Flag for future unification.

📌 **Azure prod "Failed to fetch" — mixed content, not CORS**
- Single App Service hosts both React (HTTPS) and Express API. Azure topology: same origin, no CORS needed.
- If `api.ts` has a hardcoded `http://localhost:3001` URL, the HTTPS prod page tries to call HTTP → browser blocks as mixed content → `TypeError: Failed to fetch`.
- Fix: api.ts must use `import.meta.env.VITE_API_URL ?? '/api'`. Deploy CI must set `VITE_API_URL: '/api'` (not `''` — `??` does NOT treat empty string as absent; only `null`/`undefined` trigger the fallback).
- Lesson: always commit the dev-fix to git. Working-tree-only changes don't reach Azure.

## Next

- Saul: Customer + vendor test suites
- Danny/Linus: Azure deployment + DNS config
- Phase 4 candidate: Comparison logic or advanced search

---

📌 **2026-05-14T19:45:20Z: Reuben Full App Assessment Complete**

Reuben delivered comprehensive domain assessment of webapp vs. VMBC workbook. Key findings: 2 critical gaps (no parametric BOM generation engine; Beams/Take-off sheet missing), 2 pricing bugs (labor applied to cold-formed components, frame-opening cost method broken), 14 terminology improvements, 17-item prioritized backlog (6 critical, 6 important, 5 nice-to-have), and 1 reusable PEMB proposal anatomy skill. Assessment merged to `.squad/decisions.md`. Backlog ready for sprint planning. See `.squad/decisions.md` for full 17-item breakdown.

---

## 2026-05-14 — Customers 500 Fix

### Root Causes Found
1. **`db.js` missing all Phase 2+ table DDLs.** Only `users` and `quotes` were in `CREATE TABLE IF NOT EXISTS`. The `customers`, `vendors`, `vendor_prices`, `price_list_versions`, `material_prices`, `materials_catalog_versions`, `materials_catalog_items` tables were created by one-time ad hoc commands against the live DB — never committed to `db.js`. Fresh temp DBs used by tests (and any new deployment) were missing these tables entirely → unhandled `SqliteError: no such table` → Express HTML 500 page.
2. **No global error-handling middleware in `index.js`.** Any unhandled throw in a route returned Express's default HTML 500 page instead of JSON `{ error: { code, message } }`.
3. **`routes-quotes.js` never updated for Phase 2 `customer_id` FK.** POST and PUT didn't accept `customerId`; GET didn't return it. Made customer delete-guard test (COUNT quotes by customer_id) return 0 always.
4. **`vendor_prices` DDL missing `UNIQUE(vendor_id, item_key)`.** The routes use `INSERT ... ON CONFLICT(vendor_id, item_key)` upsert; without the constraint the clause throws `SQLITE_ERROR`.

### Fixes Applied
- `server/db.js`: Added `CREATE TABLE IF NOT EXISTS` for all 7 missing tables with correct columns, FK constraints, and indexes (including `UNIQUE(vendor_id, item_key)` for vendor_prices). Added idempotent `ALTER TABLE` migration block to add `price_list_version_id` and `customer_id` to existing `quotes` tables.
- `server/index.js`: Added global 4-arg Express error-handling middleware that logs 5xx and always returns `{ error: { code, message } }` JSON.
- `server/routes-quotes.js`: Added `customerId` support to POST (validate ownership) and PUT (validate or null), and included `customerId`/`priceListVersionId` in GET list and GET /:id responses. Added `?customerId=N` filter to GET list.

### Verified
- `node --test test/*.test.js` → **74 pass, 0 fail** (was 60 pass / 14 fail before fix).
- Live curl: POST /api/customers `{ name: "Test Company 2026" }` → 201 with id + quoteCount.

📌 **Schema bootstrap must live in `db.js`**
- All `CREATE TABLE IF NOT EXISTS` DDL goes in `db.js`. Never create tables directly against the live DB without committing to `db.js`. Fresh test DBs and new deployments need full bootstrap.

📌 **Always add global error middleware last in `index.js`**
- 4-arg `(err, req, res, next)` must be after all routes. Returns `{ error: { code, message } }` JSON; logs 5xx to console.

## 2026-05-14T19:22:29Z: Customers 500 Fix (w/ Linus parallel)

**Session:** UI/API fixes sprint. Rusty (692s) + Linus (374s) simultaneously addressed 5 issues.

**Root Causes (4):**
1. db.js missing all phase 2/3 table DDLs (only users + quotes existed)
2. No global error middleware (Express HTML 500 instead of JSON)
3. routes-quotes.js never wired customerId for Phase 2
4. vendor_prices missing UNIQUE(vendor_id, item_key) constraint

**Fixes Applied:**
- db.js: Full schema bootstrap (7 tables, all DDLs)
- index.js: Global 4-arg error middleware (JSON, logs 5xx)
- routes-quotes.js: customerId in POST/PUT/GET (validates ownership, returns in list/detail)
- vendor_prices: Added UNIQUE constraint

**Verified:**
- `node --test test/*.test.js` → 74 pass, 0 fail (was 60/14)
- Live POST /api/customers `{ name: "Test" }` → 201 with id

**Key takeaway:** All schema DDL must live in db.js. Fresh test DBs depend on it. No one-time direct DB commands.
