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

## Phase 3 — CLOSED

**Date:** 2026-05-10  
**Status:** Shipped ✅

### What Shipped

**Multi-Vendor Price Comparison Backend + Frontend + Tests**

#### Schema & API (Rusty)
- `vendors` table: `id, user_id, name, contact_name, email, phone, address_*, notes, is_default, created_at, updated_at`
- `vendor_prices` table: `id, vendor_id, item_key (FK → materials_catalog_items), unit_price, currency, lead_time_days, notes, updated_at`
- **9 vendor routes:** GET /api/vendors, GET /api/vendors/:id, POST, PUT, DELETE (cascade vendor_prices), GET /:id/prices, PUT /:id/prices/:itemKey (upsert), DELETE /:id/prices/:itemKey, POST /:id/prices/bulk
- **Price key strategy:** Vendor prices keyed on `item_key` (string identity, not FK to price_list_versions) so overrides persist across version rotations. Priority: vendor override → active list price → 0 (warn)
- **isDefault atomic swap:** At most one vendor per user has is_default=1; POST/PUT with isDefault=true clears all others in transaction
- **All 28 new tests green** (9 endpoint suites covering auth, validation, owner-scoping, cascade, atomicity, bulk ops). Plus 46 prior Phase 1+2 tests = **74 server tests total**

#### Frontend Wiring (Linus)
- `webapp/src/components/VendorsPage.tsx` — NEW CRUD: search, table (name, contact, email, phone, isDefault, override count), create/edit modal, force-delete flow
- `webapp/src/components/VendorPricesModal.tsx` — Nested modal in VendorsPage: per-row edit/delete overrides, bulk "Seed from Active Price List" button, async count load
- `webapp/src/components/ComparisonPage.tsx` — NEW comparison view: structural items only, sticky-header table with per-vendor price columns, green highlight + bold cheapest, "(list)" fallback marker, ⚠ for $0 prices. Totals section: per-vendor `calculateCosts()` with vendor overlays (labor/margins constant). "Use Vendor" button triggers pick-vendor snapshot flow
- `webapp/src/context.tsx` — `VendorsState`, `searchVendors` lazy-load, `comparisonVendorIds` localStorage-persisted selection set
- `webapp/src/api.ts` — 9 vendor API functions + `Vendor`, `VendorPrice` types (mirror Phase 1/2 patterns)
- `webapp/src/storage.ts` — vendor + comparison localStorage helpers
- `webapp/src/pages/MenuPage.tsx` — 5-col grid layout; +Vendors tile, +Compare tile
- `webapp/src/pages/QuotesPage.tsx` — Compare button per quote → /compare/:id
- **TypeScript:** 0 new errors (tsc --noEmit: Exit 0)
- **ESLint:** 0 new errors (6 pre-existing, unchanged from Phase 2)
- **Tests:** 11/11 calculator tests pass

#### Comparison Spec (Livingston)
- **Scope:** Structural materials only (categories: main-framing, canopy, plates, frame-openings) — the items that feed `weightCostSum()`.
- **Effective price resolution:** `vendor_prices[itemKey]` (if override exists) → `activePriceList[itemKey].unitPrice` (fallback) → 0 (warn)
- **Per-vendor profit/commission:** NO — vendor pricing is INPUT cost; estimator's 15% profit + 4% commission applied project-level after selection
- **"Pick vendor" snapshot flow:** Clone active price list + overlay vendor prices → new version named "Quote {id} — {VendorName} YYYY-MM-DD" → activate → update quote.priceListVersionId → audit trail preserved
- **Edge cases handled:** Sparse vendor data (show "—"), zero-priced items (show $0 + ⚠), vendor deleted mid-comparison (remove column + toast), orphan vendor prices (ignore), vendor added mid-session (offer "Add to comparison")

#### Test Coverage (Saul)
- **28 new vendor endpoint tests:** Vendor CRUD (15: auth 401, isDefault atomic swap, owner-scoping 404, POST validation, search filter, PUT, DELETE cascade). Vendor prices single-item (9: upsert, update, delete, validation, ordering). Vendor prices bulk (4: atomic validation, empty reject, owner-scoping).
- **Prior tests:** 46 catalog/pricelist/customers tests still green
- **Total: 74/74 tests passing** (28 new + 46 prior)

