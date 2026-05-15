# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — PEMB cost estimation tool. Browser app with pages for Design, Price List, Main Framing, Components, Insulation, Fasteners, Stairs, Summary, and a printable Quotation with SVG diagrams.
- **Stack:** React 19, TypeScript, Vite, Tailwind v4, react-router-dom v7. State via React Context, persistence via localStorage.
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-11 — Production architecture greenlight pending.** Danny completed Azure architecture proposal: Tier 1 = App Service B1 + SQLite + Key Vault (~$13-15/mo). Tier 2 (10+ users) = PostgreSQL Flex + scaled App Service. DB path already env-driven. Awaiting Jose greenlight. Linus handles API URL config; Rusty's DB/API changes if needed post-approval.

📌 **2026-05-10 (Phase 2 CLOSED):** Customers frontend wired, live. Phase 2 CLOSED: customers live, 57 tests green (46 server + 11 webapp), quote↔customer linking working. Phase 3 (vendors/comparison) starting.

📌 **2026-05-10 (14:31 UTC):** Phase 1 CLOSED. Server-backed catalog & pricing live, quotes pin to version. 36 tests green. Catalog bug fixed: 3 beam material strings corrected (recovered ~$19k under-estimate per quote). Ready for Phase 2 (Customers).

📌 **2026-05-14 (20:06 UTC):** Danny backlog triage → **GH issues #7, #9, #11, #12, #13, #16** assigned. Sprint 1 (S1): #7 (wind speed + color on DesignPage). Sprint 2 (S2): #9 (proposal legal language). Sprint 3 (S3): #11 ($/sqft metrics), #12 (quote number on print), #13 (sales tax field). Backlog (S4+): #16 (comparison page). See `.squad/orchestration-log/2026-05-14-danny-triage.md` for sprint plan & effort estimates.

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

## Key Learnings & Implementation Record

### Summary (Phase 1–3 Shipped)

**Phase 1 (Price List Versioning):** Wired server-backed price list with versioning. Added context state for `priceList`, `catalog`, and pricing overrides. PriceListPage + offline caching implemented. 36 tests green.

**Phase 2 (Customers + Quote Linking):** CustomersPage + CustomerPicker CRUD. Added customerId to BuildingConfig. Quote save flow extended. Blank page bugs audited and fixed (QuoteListItem camelCase, useCallback TDZ ordering). 57 tests green.

**Phase 3 (Vendors + Comparison):** VendorsPage + ComparisonPage shipped. Vendor price overlays, pick-vendor snapshot flow, and localStorage persistence of comparison selection. Multi-vendor calc overlay pattern verified. 11 calculator tests pass; 0 new lint/TS errors across all phases.

### Core Patterns (To Remember)

- **State separation:** Per-quote config (BuildingConfig reducer) stays separate from app-wide reference data (priceList/catalog/customers/vendors useState slices).
- **API pattern:** `apiFetch()` wraps fetch, auto-injects token, throws `Error & { code?, status? }` for error surfacing. Returns `Promise<any>` — callers are typed by their declared return types.
- **API URL config:** `const API_BASE = import.meta.env.VITE_API_URL ?? '/api'` in `api.ts`. `.env.development` sets `VITE_API_URL=http://localhost:3001/api` for local dev. Production (Azure App Service same-origin) uses `/api` fallback.
- **Optimistic updates:** Snapshot previous state, mutate immediately, PUT in background, restore on failure. Error surfaced via `sync.error` field on state slice.
- **Offline fallback:** Bundled defaults + localStorage cache. On 404, POST defaults as new version and activate.
- **Vendor calc overlay:** Clone components, replace `costPerUnit` with effective vendor price, call `calculateCosts()`. Labor + flat fees unchanged.
- **Error handling:** `apiFetch` validates status + code. TDZ (Temporal Dead Zone) in useCallback/useEffect ordering.

## Learnings

