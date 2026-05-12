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

## Recent Work (2026-05-11 to 2026-05-12)

- **2026-05-11:** Azure deploy architecture greenlit (Tier 1: B1 + SQLite + KeyVault ~\–15/mo; Tier 2: PostgreSQL + scaled App Service). Prod-mode static serving wired (SERVE_WEBAPP guard, SPA fallback via \pp.use()\ not \pp.get('*')\). Auth \/me\ fix (missing authMiddleware inline). Routes audit: all 4 routers (auth, quotes, catalog, pricelist, customers, vendors) now mounted.
- **2026-05-12:** Login "Failed to fetch" fix (Vite proxy + root npm run dev) completed by Rusty.

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

## Next

- Saul: Customer + vendor test suites
- Danny/Linus: Azure deployment + DNS config
- Phase 4 candidate: Comparison logic or advanced search