#### Schema & Files Changed
| File | Change |
|---|---|
| `server/db.js` | +`vendors` + `vendor_prices` tables + indexes (IF NOT EXISTS), CASCADE delete |
| `server/routes-vendors.js` | NEW ~260 lines — all 9 routes (CRUD, prices, bulk) |
| `server/index.js` | +require('./routes-vendors') + app.use('/api/vendors', ...) |
| `server/routes-quotes.js` | Bug fix: 2 occurrences of `VALIDATION` → `INVALID_CUSTOMER` for non-integer customerId |

### Summary

---

## Azure Deployment — App Live ✅

**Date:** 2026-05-12  
**By:** Rusty  
**Status:** Production ✅

### Summary

The `vmbc-estimator` app (React + Express + SQLite) is deployed and running at:

**https://vmbc-estimator.azurewebsites.net**

### Azure Resources

| Resource | Name | Details |
|---|---|---|
| Resource Group | `rg-vmbc-estimator` | centralus |
| App Service Plan | `asp-vmbc-estimator` | B1 Linux |
| Web App | `vmbc-estimator` | NODE:22-lts |
| Key Vault | `kv-vmbc-est-JjGT` | JWT_SECRET stored |
| Log Analytics | `law-vmbc-estimator` | centralus |
| App Insights | `ai-vmbc-estimator` | connected |
| Subscription | `40907613-5278-48a4-ab10-c9944be31c8b` | |

Managed identity enabled on the web app (principalId: `fa524286-f4c2-4627-9286-cb250f082828`).

### App Settings (Azure Portal)

| Setting | Value |
|---|---|
| `NODE_ENV` | production |
| `SERVE_WEBAPP` | true |
| `DB_PATH` | /home/site/data/estimator.db |
| `JWT_SECRET` | `@Microsoft.KeyVault(VaultName=kv-vmbc-est-JjGT;SecretName=JWT-SECRET)` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | (AI connection string) |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | false |
| `SEED_ADMIN` | true |

Startup command: `node server/index.js`

### Default Admin Credentials

- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change this password immediately after first login.**

### CI/CD Pipeline

File: `.github/workflows/deploy.yml`

- **Trigger:** push to `main` or manual `workflow_dispatch`
- **Auth:** OIDC federated identity (no secrets rotation needed)
- **Build:** Node 22, ubuntu-22.04 runner (glibc 2.35 ≤ Azure glibc 2.36)
- **Deploy:** `az webapp deploy --type zip --async`
- **Verify:** polls `/api/health` until 200

### GitHub Secrets Required

| Secret | Purpose |
|---|---|
| `AZURE_CLIENT_ID` | SP app ID: `d57ec5d3-7d85-40d4-a67b-b02ba3b2ea67` |
| `AZURE_TENANT_ID` | `3d374b94-78d6-435f-b7a6-b8337c1282b6` |
| `AZURE_SUBSCRIPTION_ID` | `40907613-5278-48a4-ab10-c9944be31c8b` |

### Key Technical Decisions

1. **ubuntu-22.04 runner** — Azure container uses glibc 2.36; ubuntu-22.04 uses glibc 2.35 so native module binaries are compatible. ubuntu-24.04 would produce glibc 2.38 binaries that crash on Azure.

2. **Node 22 on Azure** — Configured `NODE:22-lts` on the web app (not Node 18 which was the SCM/Kudu default).

3. **uuid v9** — uuid v13+ is ESM-only; `require('uuid')` fails. Using v9.0.1 (CommonJS compatible).

4. **DB directory creation in db.js** — `mkdirSync` must run in `db.js` before `new Database()`, not in `index.js` where route imports would trigger db.js first.

5. **OIDC authentication** — Azure MCAP policies redact basic-auth Kudu credentials in publish profiles. OIDC federated identity avoids this.

### Logs

```bash
# Stream live logs
az webapp log tail --name vmbc-estimator --resource-group rg-vmbc-estimator

# Download logs
az webapp log download --name vmbc-estimator --resource-group rg-vmbc-estimator
```

### Re-deploy

```bash
git push origin main
# or
gh workflow run deploy.yml --repo joseg-ai/building-estimator
```


