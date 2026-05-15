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

