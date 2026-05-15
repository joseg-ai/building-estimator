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

## Sprint 2 Ready

Parametric engines (#3 main framing BOM, #4 component calc, #5 stair calc) queued. Awaiting Jose scope confirmation.

📌 **2026-05-15:** Issue #13 (sales tax calc). Added salesTaxRate (default 0.0825 TX) and salesTaxIncluded (default false) to BuildingConfig top-level (not inside overheads — it's a jurisdictional switch, not a cost-engineering knob). Extended CostBreakdown with salesTaxRate, salesTaxIncluded, salesTaxBase, salesTax. Formula per issue verbatim: base = Materials + Labor + Freight + Overhead + Erection + Foundation + Permits + Contingency + Profit + Commission (excludes detailing/engineering/loadingHauling — flagged for Reuben review). Contingency placeholder = 0 until #15 lands. Tax always computed; only added to grandTotal when salesTaxIncluded === true. Build green. Linus owns UI on salesTaxRate / salesTaxIncluded fields; Saul writes tests against new CostBreakdown shape. See .squad/decisions/inbox/livingston-tax-calc.md.