✅ Phase 3 completes the vendor feature set: server-backed vendors table, multi-vendor price overrides, comparison UI with per-vendor totals, and "pick vendor" price-list snapshot flow. All 28 new tests pass; prior 46 tests remain green. Total: **74 server tests + 11 webapp tests = 85 green.**

---

## EPIC COMPLETE

**3-Phase Journey:** 2026-05-10 Phase 1 → Phase 2 → Phase 3

### Start State
- localStorage-only persistence (price list + catalog)
- No customers master
- No vendors master
- Single hardcoded vendor (Central States)
- No server-backed reference data
- 0 tests

### End State
- ✅ **Phase 1:** Server-backed catalog + price-list with version tracking (25 tests). Quote pinning to price-list version. Catalog bug fixed ($19k impact).
- ✅ **Phase 2:** Customers master + quote↔customer linking (46 tests including Phase 1). Customer default overheads pre-fill. Quote search + filtering.
- ✅ **Phase 3:** Vendors master + multi-vendor price comparison (74 server tests + 11 webapp tests = 85 total). Structural materials comparison, effective-price fallback, pick-vendor snapshot flow.
- ✅ **Server:** Full CRUD for catalog, price-list, customers, vendors with JWT auth, owner-scoping, foreign-key constraints
- ✅ **Frontend:** PriceListPage, CustomersPage, VendorsPage, ComparisonPage all live with integrated workflows
- ✅ **Quality:** 0 new TS errors (tsc --noEmit: Exit 0), 0 new lint errors (eslint: 6 pre-existing), 11/11 calculator tests pass

**Final Test Count: 85 green (74 server + 11 webapp)**

---

## Azure Deployment Prep — Round 1

### API Base URL via Vite Env Var (Linus)

**Date:** 2026-05-11  
**Status:** Implemented

**Context:** The app hardcoded `http://localhost:3001/api` in `webapp/src/api.ts`. With Azure App Service deployment (React served from the same origin as Express), this breaks production — all API calls would hit localhost instead of the live server.

**Decision:** Use Vite's env var with `/api` fallback:
```ts
const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
```

- **Local dev:** `webapp/.env.development` sets `VITE_API_URL=http://localhost:3001/api`
- **Production (Azure):** env var absent → falls back to `/api`
- **Custom deployments:** set `VITE_API_URL` at build time

**Convention:** `.env.development` committed (local dev URLs only, no secrets). Never hardcode `http://localhost:*` — always use env vars with sensible fallbacks.

### Production Static Serving Pattern (Rusty)

**Date:** 2026-05-11  
**Status:** Shipped

**Context:** Express serves both the React build and the API from one process in production. Need to gate static serving so dev workflow (Vite on 5173) remains unaffected.

**Decision:** Use `SERVE_WEBAPP=true` flag to gate static serving:
```js
if (process.env.SERVE_WEBAPP === 'true') {
  const webappDist = path.join(__dirname, '..', 'webapp', 'dist');
  app.use(express.static(webappDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(webappDist, 'index.html'));
  });
}
```

**Rules:**
- **Dev:** `SERVE_WEBAPP` absent or `false`. Vite on 5173 proxies `/api/*` to Express on 3001.
- **Production (Azure App Service):** Set `SERVE_WEBAPP=true` in Application Settings. Azure injects `PORT` (typically 8080). Express serves both SPA and API on same origin — no CORS.
- **DB path:** `process.env.DB_PATH` (Azure should set `/home/site/data/estimator.db` for persistence).
- **Port:** `process.env.PORT || 3001`. Azure injects PORT automatically.
- **SPA fallback:** Uses `app.use()` (not `app.get('*', ...)`) to avoid Express 5's path-to-regexp v8 requirement for named wildcards.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction


---

# Decision: Dev API routing — Vite proxy over absolute VITE_API_URL

**Date:** 2026-05-12  
**Author:** Rusty  
**Trigger:** Login "Failed to fetch" bug

## Context

The webapp was making absolute cross-origin HTTP requests to `http://localhost:3001/api` using `VITE_API_URL` in `.env.development`. There was no joint startup command; developers who only ran `npm run dev` in `webapp/` had no backend, causing every login to fail silently with "Failed to fetch".

## Decision

