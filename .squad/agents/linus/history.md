# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — PEMB cost estimation tool. Browser app with pages for Design, Price List, Main Framing, Components, Insulation, Fasteners, Stairs, Summary, and a printable Quotation with SVG diagrams.
- **Stack:** React 19, TypeScript, Vite, Tailwind v4, react-router-dom v7. State via React Context, persistence via localStorage.
- **Created:** 2026-05-10

## Team Updates

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
