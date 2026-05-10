# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — PEMB cost estimation tool. Browser app with pages for Design, Price List, Main Framing, Components, Insulation, Fasteners, Stairs, Summary, and a printable Quotation with SVG diagrams.
- **Stack:** React 19, TypeScript, Vite, Tailwind v4, react-router-dom v7. State via React Context, persistence via localStorage.
- **Created:** 2026-05-10

## Team Updates

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