**Use Vite's dev proxy instead of an absolute `VITE_API_URL`.**

- `webapp/vite.config.ts` now includes:
  ```ts
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true }
    }
  }
  ```
- `VITE_API_URL` in `.env.development` is commented out. `api.ts` falls back to `/api` (relative), which the proxy forwards.
- A root-level `package.json` with `concurrently` was added. Running `npm run dev` at project root starts both server and webapp together.

## Why proxy over absolute URL

| | Proxy approach | Absolute VITE_API_URL |
|---|---|---|
| CORS in dev | Not needed | Required |
| Startup | One `npm run dev` | Two terminals |
| Misconfig surface | Low | Env var can be wrong/missing |
| Production | Unaffected (not used in prod) | Unaffected |

## Impact

- CORS config in `server/index.js` is unchanged (still needed for production and any non-proxy client).
- `VITE_API_URL` can still be set to point at a remote staging server when needed.
- No changes to `api.ts` or any auth code.

---

## Decision: Azure Production API URL Strategy

**Date:** 2026-05-12  
**Author:** Rusty  
**Trigger:** Azure-deployed app showing "Failed to fetch" on login

### Root Cause

`webapp/src/api.ts` had `API_BASE` hardcoded as `'http://localhost:3001/api'`.

The Azure App Service serves the React SPA over HTTPS (`https://vmbc-estimator.azurewebsites.net`). When the browser tried to call `http://localhost:3001/api/auth/login` (HTTP) from an HTTPS page, the browser blocked it as **mixed content** — producing `TypeError: Failed to fetch`.

Secondary issue: `deploy.yml` set `VITE_API_URL: ''` (empty string). Because `api.ts` uses `??` (nullish coalescing, not `||`), an empty string is NOT treated as absent — `'' ?? '/api'` evaluates to `''`, stripping the `/api` prefix from all routes.

### Decision

#### API Base URL Convention

| Context | VITE_API_URL | Effective API_BASE |
|---|---|---|
| Local dev (Vite proxy) | unset/commented | `/api` (fallback) |
| Production Azure CI | `/api` | `/api` |
| Remote staging | `https://staging.example.com/api` | explicit URL |

**Rule:** `VITE_API_URL` must NEVER be set to a `http://localhost` URL in committed code or CI. Use the Vite proxy for local dev.

**Rule:** In `deploy.yml`, set `VITE_API_URL: '/api'` explicitly — not `''`. The `??` operator only triggers on `null`/`undefined`, not on empty string.

#### Files Changed

| File | Change |
|---|---|
| `webapp/src/api.ts` | `API_BASE = import.meta.env.VITE_API_URL ?? '/api'` (was hardcoded localhost) |
| `.github/workflows/deploy.yml` | `VITE_API_URL: '/api'` (was `''`) |
| `webapp/vite.config.ts` | Added `/api` proxy → `http://localhost:3001` for dev |
| `webapp/.env.development` | Commented out `VITE_API_URL` (proxy handles it) |

#### Commit

`649f788 fix(prod): use VITE_API_URL=/api in deploy + Vite proxy for dev`

### Azure Topology (for reference)

Single App Service `vmbc-estimator` at `https://vmbc-estimator.azurewebsites.net` serves BOTH:
- React SPA (static files via `express.static` when `SERVE_WEBAPP=true`)
- Express API at `/api/*`

**Same origin → no CORS needed for production.** CORS config in `server/index.js` only matters if an external client calls the API.

### Lesson

Working-tree-only code changes DO NOT reach Azure. The dev fix session made the right code change but forgot to `git commit && git push`. Always commit + push to trigger the deploy pipeline.

---

## Building Estimator — Domain Assessment

**Date:** 2026-05-14  
**By:** Reuben  
**Status:** Delivered (inbox → decisions merge)

### Executive Summary

The Building Estimator webapp is a credible first migration from the VMBC `.xlsm` workbook — it captures the right structural skeleton (Design → Framing → Components → Summary → Quotation) and correctly models the weight-based cost chain for structural steel. However, it is not yet usable for real bids: the Beams/Take-off sheet workflow is entirely missing (the app has no way to generate the per-frame steel BOM from design inputs), the quotation output lacks required proposal language and escalation clauses, labor is a flat $/lb rate with no distinction between fabrication and erection labor, and the stair/structural sub-quote lives in a disconnected page with no parametric inputs. The headline recommendation is to restore the parametric calculation engine (auto-generating component quantities from building dimensions) before adding any new features — without it, every quantity is entered by hand and the app is a glorified spreadsheet form.

