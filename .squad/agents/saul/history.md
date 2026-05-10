# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — QA for the PEMB cost estimation tool. Calculation correctness is the highest-stakes concern; UI second; persistence third.
- **Stack:** Webapp uses Vite, so Vitest is the natural test runner. No tests exist yet — scaffolding the harness is on me.
- **Reference fixtures:** The original `.xlsm` workbook in the repo root and the data in extracted_data/ provide known-good input/output pairs for calculation tests.
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

📌 **2026-05-10 (Round 1 — Phase 1 shipped):** Test plan finalized and merged to decisions.md. Vitest 4.1.5 scaffolded in webapp/; vitest.config.ts created. 12 calculator tests written in webapp/src/__tests__/calculator.test.ts (not yet executed — deps not installed). Server test plan: 10 endpoint tests spec'd (happy path, 401, 400, 404, 409 cases). Round-trip tests planned. Webapp integration tests planned (mock fetch, assert priceListVersionId in quote save). Test runner recommendation: Node's built-in `node:test` + `supertest` for server (zero new deps).

## Learnings

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
- **2026-05-10 — Test file does NOT type-check until vitest is installed** (expected `TS2307: Cannot find module 'vitest'`). After `npm install`, both `npm test` and `npm run build` should pass cleanly *for the test file* — note that `tsconfig.app.json` includes `src/` so test files are part of the build. If we later want to exclude tests from the production build, add `"exclude": ["src/**/*.test.ts", "src/**/__tests__/**"]` to `tsconfig.app.json`.
