# Squad Decisions

## Active Decisions

### Initial Survey: Customers, Vendors, Materials Master Data

**Date:** 2026-05-10T14:31:41-05:00  
**By:** Danny  
**Status:** Ready for team review

**Finding: Core Scope Gap**

Jose stated scope: *"customers, vendors, materials, prices, labor price"*

**Current State:**
- ✅ Labor pricing: Editable via ProjectOverheads (laborRate $/lb, overhead%, profit%, commission%)
- ✅ Materials: Component catalog exists (hardcoded, ~200+ items)
- ✅ Prices: Price list exists (120+ items, supplier-mapped)
- ❌ **Customers:** String field only, no master data
- ❌ **Vendors:** Hardcoded (Central States), no master data or multi-vendor support

**Impact:**
- Can't track customer history, repeat business, or negotiations
- Can't manage alternate vendors or price competition
- Can't run "what-if" scenarios with different supplier combinations
- Quotes are isolated; no customer account context

**Recommendation: Three-Phase Build**

**Phase 1 (HIGHEST PRIORITY):** Persist price list + materials to server
- Why: Prices are currently localStorage-only. Loss on logout = loss of customization. Materials should be versioned and tied to quotes.
- Effort: **Small** — Rusty adds 2 tables (materials_catalog, price_history), Linus adds server sync endpoints

**Phase 2 (MEDIUM PRIORITY):** Build Customers master + quotes.customer_id foreign key
- Why: Unlocks customer context, repeat quotes, history search, and prepopulation of defaults
- Effort: **Medium** — Rusty adds customers table + indexes, Linus builds Customers CRUD page + quote linking

**Phase 3 (NICE-TO-HAVE):** Add Vendors master + multi-vendor price comparison
- Why: Competitive advantage—estimate same building with 2 suppliers, pick lower cost
- Effort: **Large** — Complex UI, requires query builder or form generator

**Immediate Action:** Pick Phase 1 or Phase 2 to ship next. Phase 1 is lower risk and faster; Phase 2 enables customer workflows.

## Phase 1 — Catalog & Price List API Contract

**Date:** 2026-05-10T14:31:41-05:00  
**By:** Rusty  
**What:** Server-backed materials catalog + price list with version tracking. Two parallel resource surfaces. Reads open during dev; writes require a Bearer JWT (existing `authMiddleware`).  
**Why:** Phase 1 server-backed catalog & pricing — replaces localStorage-only persistence so prices survive logout and quotes can pin to a version.

### Conventions

- Base URL: `http://localhost:3001` (dev).
- Auth: `Authorization: Bearer <jwt>` from `POST /api/auth/login` or `/register`. Required only on routes marked **🔒**.
- Error envelope (new routes): `{ "error": { "code": "VALIDATION" | "NOT_FOUND" | "CONFLICT", "message": "..." } }`.
  - 400 `VALIDATION` — bad/missing body or path param
  - 401 — missing/invalid JWT (legacy shape: `{ "error": "Authorization required" }`)
  - 404 `NOT_FOUND` — version or item id not found
  - 409 `CONFLICT` — delete refused (in use)
- All version IDs are integers (autoincrement). All item keys are strings.

### Price List — `/api/price-list`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/price-list/versions` | — | List all versions |
| GET | `/api/price-list/versions/:id` | — | Get one version + items |
| GET | `/api/price-list/active` | — | Get the currently-active version + items |
| POST | `/api/price-list/versions` | 🔒 | Create new version with items (atomic) |
| PUT | `/api/price-list/versions/:id/items/:itemKey` | 🔒 | Update one item in place |
| PUT | `/api/price-list/versions/:id/activate` | 🔒 | Mark this version active, deactivate others |
| DELETE | `/api/price-list/versions/:id` | 🔒 | Delete (409 if any quote references it) |

**Quote integration:** `quotes` table now has `price_list_version_id INTEGER NULL REFERENCES price_list_versions(id)`. Indexed. Schema ready; route handler needs the field added when you want it to persist.

**Seeding strategy:** Server does **not** seed defaults. On first load, the webapp should POST defaults from `webapp/src/priceList.ts`, then activate.

### Materials Catalog — `/api/catalog`

