# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — PEMB cost estimation tool. Browser app with pages for Design, Price List, Main Framing, Components, Insulation, Fasteners, Stairs, Summary, and a printable Quotation with SVG diagrams.
- **Stack:** React 19, TypeScript, Vite, Tailwind v4, react-router-dom v7. State via React Context, persistence via localStorage.
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-11 — Production architecture greenlight pending.** Danny completed Azure architecture proposal: Tier 1 = App Service B1 + SQLite + Key Vault (~$13-15/mo). Tier 2 (10+ users) = PostgreSQL Flex + scaled App Service. DB path already env-driven. Awaiting Jose greenlight. Linus handles API URL config; Rusty's DB/API changes if needed post-approval.

📌 **2026-05-10 (Phase 2 CLOSED):** Customers frontend wired, live. Phase 2 CLOSED: customers live, 57 tests green (46 server + 11 webapp), quote↔customer linking working. Phase 3 (vendors/comparison) starting.

📌 **2026-05-10 (14:31 UTC):** Phase 1 CLOSED. Server-backed catalog & pricing live, quotes pin to version. 36 tests green. Catalog bug fixed: 3 beam material strings corrected (recovered ~$19k under-estimate per quote). Ready for Phase 2 (Customers).

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

## 2026-05-14T19:22:29Z: UI/API Fixes Sprint (w/ Rusty)

**Parallel session:** Linus (374s) + Rusty (692s) resolved 5 critical issues.

**Linus Deliverables (3 files):**
- LoginPage: Removed Sign In / Register tab, Display Name field, register branch
- CustomersPage: Renamed "Customer Name" → "Company Name" (underlying `name` field), added HTML `required`, disabled submit on empty, removed Company column
- QuotesPage + api.ts: Fixed snake_case → camelCase mapping; added defensive guards (`?? 0`, `?.` for dates)

**Rusty Deliverables (parallel backend fixes):**
- db.js: Added all missing phase 2/3 table DDLs + UNIQUE constraint on vendor_prices
- index.js: Global error middleware (JSON errors, not HTML 500s)
- routes-quotes.js: Wired customerId in POST/PUT/GET

**Outcomes:**
- Webapp build clean (54 modules, no TS errors)
- Server tests: 74/74 pass (was 60/14)
- POST /api/customers → 201 with row in DB
- Quotes page no longer blank after opening

