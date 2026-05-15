# Decision Inbox — Issue #4: Parametric Secondary BOM Assumptions

**Author:** Livingston  
**Date:** 2026-05-15  
**Issue:** #4 — Parametric component quantity calculator  
**PR:** squad/4-component-qty  

---

## Summary

Implemented `computeSecondaryFraming`, `computeSheeting`, `computeTrim`, `computeFasteners`, and `computeFullBom` in `webapp/src/bomEngine.ts`. All formulas derived from `extracted_data/Components.txt` and `extracted_data/Fasteners and Bolts.txt`. The following assumptions were made where the workbook formula could not be exactly reproduced.

---

## Assumption 1 — Purlin Length vs. Building Length

**Workbook observation:** `Components.txt` row 13 shows Roof Purlins with `Length=130` for a building where all side wall girts have `Length=100` (building length = 100 ft). This 30 ft discrepancy implies the reference building had gable overhangs of 15 ft front + 15 ft back, extending the purlins beyond the endwalls.

**Engine default:** Purlin length = `L` (building length, no overhangs). Overhang purlins are not yet modeled as a separate line item.

**Workbook delta:** Engine will under-order purlins on buildings with gable overhangs. Estimator should manually add overhang purlin footage until overhang config is wired.

**Recommendation:** Add `overhangs.front` and `overhangs.back` to purlin length formula when Linus wires the overhang config fields in DesignPage (Issue #TBD).

---

## Assumption 2 — Fastener Factor (screws/sqft)

**Derivation:** Reference building (50W × 100L × 20H, gable, 1:12): workbook `Fasteners` qty = 7858.9. Estimated total sheeted area ≈ 11,122 sqft (roof + two sidewalls + two end walls with average height). Factor = 7858.9 / 11,122 ≈ **0.71 screws/sqft**.

**Confidence:** Medium. Area estimate depends on exact end-wall average height formula.

**Recommendation:** Reuben to cross-check with a second job from the workbook archive. If a different reference building is available, derive a more precise factor.

---

## Assumption 3 — Tri Bead Tape Sealant (1 roll per 25 ft of building length)

**Derivation:** Workbook row 88: 4 rolls for L=100 → 1 roll per 25 ft.

**Confidence:** Medium. This is an industry-standard sealant roll (25 ft rolls), but the workbook may use a different driving variable (e.g., panel laps). Flagged for Reuben verification.

---

## Assumption 4 — Polyurethane Tube Sealant (1 tube per 2960 sqft)

**Derivation:** Workbook row 89: qty=3.759 for reference building. totalArea ≈ 11,122. 11,122 / 3.759 ≈ 2,960 sqft/tube.

**Confidence:** Low (derived from one data point). The tube sealant may follow a different formula (e.g., ridge length + eave length). Flagged for Reuben.

---

## Assumption 5 — Closure Strip Count (1 per 13 lnft of roof panel LnFtToFab)

**Derivation:** Workbook rows 90/92: 129 pcs each for roofLnFtToFab=1672.67. 1672.67/129 ≈ 12.97 ≈ 13.

**Confidence:** High (reproduces workbook value to within 1 pc for reference building). The formula works because PBR panels connect at ~13 lnft intervals at eaves and endlaps.

**Workbook match:** Engine produces 129 for the reference building ✓.

---

## Assumption 6 — Low Floating Eave Plate (1 per 4 ft of building length)

**Derivation:** Workbook row 94: 25 plates for L=100. 100/4=25 ✓. Ceiling applied.

**Confidence:** High.

---

## Assumption 7 — Low Floating Rake Support ((W/2 × slopeFactor) / 5)

**Derivation:** Workbook row 95: qty=5.018. Engine computes (W/2 × slopeFactor) / 5 = (25 × 1.00347) / 5 = 5.017 ✓.

**Confidence:** High. The 5 ft interval is a standard rake support spacing.

---

## Assumption 8 — Backup Plate (1 per foot of building length)

**Derivation:** Workbook row 96: 100 pcs for L=100 ✓.

**Confidence:** High.

---

## Assumption 9 — Sheeting Angle (1 per foot of perimeter)

**Derivation:** Workbook row 98: 300 pcs for perimeter=2×(100+50)=300 ✓.

**Confidence:** High.

---

## Assumption 10 — Roof Panel Length (full sloped width W × slopeFactor)

**Derivation:** Workbook row 29: qty=33.33=L/3, length=50.18≈50×√(1+(1/12)²). The length of 50.18 ft = the full sloped width (both slopes for gable), not per-slope length of 25.09 ft. Ordering as one cut-to-length piece spanning the full gable width is consistent with how the supplier quotes panel runs.

**Confidence:** High (confirmed by workbook formula).

---

## Open Questions Filed for Future Sprints

1. **Overhang purlins:** Add `overhangs.front + overhangs.back` to purlin length once Linus wires overhang config.  
2. **Outside Corner Trim ordering discrepancy:** Workbook shows 4 pcs ordered for 80 lnft at CommLength=10 (expecting 8). Possible that corner trim ships as 20 ft pieces nested in 10 ft billing increments. Flag for Reuben/supplier verification.  
3. **Sealant factors:** Both tape and tube sealant factors derived from one workbook snapshot. A second reference job would increase confidence.  
4. **Single-slope ridgeHeight field:** `ridgeHeight = H + W × pitch/12` is computed inline in the engine. No new field added to `BuildingConfig` — it's a derived value. If Linus needs to display it on the DesignPage, add a computed property or expose `computeRidgeHeight(config)` from the engine.

---

## Co-author

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