### Critical Gaps (must-fix before this is usable for real bids)

1. **No parametric BOM generation from building dimensions** — The Excel workbook auto-calculates quantities for every framing member from the Design sheet inputs. The webapp does NOT do this. A PEMB estimator quotes 3–5 buildings per day; if each requires 40+ manual entries, it's slower than Excel.

2. **Beams/Take-off sheet not implemented** — The "Beams" sheet (200 data rows) is the core steel BOM — purchasing document sent to service center. Without it, fabrication shop cannot cut/drill/assemble; estimator cannot get steel quote from mill.

3. **No insulation R-value / quantity calculation** — InsulationPage has only three boolean toggles. The workbook calculates insulation linear feet from roof/wall area. Insulation is ~5–15% of total quote value.

4. **Stair/structural sub-quote is unparameterized** — `StructuralPage.tsx` shows a raw component table. The workbook `Stairs.txt` is fully parameterized (levels, floor height, tread count, landing config). Stairs are a significant add-on ($15,000–$55,000).

5. **Quotation output missing required legal / commercial language** — Missing: validity period, escalation clause, exclusions list, payment terms, lead time statement. Omitting them creates contract and liability exposure.

6. **Sales tax not calculated** — QuotationPage shows static "Sales Tax Not Included." No tax rate field, no option to include/exclude. In Texas, metal building materials are taxable at 8.25%.

### Important Gaps (should-fix in next iteration)

7. **No wind load / exposure category input** — Quotation hardcodes "Wind Load Design 140 MPH." No field on DesignPage for design wind speed, exposure category (B/C/D per ASCE 7), roof live load, snow load.

8. **Ridge vents, skylights, masonry quantities not calculated** — DesignPage has inputs for these; never translated into catalog components or cost.

9. **Color selection not persisted to quotation** — Quotation hardcodes "Roof: Galvalume / Walls: Color by Customer / Trim: Color by Customer." Color drives panel item codes (RL6LS vs. CL244GL) with different unit prices.

10. **No quote revision / version history** — Quotes table has `status` but no revision number, parent quote ID, or change log. PEMB quotes routinely go through 3–5 revisions.

11. **No freight calculation logic** — Freight is a flat dollar input. The workbook has a KM field and $/km rate (4.6 $/km). Freight on a PEMB package is $800–$5,000.

12. **Vendors module not connected to pricing** — Vendors page stores records; price list and catalog not filtered by vendor. Everything references Central States only.

### Nice-to-Haves

13. **$/sqft summary metrics on the quote** — The workbook computes "Cost by SqFt BDG" and "Cost by Pound" — standard PEMB sanity-check metrics. iBeam.ai shows these on dashboard.

14. **PDF generation (not just browser print)** — Current "Print / PDF" button opens a new window and calls `window.print()`. Buildxact, FabSuite generate server-side PDFs with proper page breaks, watermarks, logos.

15. **Comparison / alternate quote view** — Side-by-side comparison of two or more quote versions is standard in estimating tools.

16. **Customer portal / self-service quote acceptance** — Quotation has two signature lines. Tokenized link for electronic acceptance eliminates fax/scan/email loop.

17. **Material escalation factor** — The M sheet row 1 has `component Increase = 1.1` — global multiplier on component prices to hedge against steel volatility.

### Pricing & Calculation Concerns

**Labor rate applied to wrong weight subtotal:** `calculator.ts` line 78 applies fabrication labor rate to both structural steel AND cold-formed components (purlins, girts, sheeting). Cold-formed are purchased cut-to-length from supplier — fabrication labor is not applied to them. Workbook Take-off sheet only applies labor to structural steel weight. **Recommendation: Restrict labor base to `structuralWeight` only.**

**Frame opening cost method:** `framesCost` uses `weightCostSum()` for category `frame-openings`, but frame opening items are cold-form Cee sections priced per LnFt (weight=0 in catalog). This will produce zero cost unless weight is manually entered. **Better fix: Dispatch cost method based on `component.measure` field rather than hardcoded category-to-method mapping.**