### 2026-05-11 — API URL env var pattern
`const API_BASE = import.meta.env.VITE_API_URL ?? '/api'` is the correct pattern for Vite apps deployed to a same-origin server. Local dev overrides via `.env.development` (committed, no secrets); production uses the `/api` fallback automatically. Never hardcode `http://localhost:3001` — it breaks production.

### Important Files & Patterns

- **API surface:** `webapp/src/api.ts` — all apiFetch calls, auto token injection, error handling.
- **Context:** `webapp/src/context.tsx` — BuildingConfig reducer + per-data-slice useState. Init hook guards with useRef.
- **Pages:** DesignPage (config entry), QuotesPage (save/list), PriceListPage (versioning), CustomersPage (CRUD), VendorsPage (CRUD + prices), ComparisonPage (multi-vendor calc).
- **Components:** CustomerPicker (autocomplete), VendorPricesModal (nested, per-vendor overrides).
- **Storage:** `webapp/src/storage.ts` — localStorage cache helpers for price-list, catalog, customers, vendors, comparison selection.



## 2026-05-12: Webapp Vite dev proxy for API routing

rusty fixed login "Failed to fetch" issue by adding dev-only Vite proxy.
- webapp/vite.config.ts now proxies /api → http://localhost:3001
- Root package.json runs both server + webapp with 'npm run dev'
- No impact to your infrastructure (dev-only, not used in production)
- But good to know for future webapp dev setup discussions

### Key API URL Pattern

When working on API integration, remember: **`const API_BASE = import.meta.env.VITE_API_URL ?? '/api'`** in `webapp/src/api.ts` is the pattern for same-origin production deployment. The `??` operator uses `/api` fallback only if `VITE_API_URL` is `null` or `undefined`—empty string is NOT treated as falsy. In CI/deploy workflows, always set `VITE_API_URL: '/api'` (not `''`). For local dev, use Vite proxy with `VITE_API_URL` unset or commented out.

## 2026-05-14: Three UI Fixes

### Files Changed
- `webapp/src/pages/LoginPage.tsx` — removed register tab/form/logic. Login-only screen.
- `webapp/src/pages/CustomersPage.tsx` — Company Name replaces Customer Name + Company fields; required + inline validation + disabled submit on empty.
- `webapp/src/api.ts` — `apiListQuotes()` now normalizes snake_case DB rows → camelCase `QuoteListItem`. Root cause: `GET /api/quotes` returns raw SQLite rows (snake_case) but TypeScript type expected camelCase; `formatUSD(undefined)` threw, blanking the page.
- `webapp/src/pages/QuotesPage.tsx` — defensive `?? 0` on grandTotal, `?.` guard on updatedAt date.

### Gotchas & Patterns

- **routes-quotes.js `GET /` returns raw snake_case rows** — `res.json(rows)` with no transformation. Every other route (`/customers`, `/quotes/:id/quotes`) does toCamel. Watch for this mismatch whenever adding new list endpoints; normalize in `api.ts` layer.
- **textInput() helper didn't forward `required` to `<input>`** — only showed the asterisk. Always check helper components pass HTML attrs through; fixed by adding `required={opts?.required}`.
- **CustomerWritable.company is optional** — sending `company: null` in formToWritable is safe and clears the field for new records. Existing records with a company value will retain it until edited.
- **Server test failures (14 SQLite ON CONFLICT errors)** are pre-existing, unrelated to UI changes — Rusty's domain (vendor_prices schema migration issue).
- **Build validated**: `npm run build` exits 0, 54 modules, no TS errors after all three fixes.

📌 **2026-05-14T19:45:20Z: Reuben Full App Assessment Complete**

Reuben delivered comprehensive domain assessment of webapp vs. VMBC workbook. Key findings: 2 critical gaps (no parametric BOM generation engine; Beams/Take-off sheet missing), 2 pricing bugs (labor applied to cold-formed components, frame-opening cost method broken), 14 terminology improvements, 17-item prioritized backlog (6 critical, 6 important, 5 nice-to-have), and 1 reusable PEMB proposal anatomy skill. Assessment merged to `.squad/decisions.md`. Backlog ready for sprint planning. See `.squad/decisions.md` for full 17-item breakdown.


