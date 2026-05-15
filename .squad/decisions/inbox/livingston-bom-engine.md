# Decision: BOM Engine — Main Framing (Issue #3)

**Date:** 2026-05-15  
**Author:** Livingston  
**Branch:** squad/3-bom-engine  
**Status:** Implemented — pending Danny/Jose review

---

## Scope: What members are included in this PR

| Member | ID | Group | Weight Deterministic? |
|---|---|---|---|
| Main Frame Columns | MF-01 | BEAMS (custom) | ❌ — engineer input required |
| Main Frame Rafters | MF-03 | BEAMS (custom) | ❌ — engineer input required |
| Wind Columns | MF-05 | BEAMS (W 8×35) | ✅ — from material spec |
| End Frame Columns | MF-02 | COLD FORM | ✅ — from material spec (only when `economicEndFrame=true`) |
| End Frame Rafters | MF-04 | COLD FORM | ✅ — from material spec (only when `economicEndFrame=true`) |
| Central Poles | MF-06 | PIPES | ✅ — from material spec (only when `centralPoles=true`) |
| Base Plates | PL-01 | FLAT BARS | ✅ — from material spec |
| Purlin Plates | PL-02 | FLAT BARS | ✅ — from material spec |
| Side Girt Plates | PL-03 | FLAT BARS | ✅ — from material spec |
| End Girt Plates | PL-04 | FLAT BARS | ✅ — from material spec |

**Out of scope for this PR:** Canopy framing, lean-to framing, frame openings, overhangs.

---

## Formula Source Notes

All formulas derived from `extracted_data/Main Framing.txt`, workbook sheet "Main Framing".  
Reference building: **50W × 100L × 20H ft, 4 bays @ 25 ft, pitch 1:12, gable**.

### Verified formula outputs (engine vs. workbook)

| Item | Formula | Workbook | Engine | Match? |
|---|---|---|---|---|
| Main Frame Columns qty | 2 × nFrames | 10 | 10 | ✅ |
| Main Frame Columns lnFtToFab | qty × H | 200 | 200 | ✅ |
| Wind Columns weight | lnF × 35 lb/ft | 2800 lbs | 2800 lbs | ✅ |
| Wind Columns direct cost | weight × 0.85 | $2380 | $2380 | ✅ |
| Base Plates qty | 2×(3×nFrames+windQty) | 38 | 38 | ✅ |
| Base Plates weight | lnF × 13.6 lb/ft | 816 lbs | 816 lbs | ✅ |
| Purlin Plates qty | purlins × nFrames | 50 | 50 | ✅ |
| Purlin Plates weight | lnF × 3.83 lb/ft | 153 lbs | 153.2 lbs | ⚠️ ±0.2 lbs |
| Side Girt Plates qty | girts × 4 × nFrames | 80 | 80 | ✅ |
| End Girt Plates qty | girts × columnsPerEndwall × 2 | 32 | 32 | ✅ |

### ⚠️ Flagged anomalies for Danny review

1. **Purlin/End Girt Plate weight rounding:** Engine uses `Flat Bar 3/16 x 6 = 3.83 lb/ft` from `materialSpecs.ts`. Workbook produces 153 lbs exactly (not 153.2). The workbook may use a slightly different constant (possibly 3.825 lb/ft). Delta = 0.2 lbs per 40 lnFt — negligible commercially but affects exact match. Recommend verifying `materialSpecs.ts` flat bar weight against supplier spec sheet.

2. **Custom main frame weight:** Main frame columns (MF-01) and rafters (MF-03) use `Ninguno` material (custom tapered plate girder). Their weight is 0 in the BOM until the structural engineer provides it. The FramingPage must show a visual flag (`engineerInputRequired`). Linus to wire the UI indicator.

3. **Issue #3 "25ft bay spacing" ambiguity:** The issue specifies "40×60×16 @ 25ft bay spacing." 60/25 = 2.4 (non-integer). Engine requires an integer `baySpacing` (number of bays). Tests use `nBays=2` (2 bays × 30 ft). **Decision needed:** Is the intended building 40×75 (3 bays × 25 ft) or 40×60 (2 bays × 30 ft)?

4. **Single-slope column height asymmetry:** For single-slope, the high-side column height = H + W×(pitch/12). Engine uses `H` (low-side eave height) for all columns. This is conservative (under-estimates column steel for the high side). **Decision needed:** Should `BuildingDimensions` add a `ridgeHeight` or `highSideHeight` field for single-slope?

5. **Wind column threshold:** Engine uses W ≥ 40 ft → 4 wind columns, W ≥ 20 ft → 2 columns. This was reverse-engineered from one data point (W=50 → 4). Verify with PEMB engineering practice whether threshold is exactly 40 ft.

---

## Override Semantics

The BOM engine is a pure function — it reads config, writes nothing. The FramingPage continues to own `config.components`. Override flow:

```
1. User opens FramingPage (or clicks "Recalculate BOM"):
     const bom = generateMainFramingBOM(config);
     config.components = mergeWithExisting(bom.items, config.components);

2. User edits rows in FramingTable → updates config.components directly.

3. On next "Recalculate BOM":
     mergeWithExisting() preserves any component where qty > 0 OR weight > 0
     (treated as intentional user override).
     Zero-qty/weight rows get BOM default.
     User-added custom rows (ID not in BOM) are appended unchanged.
```

**Hard reset to engine defaults:** pass `[]` as the `existing` argument to `mergeWithExisting()`.

---

## What's NOT done yet (follow-up work)

| Item | Owner | Issue |
|---|---|---|
| FramingPage UI wiring ("Recalculate BOM" button) | Linus | New issue needed |
| `engineerInputRequired` visual flag in FramingTable | Linus | New issue needed |
| Secondary framing BOM (purlins, girts, base angles) | Livingston | Issue #4 |
| Stair parametric calculator | Livingston + Linus | Issue #5 |
| Canopy framing BOM | Livingston | Backlog |
| Lean-to framing BOM | Livingston | Backlog |
| Single-slope high-side column height field | Jose/Danny decision | Backlog |
| `baySpacing` clarification (ft vs. count) in UI | Linus | Backlog |