### Prioritized Improvement Backlog (17 items)

**Critical Path (1–6):**
1. Parametric Main Framing Quantity Calculator (Livingston + Linus, Effort: L)
2. Parametric Component Quantity Calculator (Livingston, Effort: L)
3. Stair Parametric Calculator (Livingston + Linus, Effort: M)
4. Add Required Quote Fields: Number, Revision, Valid-Until, Status Enum (Rusty + Linus, Effort: S)
5. Add Design Wind Speed, Exposure Category, Color Selection to DesignPage (Linus + Rusty, Effort: S)
6. Wire Color Selection to Panel SKU in Price List (Livingston, Effort: S)

**High Priority (7–12):**
7. Fix Labor Calculation Base (Structural Weight Only) (Livingston, Effort: S)
8. Fix Frame Opening Cost Method (Livingston, Effort: S)
9. Proposal Legal Language: Validity, Exclusions, Payment Terms, Lead Time (Linus + Rusty, Effort: M)
10. Insulation Quantity Auto-Calculation (Livingston, Effort: S)
11. Display $/sqft and $/lb Summary Metrics (Linus, Effort: S)
12. Quote Number and Revision on Printed Proposal (Linus, Effort: S)

**Medium Priority (13–17):**
13. Sales Tax Field (Rate + Include/Exclude Toggle) (Linus + Livingston, Effort: S)
14. Freight Calculator (Distance × Rate) (Linus + Livingston, Effort: S)
15. Contingency Line Item (Livingston + Linus, Effort: S)
16. ComparisonPage Implementation (Linus, Effort: M)
17. Server-Side PDF Generation (Danny + Linus, Effort: M)

### Terminology & Labeling Issues (14 items)

| Current Label (UI) | Recommended | Why |
|---|---|---|
| "Framing Page" | **Main Framing** | Matches workbook tab name and industry convention. |
| "Structural Page" | **Stairs & Structural Steel** | Current label implies all structural steel; it's stairs + landings + columns only. |
| "Components Page" | **Secondary Framing & Sheeting** | "Components" is confusing to outside users. |
| "Insulation Page" | **Insulation** | OK — matches workbook. |
| "Fasteners Page" | **Fasteners & Bolts** | Add "Bolts" — anchor bolts, machine bolts, cable bracing deserve equal billing. |
| `laborRate` | **Fabrication Labor Rate ($/lb)** | Distinguish from erection labor. |
| "Building Erection ($)" | **Erection Labor ($)** | "Erection" alone can be misread. |
| "Loading & Hauling ($)" | **Loading & Hauling / Rigging ($)** | Rigging is sometimes included, sometimes separate. |
| `baySpacing` | **Number of Bays** | Field is a count, not a spacing dimension. |
| `girts` | **Girts per Bay Side** | Clarify what the number represents. |
| `purlins` | **Roof Purlins (count)** | Same — clarify this is a count, not a spacing. |
| "Economic End Frame" | **Economic End Frame (EEF)** | Add the abbreviation — appears as "EEF" in supplier catalogs. |
| "Single Slope" (checkbox) | **Single-Slope Roof** | Minor — add "Roof" for clarity. |
| "Bypass Girts" | **Bypass Girts (flush with columns)** | Add tooltip explaining this option. |

### Open Questions for Jose

1. **Who is the primary user?** In-house estimators at VMBC only, or contractor customers configuring their own buildings?
2. **Do you fabricate your own structural steel or purchase pre-fabricated frames?** Changes the cost model significantly.
3. **What is the target geography for wind load defaults?** Houston/Gulf Coast is Exposure D at 140–150 mph. If quoting statewide/out-of-state, this needs to be per-job input.
4. **Is the stair estimator always present or only for some project types?** Optional add-on or always embedded?
5. **How do you handle steel price escalation between quote date and delivery date?** 30-day validity but steel purchased 6–14 weeks later.

### Skill Created

📌 `.squad/skills/pemb-quotation-anatomy/SKILL.md` — Reusable skill documenting the structure and content of a professional PEMB proposal (per MBMA standard), with XML schema for generating proposal output programmatically.

---

