# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — calculation engine and catalog for PEMB cost estimation. Source of truth for all pricing math.
- **Stack:** TypeScript modules in webapp/src/: calculator.ts (cost engine), catalog.ts (components), priceList.ts (supplier prices, currently Central States), types.ts (domain models).
- **Cost formula:** Direct Materials + Labor + Overhead + Detailing + Engineering → SubTotal → Profit (15%) + Commission (4%) → Grand Total.
- **Created:** 2026-05-10

## Quick Timeline

📌 **2026-05-10:** Phase 1 shipped (server-backed catalog & pricing live). 36 tests green.

📌 **2026-05-10:** Phase 2 shipped (customers live). 57 tests green (46 server + 11 webapp).

📌 **2026-05-14:** Backlog triage complete. 9 of 17 issues assigned to Livingston across 3 sprints.

📌 **2026-05-14:** Reuben domain assessment flagged 2 calc bugs (labor base, frame opening cost) + 17-item improvement backlog.

📌 **2026-05-14 SPRINT 1 CLOSED:** PR #21 merged (calc bug fixes). Tests: 11 → 19. Schema migrations backward-compatible. All critical-path issues (#1, #2, #6) closed. Issues: #1 (labor calc base), #2 (frame opening cost), #6 (quote schema). PRs merged: #19 (Rusty schema), #21 (Livingston bugs), #22 (Linus build fix).

## Key Learnings

### IN_HOUSE_FAB_GROUPS (2026-05-14)

Material groups that incur fabrication labor: **BEAMS, CHANNELS, FLAT BARS, ANGLES, PIPES, HSS**. Everything else (cold-formed, sheeting, trim, doors, hardware, insulation, fasteners) ships cut-to-length from supplier.

### Calc Bug #1: Labor Base (2026-05-14)

**Before:** labor = (structuralWeight + componentsWeight) × laborRate  
**After:** labor = structuralWeight × laborRate (cold-formed weight excluded)  
**Impact:** Recovers –19k per quote

### Calc Bug #2: Frame Opening Cost Dispatch (2026-05-14)

**Before:** Frame-openings (cold-form Cee @ .85/LnFt) costed via weightCostSum (weight=0 →  silent failure)  
**After:** Dispatch per-row on c.measure field (Ln Ft → length×cost, Pound/ft → weight×cost)  
**Result:** Cold-formed frame-opening costs now calculated correctly

### Measure Field as Cost-Method Discriminator (2026-05-14)

Category name is wrong axis. Frame-openings proved this: same category, two pricing models. Solution: lean on measure field (already in catalog). Sniff case-insensitively for "Ln Ft" vs "Pound/ft" and dispatch accordingly. Resolves silent cost failures for mixed-measure categories.

### Vitest Recovery (2026-05-14)

webapp/package.json had no test script or vitest devDep. Test file at webapp/src/__tests__/calculator.test.ts recovered from stash (Saul). Extended with 8 new regression tests for bug fixes. Test suite: 11 → 19.

### Weight Lifecycle (2026-05-10)

- **Structural categories** (main-framing, canopy, plates, frame-openings): weight computed at runtime via FramingTable (lnFeetToFab × weightPerFt from materialSpecs.ts).
- **Component categories** (purlins, sheeting, trim, doors, hardware, fasteners, insulation, stairs): weight stays 0 by design (no labor).
- **Catalog defaults:** all weight=0 (templates, never read by calculator).

### Data Contract Risks (2026-05-10)

1. **Material string lookup:** Typos in material field cause silent  cost. Mitigation: validate at startup.
2. **Zero-price items:** Mark with flag or add cost_override field.
3. **ID immutability:** Add DB constraints to prevent renames of catalog IDs and item codes.

## Learnings

### BOM Engine: Main Framing Formulas (2026-05-15)

All formulas derived from `extracted_data/Main Framing.txt` reference building (50W × 100L × 20H ft, 4 bays @ 25 ft, pitch 1:12, gable). Verified each output against workbook cell values.

**Main Frame Columns:** Qty = 2 × (nBays+1). Length = eaveHeight. Custom tapered plate girder → weight = 0, flagged `engineerInputRequired`.

