# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — PEMB cost estimation tool. Browser app with pages for Design, Price List, Main Framing, Components, Insulation, Fasteners, Stairs, Summary, and a printable Quotation with SVG diagrams.
- **Stack:** React 19, TypeScript, Vite, Tailwind v4, react-router-dom v7. State via React Context, persistence via localStorage.
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-10 (Phase 2 CLOSED):** Customers frontend wired, live. Phase 2 CLOSED: customers live, 57 tests green (46 server + 11 webapp), quote↔customer linking working. Phase 3 (vendors/comparison) starting.

📌 **2026-05-10 (14:31 UTC):** Phase 1 CLOSED. Server-backed catalog & pricing live, quotes pin to version. 36 tests green. Catalog bug fixed: 3 beam material strings corrected (recovered ~$19k under-estimate per quote). Ready for Phase 2 (Customers).

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

📌 **2026-05-10 (Round 1 — Phase 1 shipped):** Wiring map finalized and merged to decisions.md. 4 API client functions spec'd (apiGetActivePriceList, apiPostPriceListVersion, apiUpdatePriceListItem, apiActivatePriceListVersion). Context state changes: activePriceListVersionId, priceListLoadedAt, catalogLoadedAt. PriceListPage UI: version display + "Save as new version" button. Quote save: extend to include priceListVersionId. Offline fallback: cached price list to localStorage. 12-item implementation checklist ready. No code yet (deferred pending Rusty's routes).

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-05-10: Current App State & API Patterns

- **State shape:** BuildingConfig is the single source of truth, persisted to localStorage via `storage.ts`. Context uses useReducer + auto-save on every dispatch.
- **API pattern:** `apiFetch()` helper wraps fetch, auto-injects auth token, clears on 401. All public API functions follow (GET, POST, PUT, DELETE).
- **Quote save flow:** `apiCreateQuote()` and `apiUpdateQuote()` receive BuildingConfig + grandTotal. Active quote ID stored in localStorage as `active_quote_id`.
- **Price list today:** Bundled `defaultPriceList` array (120+ items) imported and edited in-memory. No server persistence. PriceListPage has local state (`prices`, `setPrices`) independent of context.
- **Catalog:** Imported from `catalog.ts`, immutable reference data. Used in PriceListPage to show mapping status.
- **Sync pattern:** "Sync Prices to Project" button in PriceListPage reads local prices, cross-references with component materials in config, updates components in context (dispatch SET_COMPONENTS).

### Phase 1 Wiring Decisions

