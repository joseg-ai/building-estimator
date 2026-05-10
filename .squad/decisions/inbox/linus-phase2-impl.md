### 2026-05-10T15:16:00-05:00: Phase 2 — Customers CRUD + Quote Linking (SHIPPED by Linus)

**What:** Full frontend implementation of the Phase 2 customer master + quote linking wiring map.

---

## Files Shipped

| File | Action | Notes |
|---|---|---|
| `webapp/src/types.ts` | EDIT | `customerId?: number \| null` added to `BuildingConfig` |
| `webapp/src/api.ts` | EDIT | `Customer`, `CustomerWritable`, `CustomerDeleteResult` types + 6 API functions + extended quote types + extended create/update signatures |
| `webapp/src/storage.ts` | EDIT | `saveCachedCustomers<T>` / `loadCachedCustomers<T>` (key: `cached-customers-list`) |
| `webapp/src/context.tsx` | EDIT | `CustomersState`, `SET_CUSTOMER_ID` action, `customers` state + cache seed, `searchCustomers` callback |
| `webapp/src/components/CustomerPicker.tsx` | NEW | Debounced combobox, dropdown with quoteCount, linked indicator, "+ New Customer" |
| `webapp/src/pages/CustomersPage.tsx` | NEW | Full CRUD: search, table, create/edit modal (all fields + 4 default overheads), force-delete flow |
| `webapp/src/pages/DesignPage.tsx` | EDIT | `handleCustomerSelect` + `<CustomerPicker>` replacing text input; warn-before-clobber overhead prefill |
| `webapp/src/pages/QuotesPage.tsx` | EDIT | Pass `customerId` in `handleNew` + `handleSaveCurrent` |
| `webapp/src/components/Layout.tsx` | EDIT | Pass `customerId` in `handleSave`; "Customers" added to `mainLinks` |
| `webapp/src/pages/MenuPage.tsx` | EDIT | Pass `customerId: null` in `handleNewQuote`; Customers tile added (4-col grid) |
| `webapp/src/App.tsx` | EDIT | `/customers` route → `CustomersPage` |

---

## Quality Bar

- `npx tsc --noEmit`: **Exit 0 — 0 errors** (zero new TS errors introduced)
- `npx eslint src`: **6 errors, all pre-existing** (authContext, calculator.ts, FramingTable, Layout, context.tsx — identical to pre-Phase-2 baseline)
- **11/11 calculator tests pass**

---

## Deviations from Wiring Map

1. **CustomerPicker as standalone component** — Extracted to `components/CustomerPicker.tsx` instead of inlining in DesignPage. Cleaner separation; easier to reuse elsewhere later.
2. **Layout doesn't pass `priceListVersionId`** — Same as pre-Phase-2 behaviour. Layout's quick-save doesn't know the active price list version (it doesn't pull from context). QuotesPage explicit saves still pass it correctly.
3. **Overhead % scale** — Rusty stores as whole-number percentage (e.g. `15` for 15%). Applied as rate `÷ 100` → `config.overheads.profitRate = 0.15`. Matches existing system convention.
4. **`apiGetCustomer` and `apiListCustomerQuotes`** — Wired to api.ts but not called in UI yet. Available for Saul's server tests and future Phase 3 (customer detail view / quote list tab).
5. **No byId cache in CustomersState** — Wiring map mentioned byId map, but it added complexity without a consumer. CustomersPage does all CRUD with the list; kept state flat. Easy to add if Phase 3 needs it.

---

## Handoffs for Saul (Test Plan)

Server endpoint tests needed (mirrors Phase 1 pattern):

- **Auth:** 401 on all 6 customer routes without token.
- **Owner scoping:** User A creates customer → User B GET `:id` → 404. User B PUT/DELETE → 404.
- **POST happy path:** Full customer body → 201 with `quoteCount: 0`.
- **POST validation:** missing `name` → 400 VALIDATION; bad `email` format → 400 VALIDATION; non-numeric `defaultLaborRate` → 400 VALIDATION.
- **GET list `?search=`:** Creates 2 customers ("Acme", "Beta"), search "Acm" → returns only Acme. `quoteCount` aggregate correct.
- **PUT:** Update `name` → 200 with new name.
- **DELETE no quotes:** 200 `{ deleted: true, quotesUnlinked: 0 }`.
- **DELETE with quotes:** 409 IN_USE (without `?force=true`). With `?force=true` → 200 `{ deleted: true, quotesUnlinked: N }` and quote's `customerId` → null.
- **Quote integration:** POST quote with foreign-owned `customerId` → 400 INVALID_CUSTOMER. POST with valid → quote returns `customerId`. GET `/api/quotes?customerId=N` filters correctly.

See `rusty-phase2-customers-api.md` for exact shapes.