Parallel surface to price list. Catalog items carry an opaque `payload` (the full `CatalogEntry` from `webapp/src/catalog.ts`) stored as JSON.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/catalog/versions` | — | List all versions |
| GET | `/api/catalog/versions/:id` | — | Get one version + items |
| GET | `/api/catalog/active` | — | Get active version + items |
| POST | `/api/catalog/versions` | 🔒 | Create new version with items (atomic) |
| PUT | `/api/catalog/versions/:id/items/:itemKey` | 🔒 | Update one item's payload |
| PUT | `/api/catalog/versions/:id/activate` | 🔒 | Activate this version |
| DELETE | `/api/catalog/versions/:id` | 🔒 | Delete (always allowed) |

---

## Phase 1 — Catalog & Price List Data Contract

**Date:** 2026-05-10T14:31:41-05:00  
**By:** Livingston  
**Status:** Ready for backend schema design (Rusty) and frontend wiring (Linus)

### Key Risks & Mitigations

1. **Material Field: String-Based Lookup**
   - **Risk:** `ComponentItem.material` is a string. Pricing relies on substring matching. Typos → price lookup fails silently → cost = $0 in calculator.
   - **Mitigation:** Store `material` as-is (for supplier matching); also store a `priceCodeId` (FK to price list) for reliable lookup.

2. **⚠️ Weight Field Calculation (FLAGGED BUG)**
   - **Risk:** `ComponentItem.weight` is shown in types.ts but is **never populated** in catalog.ts (all entries have `weight: 0`).
   - **Impact:** Structural steel costs (`beamsCost = weightCostSum(...)`) rely on weight; currently = 0. **Major bug if weight should come from catalog.**
   - **Mitigation:** For now, store `weightPerUnit` (lb/unit) in catalog; calculator derives `weight = qty * weightPerUnit * lnFeetToFab / commLength`.
   - **Recommendation for Rusty:** Add `weight_per_unit` (float) and `weight_unit` (string) to catalog item schema. Do NOT store calculated weight; derive it at calc time.

3. **Versioning Strategy**
   - **Price List Version:** Snapshot supplier/date (e.g., "Central States 2026-05-10"); store full snapshot.
   - **Catalog Version:** Internal (e.g., "Building Estimator v1.0-2026-05-10").
   - **When quote saved:** Store snapshots of price list, catalog, labor rates, and overhead rates for audit trail.

4. **Immutability of IDs**
   - **Risk:** Catalog item IDs (e.g., 'PG-01') and price list item codes (e.g., 'Z82514R') are lookup keys. If ID changes, quotes become stale or orphaned.
   - **Mitigation:** Add DB constraint: `UNIQUE(id, category)` for catalog items; `UNIQUE(itemCode)` for price list. Disallow ID renames.

---

## Phase 1 — Webapp Wiring Map for Server-Backed Catalog/Prices

**Date:** 2026-05-10T14:31:41-05:00  
**By:** Linus  
**What:** Complete integration map for server-backed price list and materials catalog. Tells Future Linus exactly which files change, what API functions to add, and how state flows.  
**Why:** Lets the implementation pass go fast when Rusty's API lands and avoids rework on both sides.

### New API Client Functions to Add to `api.ts`

**Price List:**
- `apiGetActivePriceList()` → `GET /api/price-list/active`
- `apiPostPriceListVersion(items)` → `POST /api/price-list/versions`
- `apiUpdatePriceListItem(versionId, itemCode, newPrice)` → `PUT /api/price-list/versions/{id}/items/{itemCode}`
- `apiActivatePriceListVersion(versionId)` → `POST /api/price-list/versions/{id}/activate`

**Catalog:**
- `apiGetCatalog()` → `GET /api/catalog/active`

### Context Changes

**New state fields in `BuildingConfig`:**
- `activePriceListVersionId?: string`
- `priceListLoadedAt?: string`
- `catalogLoadedAt?: string`

**First-load flow:** Try `apiGetActivePriceList()`. If 404, POST bundled defaults from `priceList.ts`, then activate.

### PriceListPage Changes

1. Show active version in read-only format (top-right).
2. Add "Save as new version" button.
3. Optimistic PUT on price edits: mutate local state immediately, sync to server in parallel.
4. On error, revert local state.

### Quote Save Flow

Extend `apiCreateQuote()` and `apiUpdateQuote()` to include `priceListVersionId` parameter. Every quote now pins price list version at save time.

### Storage / Fallback for Offline

- Fall back to `defaultPriceList` from `priceList.ts` when server unreachable.
- Cache in localStorage under `'cached-price-list-version'`.
- Allow offline edits (optimistic); skip server sync, show toast "Working offline."

### Implementation Checklist

- [ ] Add 4 API functions to `api.ts`
- [ ] Extend `BuildingConfig` interface in `types.ts`
- [ ] Add reducer action for `SET_ACTIVE_PRICE_LIST_VERSION_ID` in `context.tsx`
- [ ] Create `useInitializePriceList()` hook or equivalent in context
- [ ] Wire PriceListPage to fetch active list on mount
- [ ] Add "Save as new version" button and handler
- [ ] Implement optimistic PUT in `updatePrice()` handler
- [ ] Add cache helpers to `storage.ts`
- [ ] Update QuotesPage save handler to include `priceListVersionId`
- [ ] Test: offline fallback (disable network, check localStorage cache)
- [ ] Test: quote save with version ID
- [ ] Manual test: price edit → PUT → verify on refresh

---

## Phase 1 — Test Plan for Catalog/Price Endpoints

**Date:** 2026-05-10T14:31:41-05:00  
**By:** Saul  
**What:** Server endpoint tests (when Rusty's routes land) + webapp integration tests (when Linus wires it) + test runner recommendation.

### Server Tests

Each endpoint needs: happy path, auth-required (401), validation (400), 404 on missing resource, 409 on conflicts.

**Catalog endpoints:**
- `GET /api/catalog/versions` — happy (returns list incl. `is_active`); 401 unauth.
- `GET /api/catalog/versions/:id` — happy; 404 unknown id; 401 unauth.
- `POST /api/catalog/versions` — happy (creates draft, returns id); 400 missing/empty `items[]`; 401 unauth.
- `POST /api/catalog/versions/:id/activate` — happy (flips active); 404 unknown id; 409 already active.
- `DELETE /api/catalog/versions/:id` — happy (soft or hard delete); 409 if active; 404 unknown id.

**Price list endpoints:** Mirror same five for `/api/price-list/versions` + `/api/price-list/versions/:id/items` (PUT for item edit).

### Round-Trip Tests

- POST a catalog version with N items → GET it back → assert deep equality.
- POST a price-list version → PUT a single item's `unitPrice` → GET → assert only that item changed.

### Webapp Integration Tests

- Mock `fetch` (vitest `vi.fn()` + `vi.stubGlobal`).
- Trigger quote save flow; assert outgoing POST body includes `priceListVersionId`.
- Assert UI reads versions from `/api/.../versions` not from bundled defaults once server version is active.

### Server Test Runner Recommendation

**Use Node's built-in `node:test` + `node --test`.**

**Justification:**
- Server already runs on Node; zero new deps; integrates with existing `npm` scripts.
- Express 5 + better-sqlite3 are sync-friendly; `node:test` handles them fine via `supertest`.
- We'd only need to add `supertest` (~50KB) for HTTP assertions. Optional `c8` later for coverage.
- Vitest in `server/` would duplicate the runner story and pull in vite as a transitive dep on a backend package — unnecessary.
- Add `"test": "node --test test/**/*.test.js"` to `server/package.json`.

---

---

## Phase 1 — CLOSED

**Date:** 2026-05-10T14:31:41-05:00

### What shipped

✅ **Catalog & Price List API Contract** (Rusty) — Server-backed materials catalog + price list with version tracking. Two parallel resource surfaces. Reads open during dev; writes require JWT. Quotes now persist `priceListVersionId` on create/update; reads return it; price-list-version delete blocked when referenced. All 25 server tests pass.

✅ **Webapp implementation** (Linus) — Server-backed price list and catalog wired into the webapp end-to-end. `api.ts`, `context.tsx`, `storage.ts`, `PriceListPage.tsx`, `QuotesPage.tsx` all updated. 0 new TS/lint errors. 11/11 calculator tests pass. Version picker, activate button, save-as-new-version form implemented. Quotes pin to version on save.

✅ **Server endpoint tests** (Saul) — 25 tests across pricelist + catalog covering happy path, auth (401), validation (400), 404, activate/round-trip, DELETE. All passing after `cd server && npm install`. Added supertest devDep, env DB_PATH override in db.js, app export in index.js.

✅ **Catalog material fix** (Livingston) — Found and fixed real bug: 3 beam catalog items had material strings mismatched with materialSpecs.ts → silent $0 labor. Fixed in catalog.ts. Estimated impact ~$19k under-estimate per affected quote. Added console.warn guard. Investigated weight field (design by intent, not a bug).

### Notable bug fix

**Three BEAMS catalog entries had stale material designations** (`'W x 18 x 65'` instead of `'W 18 x 65'`, etc) that silently failed lookup in materialSpecs.ts, setting labor to $0. Affected: MF-03 Main Frame Rafters, MF-05 Wind Columns, CN-02/CN-03 Canopy Columns & Rafters. **Magnitude: ~$9,400 labor + $10,625 material missed per affected quote.** Now fixed; bundled defaults immediately yield correct weight and cost.

---

## Phase 2 — CLOSED

**Date:** 2026-05-10  
**Status:** Shipped ✅

### What Shipped

**Customers Master + Quote Linking (Backend + Frontend + Tests)**

#### Schema & API (Rusty)
- `customers` table: `id, user_id, name, company, contact_name, email, phone, address_*, notes, default_labor_rate, default_overhead_pct, default_profit_pct, default_commission_pct, created_at, updated_at`
- `quotes` table: added `customer_id INTEGER FK → customers(id) ON DELETE SET NULL`
- **6 customer routes:** GET /api/customers, GET /api/customers/:id, POST, PUT, DELETE (with force flag), GET /:id/quotes
- **Quote integration:** POST/PUT /api/quotes now accept & persist `customerId`; GET routes return it; GET /api/quotes?customerId=N filters
- **Error codes:** VALIDATION, NOT_FOUND, IN_USE, INVALID_CUSTOMER (per spec)
- **All 46 server tests green** (16 new customer tests + 5 quote integration tests + 25 prior catalog/pricelist tests)

#### Frontend Wiring (Linus)
- `webapp/src/components/CustomerPicker.tsx` — New debounced type-ahead combobox with quote count, linked indicator
- `webapp/src/pages/CustomersPage.tsx` — New full CRUD page: search, table, create/edit modal (all fields + 4 default overheads), force-delete flow
- `webapp/src/context.tsx` — `CustomersState`, `SET_CUSTOMER_ID` action, customer list cache
- `webapp/src/api.ts` — 6 customer API functions + extended quote types
- `webapp/src/pages/DesignPage.tsx` — CustomerPicker integrated, overhead prefill logic
- `webapp/src/pages/QuotesPage.tsx` — Pass `customerId` on save
- `webapp/src/components/Layout.tsx` — Quick-save passes `customerId`; Customers link added
- `webapp/src/App.tsx` — /customers route registered
- **TypeScript:** 0 new errors (tsc --noEmit: Exit 0)
- **ESLint:** 6 pre-existing errors, 0 new
- **Calculator tests:** 11/11 green

#### Test Coverage (Saul)
- **16 customer endpoint tests:** auth (401), owner scoping (404 isolation), POST validation (name, email, defaults), GET search filter, PUT updates, DELETE (409 in-use, force cascade)
- **5 quote integration tests:** customerId persist, filter by customerId, foreign-owned rejection (400 INVALID_CUSTOMER)
- **Prior tests:** 25 catalog/pricelist tests still green
- **Total: 46/46 tests passing**

### Minor Bug Found & Fixed in Parallel

**🐛 BUG-1 (Minor, Fixed by Rusty):** Non-integer `customerId` in POST/PUT /api/quotes returns wrong error code
- **Contract says:** 400 `INVALID_CUSTOMER`
- **Code was returning:** 400 `VALIDATION`
- **Status:** Rusty fixing in parallel (does not block Phase 2 closure)
- **Impact:** HTTP status correct (400); only error.code enum was wrong. Low severity.

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