## 2026-05-15 — Issue #13 Sales Tax UI (sprint 3)

Wired sales tax UI on QuotationPage. Livingston owned the type + calc; I owned the page + reducer action.

### Files Changed
- webapp/src/context.tsx — added SET_SALES_TAX action with optional ate and included fields. Single-action update keeps the reducer surface compact.
- webapp/src/pages/QuotationPage.tsx — added Tax Rate (%) input + Include-in-total checkbox above the print area, plus conditional `Sales Tax (X.XX%): Y line in itemized table when included, replacing the static "Sales Tax Not Included" note when excluded.

### Decisions
- **Input as percent, stored as decimal.** User types `8.25`; we persist `0.0825` (Livingston's chosen type). Avoids confusing zero-prefix decimals in the UI.
- **Local input string state.** Keeps the field forgiving (trailing dot, empty) while still validating `0 ≤ pct ≤ 100` inline and dispatching only on valid values.
- **Sales tax controls live OUTSIDE printRef.** They're editor chrome, not part of the printable proposal. Only the rendered tax line/note prints.
- **No new lib.** Plain `<input type="number">` and `<input type="checkbox">` matches existing style.

### Gotchas
- `storage.ts` `loadConfig` already merges defaults over old saves via spread, so existing localStorage configs auto-pick up `salesTaxRate: 0.0825` / `salesTaxIncluded: false` without a migration.
- `costs.salesTaxIncluded` mirrors `config.salesTaxIncluded` per Livingston's calc — render off the breakdown, not the config, so display is always in sync with what was computed.

Build green: `npm run build` clean (54 modules, no TS errors).

## 2026-05-15 — Issues #11 + #9: Cost Metrics + Legal Language (squad/11-9-linus)

Both issues batched into one branch/PR to avoid same-file merge contention on QuotationPage.tsx.

### Files Changed
- `webapp/src/pages/QuotationPage.tsx` — two commits:
  1. **#11**: Cost Metrics block ($/sqft, total $/lb, steel $/lb) below grand total
  2. **#9**: Terms & Conditions `<details>` section (collapsible on screen, always expanded in print/PDF)

### Decisions
- **Steel weight source = `costs.structuralWeight`** (full-quote sum across all structural categories). BOM engine's `structuralWeightLbs` covers main framing only — wrong scope for the sanity-check metric.
- **Steel subtotal = `costs.structuralTotal`** (structural materials only; excludes components, insulation, fasteners, labor, overhead). Matches PEMB industry convention.
- **Zero guard**: metrics only render when denominator > 0 to prevent division-by-zero on empty quotes.
- **`<details>` print behavior**: print CSS hides `<summary>` and forces all children visible with `display: block !important`, so legal text always appears in PDF regardless of collapsed state.
- **Deposit = 30%** per task spec (overrides SKILL.md's 50/40/10 split — closer to VMBC practice).

### Build & Tests
- `npm run build` — exit 0, 54 modules, no TS errors
- `npm test` — 110 tests passed (78 bomEngine + 32 calculator)

## 2026-05-15 — Issues #12 + Auto-BOM Display (squad/12-bom-display)

Two features in one PR, two commits.

### Files Changed
- `webapp/src/pages/QuotationPage.tsx` — both commits

### Commit 1: Issue #12 — Quote # + Rev in header
- Added `Q-{active_quote_id}` and `Rev 1` (placeholder) to the top-right of the printable quotation header bar.
- Source: `localStorage.getItem('active_quote_id')` — consistent with Layout.tsx / MenuPage.tsx pattern.
- No revision_number in schema; `Rev 1` is fixed placeholder. Inbox note filed at `.squad/decisions/inbox/linus-issue12-bom.md` for Rusty to add `revision_number` column.

### Commit 2: Auto-BOM display panel (Livingston PR #29 follow-up)
- Added collapsible `<details>` section "Bill of Materials (Auto-Calculated)" powered by `computeFullBom(config)` from `bomEngine.ts`.
- Table: Description | Qty | Unit | Unit Cost | Extended.
- Engineer-flagged items (MF-01, MF-03) highlighted amber.
- Always-expanded in print/PDF via `details.bom-section` print CSS pattern.
- Calculation notes footnote from Livingston's inbox assumptions.
- Chose Option B (read-only panel); Option A deferred to DesignPage sprint.

### Build & Tests
- `npm run build` — ✅ exit 0, 55 modules, no TS errors
- `npm test` — ✅ 226 tests passed (78 bomEngine + 116 bomEngine.secondary + 32 calculator)

## 2026-05-15 — Issue #5 Stair UI (Sprint 2, squad/5-stair-calc)

Wired Livingston's stair engine into a parametric form on StructuralPage. AC item 4 of issue #5 shipped; engine items (1, 2, 3, 5, 6) untouched.

### Files Changed
- `webapp/src/pages/StructuralPage.tsx` — full rewrite: stub catalog table → parametric form (left) + live BOM table & cost summary (right).
- `webapp/src/context.tsx` — added `stairConfig` slice + `setStairConfig`.
- `webapp/src/storage.ts` — added `createDefaultStairConfig` / `saveStairConfig` / `loadStairConfig` (localStorage key `building-estimator-stair-config`).
- `webapp/src/__tests__/stairDefaults.test.ts` — new smoke test (3 cases) locking the default stair config to workbook canonical grand total \,897.88 / 22,571.336 lb.

### UI shape
- Inputs: levels (1–5 select), FtF height, width, tread run, per-flight tread counts (resize with levels), rails (4 toggles + pickets), mid-landing (toggle + W/L + ABC guards), floor-landing (W/L + ABC guards). Inline validation (no negatives, levels 1–5).
- Preview: cost summary (Direct / Labor / Detailing / Hauling / Freight / Overhead → Sub Total → Profit 10% [stair-specific badge] / Commission → Grand Total) + collapsible `<details open>` BOM table mirroring QuotationPage's pattern. Columns: Description (ID + material subtitle) / Qty / Unit / Length-or-Weight / Unit Cost / Extended.
- Auto-save on every edit via existing context useEffect pattern.

### Deferred (filed in inbox)
- SVG stair plan diagram — punted to follow-up issue.
- Push parametric stair rows into `config.components` (so QuotationPage's main cost roll-up picks them up) — needs Reuben sign-off on whether the stair grand total stays standalone or merges. Suggested follow-up.
- Guard-rail height field — engine doesn't accept one; omitted to avoid misleading input.

### Build & Tests
- `npm run build` — ✅ exit 0, 56 modules, no new warnings.
- `npm test` — ✅ **336 tests passed** (was 333 → +3 from `stairDefaults.test.ts`).


## Sprint 2 — Issue #14 freight UI (squad/14-freight-calc)

Wired auto/manual freight UI on SummaryPage on top of Livingston's resolveFreight engine. Pulled freight out of the generic numeric-overheads .map() and gave it its own section with a checkbox toggle (Auto-calculate distance × rate). Auto mode shows Distance (km) + Rate ($/km) + read-only Computed Freight; manual shows the flat $ input. All four fields persist across toggle (display switch, not value reset). Removed Livingston's transitional 'as number' cast — the narrowed loop union makes it unnecessary.

### Files Changed
- `webapp/src/pages/SummaryPage.tsx` — refactored overheads section, added dedicated Freight group.
- `webapp/src/__tests__/freightUI.test.ts` — 5 new tests (default state, toggle, legacy fallback, computed math, value preservation).
- `.squad/decisions/inbox/linus-issue14-freight-ui.md` — layout + toggle-style + value-preservation notes.

### Build & Tests
- `npm run build` — ✅ 0 TS errors.
- `npm test` — ✅ **350 tests passed** (was 345 after Livingston → +5).
