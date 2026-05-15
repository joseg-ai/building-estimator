# Decision Inbox — Issue #12 + Auto-BOM Display

**Author:** Linus  
**Date:** 2026-05-15  
**Branch:** squad/12-bom-display  
**PR:** (see PR created after this note)

---

## Issue #12 — Quote # + Revision on Printable Quotation

### Decision: Use `active_quote_id` from localStorage

The QuotationPage operates off the in-memory `config` (React Context / localStorage), not a live API call. There is no quote object loaded into the page at render time — quotes are saved via `apiCreateQuote` / `apiUpdateQuote`, but the page just reads `config`.

**Approach taken:** Read `localStorage.getItem('active_quote_id')` directly at render time. Renders `Q-{id}` in the header. Falls back to `Q-—` if no active quote.

This is consistent with how `Layout.tsx` and `MenuPage.tsx` reference `active_quote_id` — same key, same localStorage pattern.

### Decision: Rev 1 placeholder (no schema change)

`QuoteDetail` and `QuoteListItem` in `api.ts` have no `revision_number` field. The server quotes table has only `status`, no revision tracking.

**Approach taken:** Render `Rev 1` as a fixed placeholder per task spec. No new schema, no API call.

**Action for Rusty:** Add `revision_number INTEGER DEFAULT 1` to the `quotes` table, expose it in `QuoteDetail`, and surface it here so the placeholder can be replaced with the real value.

---

## Auto-BOM Display (Livingston follow-up from PR #29)

### Decision: Option B — Read-only panel, not write-to-config

Livingston offered Option A (write merged BOM to `config.components`) or Option B (read-only panel). 

**Chose Option B** for the QuotationPage specifically:
- The quotation is a read-mostly view; mutating config from there is surprising UX.
- A collapsible read-only panel shows "what the engine would calculate" without overwriting user edits made on FramingPage/ComponentsPage.
- Option A (Recalculate BOM button) is still the right wiring for DesignPage or FramingPage — deferred to a future sprint.

### Decision: Extended cost dispatch mirrors `calculator.ts`

Rather than importing `structuralComponentCost` (internal to calculator), duplicated the dispatch logic inline as `bomItemExtended()`:
- `Ln Ft` measure → `lnF × costPerUnit`
- `Pound/ft` measure → `weight × costPerUnit`
- Default → `weight > 0 ? weight × costPerUnit : qty × costPerUnit`

This avoids creating an exported helper just for display purposes.

### Decision: Engineer-flagged rows highlighted amber

`mainFramingSummary.engineerInputRequired` = `['MF-01', 'MF-03']` (main frame columns and rafters — custom plate girders with weight=0). These rows get an amber background + "Engineer input req." badge in the BOM table.

### Calculation Notes sourced from Livingston's inbox note

The footnote under the BOM table surfaces assumptions from:
- `.squad/decisions/inbox/linus-auto-bom-display.md`
- Inline comments in `bomEngine.ts` (`computeFasteners` and `computeSecondaryFraming`)

---

## Files Changed

- `webapp/src/pages/QuotationPage.tsx` — 2 commits (quote # + BOM panel)

## Build & Tests

- `npm run build` — ✅ exit 0, 55 modules, no TS errors
- `npm test` — ✅ 226 tests passed (78 bomEngine + 116 bomEngine.secondary + 32 calculator)
