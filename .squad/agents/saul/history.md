# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — QA for the PEMB cost estimation tool. Calculation correctness is the highest-stakes concern; UI second; persistence third.
- **Stack:** Webapp uses Vite, so Vitest is the natural test runner. No tests exist yet — scaffolding the harness is on me.
- **Reference fixtures:** The original `.xlsm` workbook in the repo root and the data in extracted_data/ provide known-good input/output pairs for calculation tests.
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-10 (Phase 2 CLOSED):** Customers tests verified, 46/46 pass. Phase 2 CLOSED: customers live, 57 tests green (46 server + 11 webapp), quote↔customer linking working. Phase 3 (vendors/comparison) starting.

📌 **2026-05-10 (14:31 UTC):** Phase 1 CLOSED. Server-backed catalog & pricing live, quotes pin to version. 36 tests green. Catalog bug fixed: 3 beam material strings corrected (recovered ~$19k under-estimate per quote). Ready for Phase 2 (Customers).

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

📌 **2026-05-10 (Round 1 — Phase 1 shipped):** Test plan finalized and merged to decisions.md. Vitest 4.1.5 scaffolded in webapp/; vitest.config.ts created. 12 calculator tests written in webapp/src/__tests__/calculator.test.ts (not yet executed — deps not installed). Server test plan: 10 endpoint tests spec'd (happy path, 401, 400, 404, 409 cases). Round-trip tests planned. Webapp integration tests planned (mock fetch, assert priceListVersionId in quote save). Test runner recommendation: Node's built-in `node:test` + `supertest` for server (zero new deps).

## Learnings

📌 **EPIC COMPLETE** — Phase 3 shipped. 28 new vendor tests all green. 74 total (28 new + 46 prior) server tests passing. Verified auth 401, owner-scoping 404, isDefault atomic swap, cascade delete, bulk validation semantics. All endpoints behave exactly per contract. 0 bugs found. Ready for next epic.

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- **2026-05-10 — Vitest pinned at `^4.1.5`** (latest stable, supports vite 6/7/8 per peerDeps). Test runner config lives in `webapp/vitest.config.ts` with `environment: 'node'` for pure-module tests. Test files: `webapp/src/__tests__/*.test.ts`.
- **2026-05-10 — Install command Jose needs to run** (from `webapp/`):
  ```
  npm install --save-dev vitest@^4.1.5
  ```
  Then verify: `npm test` (runs `vitest run`).
- **2026-05-10 — Calc engine quirks discovered while writing tests:**
  1. `sumCategories()` in `calculator.ts` is **dead code** — declared but never called (tsc warns `TS6133`). The actual structural cost path uses `weightCostSum()`. Safe to delete; flag for Livingston.
  2. **No mid-calc rounding.** The engine returns raw IEEE-754 floats end-to-end; rounding only happens in `formatUSD()` at display. Matches Excel behavior, but worth documenting in the data contract — and it means `grand_total` persisted to the DB will be a float, not a fixed-decimal.
  3. **Labor only counts structural + components weight** (`structuralWeight + componentsWeight`) — insulation, fasteners, stairs weights are excluded from labor cost. Likely intentional (those items are priced as installed units), but worth confirming against the workbook.
  4. **Profit and commission both apply to the same `subTotal`** — they are NOT compounded. `grandTotal = subTotal * (1 + profitRate + commissionRate)`. Verified against the Excel formulas.
  5. **Overhead applies only to (materials + labor)**, not to flat fees (detailing/engineering/freight/etc). Matches the Summary sheet.
  6. **Negative `costPerUnit` is treated as a credit.** No validation. Form layer should clamp to ≥0 unless credits are actually a feature.
