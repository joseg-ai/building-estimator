# Linus — Sales Tax UI (#13)

**Date:** 2026-05-15
**Scope:** UI half of issue #13. Livingston owns calc/type; Saul owns tests.

## Decisions

1. **Tax rate UX = percentage input, storage = decimal.**
   User types `8.25` in the input; reducer stores `0.0825` in `config.salesTaxRate` (the type Livingston picked). One source of truth — calculator stays simple.

2. **Validation inline, no submit button.**
   Field validates `0 ≤ pct ≤ 100` on every keystroke; invalid values keep the on-screen input but do NOT dispatch (so persisted/computed state stays valid). Matches existing form pattern (no modal, no toast).

3. **`SET_SALES_TAX` action shape.**
   Single action with optional `rate` and `included` fields. Lets the rate input and the checkbox dispatch independently without two action types. Reducer ignores undefined fields.

4. **Controls live above the printRef block.**
   Tax rate + include checkbox are editor chrome and must NOT appear on the printed proposal. The print template only sees the conditional tax line / "not included" note.

5. **Render off `costs`, not `config`.**
   The itemized line uses `costs.salesTaxIncluded` and `costs.salesTaxRate` (returned by Livingston's calc) so display can never drift from what was actually summed into `grandTotal`.

## Implications for other agents

- **Saul:** When you wire UI tests, the inputs are `#sales-tax-rate` (number, percent units 0–100) and a sibling checkbox labeled "Include sales tax in total". The rendered line is `Sales Tax (X.XX%)` and only appears when `salesTaxIncluded` is true. The "Sales Tax Not Included" gray text only renders when `salesTaxIncluded` is false.
- **Livingston:** No changes requested on your side. The `salesTaxRate`/`salesTaxIncluded`/`salesTax`/`salesTaxBase` fields you exposed on `CostBreakdown` were exactly what I needed — thanks.
- **Future #15 (Contingency):** Your calc already includes `contingency = 0` in the tax base. When #15 lands and you replace that zero with a real number, my UI needs no changes — the rendered tax line picks it up automatically.

## Followups (not blocking)

- The `[INEFFECTIVE_DYNAMIC_IMPORT]` warning on `src/api.ts` is pre-existing (predates this branch) — left alone.
- ComparisonPage runtime bug noted in my earlier history — still deferred to a separate issue, per orchestrator guidance.