**Main Frame Rafters:** Qty = nBays+1. Length = W (commercial bar length). LnFtToFab = nFrames × 2 × rafterLengthPerSide (gable) or nFrames × W × slopeFactor (single-slope). Weight = 0, flagged.

**Wind Columns:** W 8×35. Qty = 4 for W ≥ 40 ft, 2 for W ≥ 20 ft. Deterministic weight = lnF × 35 lb/ft. Verified: qty=4, weight=2800, cost=2380 ✓

**Base Plates (Flat Bar 1/2 × 8):** Qty = 2 × (3×nFrames + windQty). Verified: 2×(15+4)=38 ✓. Plate length = 1.5208 ft (18.25"). Weight uses commercial lnF (rounded up to 20 ft).

**Purlin Plates (Flat Bar 3/16 × 6):** Qty = purlins × nFrames. Verified: 10×5=50 ✓. Plate length = 0.6875 ft (8.25"). Minor rounding: engine uses 3.83 lb/ft → 153.2 lbs; workbook shows 153. Delta = 0.2 lbs. ⚠️ Flagged for Danny.

**Side Girt Plates (Flat Bar 3/16 × 6):** Qty = girts × 4 × nFrames. ×4 = 2 sidewalls × 2 clips per column face (bypass girt). Verified: 4×4×5=80 ✓.

**End Girt Plates (Flat Bar 3/16 × 6):** Qty = girts × columnsPerEndwall × 2. columnsPerEndwall = 2 + windColumnsPerEndwall. Verified: 4×4×2=32 ✓.

**Issue #3 "25ft bay spacing" on 60ft building:** 60/25=2.4 bays (non-integer). Engine uses nBays=2. Flag for Jose/Danny: is the intended building 40×75 (3 bays × 25ft) or 40×60 (2 bays × 30ft)?

### Override Pattern (2026-05-15)

Engine generates ComponentItem defaults indexed by catalog ID (MF-01, PL-01, etc.). `mergeWithExisting(bomItems, existing)` preserves any existing component where qty > 0 OR weight > 0 (treated as deliberate user override). Zero-value existing items get the BOM default. User-added custom items (not in BOM) are preserved at end of list. Linus wires a "Recalculate BOM" button that calls generateMainFramingBOM → mergeWithExisting → writes to config.components.

### Single-Slope Geometry (2026-05-15)

For single-slope: rafter spans full width (not half-width). LnFtToFab = nFrames × W × slopeFactor. Column qty same as gable (2 × nFrames) but high-side column height = H + W×(pitch/12) — engine uses H (low side) for both. ⚠️ Flagged for engineer review.



Parametric engines (#3 main framing BOM, #4 component calc, #5 stair calc) queued. Awaiting Jose scope confirmation.

📌 **2026-05-15:** Issue #4 (parametric secondary BOM). Added `computeSecondaryFraming`, `computeSheeting`, `computeTrim`, `computeFasteners`, `computeFullBom` to bomEngine.ts. 116 new tests (226 total, all green). Formulas from Components.txt + Fasteners and Bolts.txt; factors cross-checked against 50×100×20 reference building. Assumptions logged in .squad/decisions/inbox/livingston-issue4-component-qty.md. UI wiring note dropped at linus-auto-bom-display.md.
 Added salesTaxRate (default 0.0825 TX) and salesTaxIncluded (default false) to BuildingConfig top-level (not inside overheads — it's a jurisdictional switch, not a cost-engineering knob). Extended CostBreakdown with salesTaxRate, salesTaxIncluded, salesTaxBase, salesTax. Formula per issue verbatim: base = Materials + Labor + Freight + Overhead + Erection + Foundation + Permits + Contingency + Profit + Commission (excludes detailing/engineering/loadingHauling — flagged for Reuben review). Contingency placeholder = 0 until #15 lands. Tax always computed; only added to grandTotal when salesTaxIncluded === true. Build green. Linus owns UI on salesTaxRate / salesTaxIncluded fields; Saul writes tests against new CostBreakdown shape. See .squad/decisions/inbox/livingston-tax-calc.md.