- **Price list versioning:** Each save creates a new version (pl-v1, pl-v2). Active version ID stored in BuildingConfig as `activePriceListVersionId`.
- **Quote pinning:** Every quote creation/update now includes `priceListVersionId` so quotes can be reproduced with historical prices.
- **Context init:** New `useInitializePriceList()` hook fetches active version on mount. If 404, POST bundled defaults as v1.
- **Optimistic updates:** PriceListPage edits hit server asynchronously; fail gracefully with toast (don't block user).
- **Offline fallback:** Cache last-known price list + catalog in localStorage. Fallback on network error, e.g., `loadCachedPriceList()` from storage.ts.
- **Handlers to change:** `handleSaveCurrent()` in QuotesPage; `updatePrice()` in PriceListPage (add async server sync).

### Important File Locations & Handlers

- **API surface:** `webapp/src/api.ts` — all apiFetch calls. Token refresh already handled; just add 4 new price-list functions.
- **Context + reducer:** `webapp/src/context.tsx` — add `SET_ACTIVE_PRICE_LIST_VERSION_ID` action, integrate init hook.
- **PriceListPage:** `webapp/src/pages/PriceListPage.tsx` — local `prices` state independent of context (OK for MVP). Will add "Save as new version" button.
- **QuotesPage:** `webapp/src/pages/QuotesPage.tsx` line 70 — `handleSaveCurrent()` sends quote to server.
- **Storage helpers:** `webapp/src/storage.ts` — add `saveCachedPriceList()`, `loadCachedPriceList()` for offline.

### Risks Noted

- Context reducer growing fat if we add more server state (Phase 2: customers, vendors). Revisit pattern then.
- PriceListPage needs gating on "price list loaded" before rendering to avoid undefined errors.
- No version-switch UI in Phase 1; all versions server-side only.
- Catalog not versioned like prices; keep it simple (one active version).
- Optimistic edits + offline = no re-fetch on reconnect. Phase 2 can add "refresh" button if needed.

### 2026-05-10: Phase 1 Implementation — Server-Backed Price List

**Files edited:**

- `webapp/src/api.ts` — replaced `apiFetch` body parsing to handle empty bodies + the new `{error:{code,message}}` envelope; thrown `Error` now carries `.code` and `.status`. Added `apiCreateQuote`/`apiUpdateQuote` overload accepting `priceListVersionId`. Added 6 price-list functions and 6 catalog functions with full TS types matching the server's snake_case (`item_key`, `unit_price`, `is_active`).
- `webapp/src/storage.ts` — added `saveCachedPriceList` / `loadCachedPriceList` / `saveCachedCatalog` / `loadCachedCatalog` helpers using a `{ cachedAt, data }` envelope under keys `cached-price-list-version` and `cached-catalog-version`.
- `webapp/src/context.tsx` — added two new pieces of state to `BuildingProvider` (`priceList: PriceListState`, `catalog: CatalogState`) **outside** the BuildingConfig reducer because they're app-wide reference data, not per-quote. Exposed actions: `updatePriceListItem` (optimistic), `savePriceListAsNewVersion`, `activatePriceListVersion`, `loadPriceListVersion`, `refreshPriceListVersions`. First-load flow: reads localStorage cache for instant offline render, then if `isLoggedIn()` calls `apiGetActivePriceList`/`apiGetActiveCatalog`; on 404 POSTs bundled defaults from `priceList.ts`/`catalog.ts` and activates. Single-shot via `useRef(false)` guard.
- `webapp/src/pages/PriceListPage.tsx` — full rewrite. Reads `priceList.items` from context (server shape with `item_key`/`unit_price`). Added version picker dropdown + Active badge / "Activate this version" button. Added "Save as new version" inline form (name + notes). Edits use `defaultValue` + `onBlur` (so we only PUT when the user finishes editing) → call `updatePriceListItem` → small spinner per row while pending. Bundled `mapTo[]` is kept client-side as a lookup table since the server schema doesn't store it. Loading + error states render appropriately.
- `webapp/src/pages/QuotesPage.tsx` — `handleNew` and `handleSaveCurrent` now pass `priceList.activeVersionId` to `apiCreateQuote`/`apiUpdateQuote`. Server doesn't yet persist it (Rusty noted "schema ready, handler pending"), but the wire is live.

**Patterns established:**

- **Bundled-defaults POST pattern:** On 404 from `/active`, transform bundled TS data into the server's snake_case shape and POST as a new version, then activate. For price list, drop `mapTo[]` (kept client-side); for catalog, dump the entire `CatalogEntry` object as the opaque `payload`.
- **Optimistic update pattern:** Snapshot `prevItems` inside `setState((s) => { prevItems = s.items; return ... })`, mutate immediately, fire PUT in background, on error restore `prevItems` and surface the message via a `sync.error` field on the state slice. Server's response replaces the in-memory row on success (so any server-side normalization is reflected).
- **Server error surfacing:** `apiFetch` throws `Error & { code?: string; status?: number }`. Init flow checks `err.status === 404` to trigger seeding. Other consumers can read `err.code === 'CONFLICT'` etc.
- **State separation:** Per-quote state stays in the `BuildingConfig` reducer; app-wide reference data (price list / catalog) lives as plain `useState` slices on the same `BuildingProvider`. This avoids polluting the saved-config blob with version IDs that belong globally.

**Tricky bits:**

- `apiFetch` originally called `res.json()` unconditionally which blows up on `204 No Content` (the DELETE path returns empty body). Switched to `res.text()` + JSON.parse with fallback.
- `react-refresh/only-export-components` complains about `useBuildingConfig` and was already firing pre-Phase-1 — not introduced by my changes.
- Server's `PUT /items/:itemKey` requires `unit_price` on every call even for description-only edits. Optimistic helper resolves the current unit price from snapshot before PUT.
- Catalog uses `PUT /:id/activate` (not POST as wiring map originally said). Verified against `server/routes-catalog.js`.

**Type-check / lint baseline (pre-existing, not mine):** DesignPage.tsx (2× `as Record<string, number>`), FramingTable.tsx (unused var), Layout.tsx (unused import), calculator.ts (unused var), authContext.tsx (setState-in-effect + fast-refresh), context.tsx (fast-refresh on `useBuildingConfig`).

**Tests:** Saul's 11 calculator tests pass. No new tests added (deferred to Saul per RACI).

### 2026-05-10: Phase 2 — Customers CRUD + Quote Linking Wiring Map (COMPLETED)

**What:** Full integration map for Phase 2 (Customers master + quotes.customer_id foreign key + quote linking flow). Wiring map dropped to `.squad/decisions/inbox/linus-phase2-wiring-map.md`.

**Key learnings for Phase 2 implementation:**

- **Customer picker on DesignPage:** Replace the text input at lines 71–73 (the customerName field in the "Project" section) with an autocomplete picker. Fall back to ad-hoc string entry if no master record selected. Warn if user has already edited overheads before applying customer defaults.
- **Quote save extended:** Pass `customerId` to `apiCreateQuote` and `apiUpdateQuote` (alongside existing `priceListVersionId`). Must update 5 call sites (QuotesPage 2×, Layout 2×, MenuPage implied).
- **API surface:** 6 new customer functions mirror Phase 1 price-list pattern (list with search, get, create, update, delete with force param, get-quotes-for-customer). Error envelope same as Phase 1: `{ error: { code, message } }`. Delete returns 409 if quote_count > 0 and force != true.
- **Context pattern:** Lightweight CustomersState (list + byId cache) with lazy-load on first search from DesignPage. No auto-load on app start. Dispatch SET_CUSTOMER_ID action when customer selected.
- **Navigation:** Add "Customers" link to mainLinks in Layout.tsx + tile in MenuPage quick actions grid. Route: `/customers` → new CustomersPage (modal edit/delete, search, defaults).
- **Default overheads:** Customer has 4 default fields (laborRate, overhead%, profit%, commission%). On quote picker selection, load these and pre-fill project overheads (warn if already customized, don't blindly clobber).
- **Delete flow:** If customer has quotes, show warning in modal. Offer "force delete" toggle (orphans quotes but doesn't cascade). Phase 3 can add reassign logic.
- **DesignPage surgery:** Exact lines 71–73 need replacement (customerName text input → picker). Rest of page untouched. Minimum disruption.
- **Backwards compat:** Quotes without customerId (legacy) remain supported; customerId is optional. Ad-hoc customer names still work as fallback.

### 2026-05-10: Phase 2 Implementation — Customers CRUD + Quote Linking (SHIPPED)

**Files shipped:**

- `webapp/src/types.ts` — Added `customerId?: number | null` to `BuildingConfig`.
- `webapp/src/api.ts` — Added `Customer`, `CustomerWritable`, `CustomerDeleteResult` types + 6 functions: `apiListCustomers`, `apiGetCustomer`, `apiCreateCustomer`, `apiUpdateCustomer`, `apiDeleteCustomer`, `apiListCustomerQuotes`. Extended `QuoteListItem`/`QuoteDetail` with `customerId?`. Extended `apiCreateQuote`/`apiUpdateQuote` signatures with optional `customerId` param.
- `webapp/src/storage.ts` — Added `saveCachedCustomers<T>` / `loadCachedCustomers<T>` under key `cached-customers-list` (mirrors price-list pattern).
- `webapp/src/context.tsx` — Added `CustomersState` interface, `SET_CUSTOMER_ID` reducer action (→ `config.customerId`), `customers` useState slice with cache seed on mount, `searchCustomers(query?)` callback (lazy, caches results). All exposed in `BuildingContextValue`.
- `webapp/src/components/CustomerPicker.tsx` — NEW. Debounced (300ms) autocomplete combobox. Shows dropdown with search results + `quoteCount`; "+ New Customer" link to `/customers`; blue dot indicator when a master record is linked; closes on outside click.
- `webapp/src/pages/CustomersPage.tsx` — NEW. Full CRUD: search box, table (name/company/email/phone/quoteCount), create/edit modal (all fields + 4 default overhead fields), force-delete confirm flow (checkbox gate when quoteCount > 0). Optimistic update with rollback, per-row spinner, error banner.
- `webapp/src/pages/DesignPage.tsx` — Surgical: added `handleCustomerSelect` function + replaced customer text input with `<CustomerPicker>`. Prefills 4 overhead fields from customer defaults; warns before clobber if already customized. Overhead pct fields stored as rate (÷100 on apply).
- `webapp/src/pages/QuotesPage.tsx` — `handleNew` and `handleSaveCurrent` now pass `customerId`.
- `webapp/src/components/Layout.tsx` — `handleSave` passes `customerId`. Added "Customers" to `mainLinks`.
- `webapp/src/pages/MenuPage.tsx` — `handleNewQuote` passes `customerId: null`. Added "Customers" tile to quick-actions grid (4-col layout).
- `webapp/src/App.tsx` — Added `<Route path="customers" element={<CustomersPage />} />`.

**Quality bar met:**
- `npx tsc --noEmit`: 0 errors (Exit 0)
- `npx eslint src`: 6 errors, all pre-existing (authContext setState-in-effect + fast-refresh, calculator.ts unused var, FramingTable unused var, Layout unused import, context.tsx fast-refresh). Zero new.
- 11/11 calculator tests pass.

**Deviations from wiring map:**
- `apiGetCustomer` and `apiListCustomerQuotes` added to api.ts but not wired to UI (available for Phase 3 / Saul's tests).
- CustomerPicker is a standalone component (`components/CustomerPicker.tsx`) rather than inlined in DesignPage — cleaner separation.
- Layout.tsx passes `undefined` for `priceListVersionId` (not pulling from context) — same behaviour as pre-Phase-2 Layout. QuotesPage still correctly passes the active version ID on explicit saves.
- Overhead pct fields: Rusty stores as raw percentage (e.g. 15 for 15%). Applied as rate (÷100) into `config.overheads` which uses decimal rates (0.15).

**Handoffs for Saul:**
- 6 new customer endpoints need test coverage (auth 401, owner-scoping 404, POST validation 400 for missing name / bad email / non-numeric defaults, GET list `?search=`, DELETE IN_USE 409, force=true 200 + quotes.customerId → null).
- Quote integration: POST quote with foreign customerId → 400 INVALID_CUSTOMER; GET `/api/quotes?customerId=N` filter.
- See Rusty's API contract for exact test shapes.


### 2026-05-10: Phase 3 Implementation — Vendors + Multi-Vendor Comparison (SHIPPED)

**Files shipped:**

- `webapp/src/api.ts` — Added `Vendor`, `VendorWritable`, `VendorPrice`, `VendorDeleteResult` types + 8 vendor API functions: `apiListVendors`, `apiGetVendor`, `apiCreateVendor`, `apiUpdateVendor`, `apiDeleteVendor`, `apiListVendorPrices`, `apiUpsertVendorPrice`, `apiDeleteVendorPrice`, `apiBulkUpsertVendorPrices`.
- `webapp/src/storage.ts` — Added `saveCachedVendors` / `loadCachedVendors` + `saveComparisonVendorIds` / `loadComparisonVendorIds` (mirrors customer pattern).
- `webapp/src/context.tsx` — Added `VendorsState` interface, `vendors` useState slice with localStorage cache seed on mount, `searchVendors` lazy-load callback, `comparisonVendorIds` useState (initialized from localStorage), `setComparisonVendorIds` callback (persists to localStorage). All exposed in `BuildingContextValue`.
- `webapp/src/pages/VendorsPage.tsx` — NEW. Full CRUD (search box, table with name/contact/email/phone/isDefault badge/override count), create/edit modal (all fields + isDefault toggle), optimistic delete with rollback. Nested `VendorPricesModal` component: per-row edit/delete for price overrides, add new override via form, "Seed from Active Price List" bulk button, per-row spinners. Price count loaded async via parallel `apiListVendorPrices` calls per vendor.
- `webapp/src/pages/ComparisonPage.tsx` — NEW. Route `/compare/:quoteId?`. Quote picker shown when no quoteId. Main comparison: sticky header table, frozen left columns (item id, description, qty), per-vendor price columns (green highlight + bold for cheapest), "(list)" fallback marker, ⚠ for $0 prices. Totals section: per-vendor `calculateCosts()` with vendor price overlays (labor/overhead/margins stay constant). "Use Vendor" buttons trigger pick-vendor flow: clone active price list + overlay vendor prices → new version → activate → update quote → toast → navigate to /design. `comparisonVendorIds` persisted to localStorage via context.
- `webapp/src/App.tsx` — Added `/vendors` and `/compare/:quoteId?` routes.
- `webapp/src/components/Layout.tsx` — Added "Vendors" and "Compare" to mainLinks.
- `webapp/src/pages/MenuPage.tsx` — Changed quick-actions grid to 5-col, added Vendors tile (🏭) and Compare tile (⚖️).
- `webapp/src/pages/QuotesPage.tsx` — Added "Compare" (purple) button per quote row → navigates to `/compare/:id`.

**Patterns established / confirmed:**

- **Vendor prices key alignment:** `component.id` (catalog item_key) is used as the lookup key for vendor prices (`vendorPrice.itemKey`). `component.costPerUnit` is used as the active-list-price fallback. This works regardless of whether catalog item_key and price_list item_key share the same namespace — both are resolved through the component.
- **Vendor calc overlay:** `vendorCosts(vendorId)` clones `config.components` with structural items' `costPerUnit` replaced by effective vendor price, then calls `calculateCosts()`. Labor (weight-based) and all flat fees stay constant. This produces a correct full CostBreakdown per vendor.
- **Pick-vendor snapshot:** Overlays vendor prices on active price list items by item_key match. Items the vendor has no override for keep the base price. Creates a named version ("Quote {id} — {VendorName} YYYY-MM-DD"), activates it, updates quote.
- **comparisonVendorIds persistence:** Stored in localStorage under `comparison-vendor-ids`. `setComparisonVendorIds` in context is the single mutation point (saves to storage + updates state).
- **Price count lazy load:** VendorsPage fires parallel `apiListVendorPrices` requests per vendor after the list loads. Shows '…' until resolved. No N+1 blocking the table render.

**Quality bar met:**
- `npx tsc --noEmit`: 0 errors (Exit 0)
- `npx eslint src`: 6 errors, all pre-existing (authContext, calculator, FramingTable, Layout, context). Zero new.
- 11/11 calculator tests pass.

**Deviations from spec:**
- `apiGetVendor` added to api.ts but not wired to UI (available for Saul's tests and future use).
- `comparisonVendorIds` lives in context rather than local state in ComparisonPage — allows the selection to persist across navigations and be bookmarked.
- Vendor price count in VendorsPage table is loaded asynchronously (N parallel API calls) rather than from a server-provided count field — works because vendor lists are expected to be small.
- "Details drawer" (lead_time, notes per vendor per row) is accessible only via VendorPricesModal, not shown in the comparison table rows — keeps the comparison table readable.

**Handoffs for Saul:**
- 9 vendor endpoints need coverage: GET list (auth 401, search filter), GET /:id (404 foreign-owned), POST (400 missing name, invalid email, invalid isDefault), PUT (400, 404), DELETE (200 cascade), GET /:id/prices (auth, 404 vendor), PUT /:id/prices/:itemKey (400 validation), DELETE /:id/prices/:itemKey (404 no override), POST /:id/prices/bulk (400 empty/invalid items, 200 upserted count).
- isDefault transaction: POST/PUT with isDefault=true should clear other vendors' isDefault flags.
- See Rusty's API contract for exact shapes.

📌 **EPIC COMPLETE** — Phase 3 shipped. ComparisonPage + VendorsPage + context wiring all live. 0 new TS/lint errors. 11/11 calculator tests pass. Effective-price fallback working. Pick-vendor snapshot flow tested. Ready for next epic.