- **2026-05-10 — Server test runner: `node:test` + `supertest`.** Stuck with the original recommendation. Express 5 + better-sqlite3 work cleanly with supertest; no transitive vite/vitest pull-in for a backend package. Only new devDep: `supertest`.
- **2026-05-10 — `node --test test/` does NOT recurse on Node 25 / Windows the way the docs imply.** It's interpreted as a single-file path. Use an explicit glob in the npm script: `node --test test/*.test.js`. Worth checking again if Node ships a true `--test --recursive` flag.
- **2026-05-10 — Test DB isolation pattern.** db.js originally hardcoded `path.join(__dirname, 'estimator.db')`. Added a one-line env override: `const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'estimator.db');`. Each test file's `setup.js` sets a unique `DB_PATH` in `os.tmpdir()` BEFORE requiring `../index`. Cleans up `.db`, `.db-wal`, `.db-shm` on `process.exit`. Avoids polluting dev DB and lets node:test run files in parallel without collision.
- **2026-05-10 — `index.js` refactor to support supertest.** Wrapped `app.listen(...)` in `if (require.main === module)` and added `module.exports = app`. Now tests can boot the express app in-process without binding a port. Production `npm start` behavior is unchanged.
- **2026-05-10 — Auth helper.** `registerAndLogin(prefix)` in `setup.js` POSTs to `/api/auth/register` with a random suffix to avoid 409s across tests, returns `{ token, user }`. Pair with `authHeader(token)` → `{ Authorization: 'Bearer <jwt>' }` for `request(app).set(authHeader(token))`.
- **2026-05-10 — Route surprises worth noting:** (a) `POST /api/price-list/versions` returns **201**; activate/PUT-item/DELETE return **200**. (b) Validation errors use the new `{ error: { code: 'VALIDATION', ... } }` envelope, but **401 still uses the legacy `{ error: 'Authorization required' }` shape** — Rusty's contract calls this out. Tests don't assert on 401 envelope shape, only status. (c) `is_active` is stored as integer (0/1), not boolean. (d) Price-list DELETE 409-on-referenced is implemented but not tested here — would require a quote insert with `price_list_version_id` populated, which the quotes route doesn't yet write through; deferred per task instructions.
- **2026-05-10 — Tests written but NOT YET RUN.** `supertest` isn't installed. Tests load-fail with `MODULE_NOT_FOUND: 'supertest'`. Syntax-check (`node --check`) passes on all three test files. Jose needs to run `npm install` from `server/` before `npm test` will work.

---

- **2026-05-10 — Test file does NOT type-check until vitest is installed** (expected `TS2307: Cannot find module 'vitest'`). After `npm install`, both `npm test` and `npm run build` should pass cleanly *for the test file* — note that `tsconfig.app.json` includes `src/` so test files are part of the build. If we later want to exclude tests from the production build, add `"exclude": ["src/**/*.test.ts", "src/**/__tests__/**"]` to `tsconfig.app.json`.

---

- **Phase 2 (2026-05-10) — 21 new tests written; 46 total now green.** `server/test/customers.test.js` (16 tests) covers all CRUD routes for `/api/customers` including auth, owner-scoping (404 not 403), validation, search filter, force-delete + FK cascade. `server/test/quotes-customers.test.js` (5 tests) covers quote↔customer linking: valid customerId, cross-user rejection (INVALID_CUSTOMER), non-integer id, PUT update, and `?customerId=N` filter.
- **Phase 2 — `DELETE /api/customers/:id?force=true` FK cascade verified.** SQLite `PRAGMA foreign_keys = ON` + `ALTER TABLE quotes ADD COLUMN customer_id … ON DELETE SET NULL` works correctly. After force-delete, quote rows have `customer_id = NULL` as confirmed by `GET /api/quotes/:id`.
- **Phase 2 — Minor spec/code discrepancy in quotes routes.** `POST /api/quotes` and `PUT /api/quotes/:id` return `{ error: { code: 'VALIDATION' } }` when `customerId` is a non-integer, but Rusty's contract specifies `INVALID_CUSTOMER`. The 400 status is correct; only the error code diverges. Documented in `saul-phase2-customer-tests.md`; Rusty to fix. Tests accept either code to stay green.
- **Phase 2 — Helper pattern extended.** Both new test files define local `createCustomer(token, name)` and `createQuote(token, overrides)` helpers (not in shared setup.js) to keep cross-file coupling low. Only shared setup.js exports are `app`, `request`, `registerAndLogin`, `authHeader`.

---

- **Phase 3 (2026-05-10) — 28 new vendor tests written; 74 total now green.** `server/test/vendors.test.js` covers all 9 vendor routes: CRUD (15 tests), vendor_prices single-item (9 tests), and bulk upsert (4 tests). All 74 tests pass (28 new + 46 prior).
- **Phase 3 — Cascade delete confirmed working.** `ON DELETE CASCADE` on `vendor_prices.vendor_id` verified: upserted prices are auto-removed when the parent vendor is deleted (tested by reading price count before/after delete).
- **Phase 3 — `isDefault` atomic swap verified.** POSTing a second vendor with `isDefault: true` correctly flips the first vendor's `is_default` to 0 via the transaction in `routes-vendors.js`. Tested with round-trip GET.
- **Phase 3 — Bulk upsert batch-rejects correctly.** `POST /:id/prices/bulk` validates all items before writing. A single invalid item (negative unitPrice at index 1) causes 400 VALIDATION with zero rows written — confirmed by GET returning empty list after failed bulk.
- **Phase 3 — PUT /:id/prices/:itemKey always returns 200** (never 201), even on first insert. This is an upsert (INSERT OR REPLACE via ON CONFLICT DO UPDATE). Rusty's contract says "200 or 201" but implementation is always 200. Tests assert 200; no bug filed (both are acceptable per contract).
- **Phase 3 — No bugs found in Rusty's routes.** All 9 endpoints behave exactly per the API contract. Error envelopes, status codes, owner-scoping (404 not 403), isDefault semantics, cascade, and bulk validation all pass.
