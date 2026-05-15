# Decision Note: Legal Language & Summary Metrics (Issues #9 and #11)

**Date:** 2026-05-15  
**Author:** Linus  
**Branch:** `squad/11-9-linus`  
**Issues:** #9 (proposal legal language) and #11 ($/sqft and $/lb summary metrics)

---

## Issue #11 — Cost Metrics

### Steel Weight Source

The task asked to "pull steel weight from the BOM engine output." After reviewing `bomEngine.ts` (which exports `structuralWeightLbs` for main framing only) and `calculator.ts` (which computes `structuralWeight` = sum of `weight` across ALL structural categories), the decision is:

> **Use `costs.structuralWeight` from `CostBreakdown`** — not the BOM engine field.

**Rationale:** `bomEngine.structuralWeightLbs` covers main framing only (no canopy, overhangs, lean-tos, plates, frame openings). `costs.structuralWeight` covers the full quote, which is what $/lb sanity-check metrics should reflect. No new helper was needed.

### Metric Definitions

| Metric | Formula | Source fields |
|--------|---------|---------------|
| Total Cost / sqft | `grandTotal / mainBuildingArea` | `costs.grandTotal`, `costs.mainBuildingArea` |
| Total Cost / lb steel | `grandTotal / structuralWeight` | `costs.grandTotal`, `costs.structuralWeight` |
| Steel Cost / lb | `structuralTotal / structuralWeight` | `costs.structuralTotal`, `costs.structuralWeight` |

"Steel Cost / lb" uses `structuralTotal` (structural materials only — excludes components, insulation, fasteners, labor, overhead). This matches the PEMB industry convention of comparing raw structural material cost to weight.

### Zero Guard

Metrics only render when denominator > 0 (`mainBuildingArea > 0` for $/sqft; `structuralWeight > 0` for $/lb metrics). No division-by-zero risk.

---

## Issue #9 — Legal Language

### Sources and Assumptions

The legal boilerplate was drafted to match PEMB industry standard language per:
- VMBC `Quotation.txt` (extracted) — existing validity clause ("All prices are subject to change due to fluctuation in material or component prices")
- MBMA Metal Building Systems Manual Chapter 9 (Contracts & Specifications)
- PEMB-quotation-anatomy SKILL.md — Section 12 required legal language
- Standard contractor T&C patterns used in Texas construction contracts

### Assumptions / Decisions

1. **Validity period = 30 days.** SKILL.md says "30 days." Existing footer text says "subject to change due to fluctuation in material or component prices" — preserved in the Observations line. The validity clause adds the explicit 30-day limit as required.

2. **Deposit = 30% non-refundable; balance net 30 from delivery.** The SKILL.md specifies "50% with signed contract, 40% on delivery, 10% on completion." The task spec explicitly overrides this with 30%/net-30. Task spec wins (closest to VMBC's actual practice per Jose's input).

3. **Governing law = state of the project.** No Texas-specific reference hardcoded — the building estimator is used for projects in multiple states. "Laws of the state in which the project is located" is the safe default.

4. **Sales tax exclusion language.** The Scope clause says "taxes... are excluded" which aligns with QuotationPage's existing "Sales Tax Not Included" note. When `salesTaxIncluded: true`, there's a minor tension (tax IS included), but the Scope clause covers "taxes [not explicitly itemized]" — the included tax line IS itemized, so there's no contradiction.

5. **`<details>` collapsed by default on screen; always expanded in print.** Print window CSS hides `<summary>` and forces all children visible. This ensures legal content always appears in the PDF/print output regardless of collapsed state.

6. **No separate route/page.** Legal text lives inline in QuotationPage, printed with the proposal. No separate legal page added — PEMB industry standard is to include T&C on the back of the proposal page or as a footer section.

---

## Files Changed

- `webapp/src/pages/QuotationPage.tsx` — two logical commits:
  1. `feat(quotation): add $/sqft and $/lb summary metrics (#11)`
  2. `feat(quotation): add Terms & Conditions legal section (#9)`
