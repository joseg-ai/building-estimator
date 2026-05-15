# Sales Tax Calc — Formula Notes (Issue #13)

**Date:** 2026-05-15
**By:** Livingston
**Status:** Inbox (awaiting Reuben domain review)

## Decisions locked in calculator.ts

### Field placement
- `salesTaxRate: number` and `salesTaxIncluded: boolean` placed at the **top level** of
  `BuildingConfig`, not inside `ProjectOverheads`. Rationale: tax is a jurisdictional
  switch on the *quote*, not a cost-engineering knob like labor rate or overhead %.
  Linus's UI is expected to render it as a dedicated tax block, not in the overheads
  table.

### Defaults
- `salesTaxRate = 0.0825` (Texas state base, per Reuben Critical Gap #6).
- `salesTaxIncluded = false` — preserves today's "Sales Tax Not Included" behavior
  for existing quotes. UI must let user opt in per quote.

### Tax base — VERBATIM from issue #13
    base = Materials + Labor + Freight + Overhead + Erection + Foundation
         + Permits + Contingency + Profit + Commission

Intentionally **excluded** from the base (matching the issue, not the SubTotal
formula): `detailing`, `engineering`, `loadingHauling`. If Reuben says these are
taxable in TX for PEMB, raise a follow-up — do not silently change here.

### Contingency placeholder
Issue #15 (contingency line) isn't built yet. I added `const contingency = 0`
inline in the tax base so:
- the formula matches the issue spec exactly today, and
- when Saul/Livingston ship #15 the contingency variable plugs straight in.

### Include/exclude semantics
- `salesTax` is **always computed** and persisted to the breakdown — so the UI can
  show "Tax would be $X if included" even when excluded.
- `grandTotal` only adds `salesTax` when `salesTaxIncluded === true`.
- `subTotal` is unchanged — tax sits outside it, after profit+commission.

### Rounding
- No rounding inside calculator. Full float precision carried in `CostBreakdown`.
- Display-side rounding is `formatUSD`'s job (Linus).

## Open questions for Reuben
1. Confirm Texas taxability of detailing/engineering fees on PEMB sales — issue
   formula excludes them, but real-world contracts sometimes tax them.
2. Confirm tax-on-profit/commission is correct for TX (issue says yes).
3. When a quote has out-of-state ship-to, do we still default 8.25%? Likely no —
   future ticket for jurisdiction lookup.
