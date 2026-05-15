# Issue #5 — Stair Parametric Calculator (engine only)

**Owner:** Livingston · **Branch:** `squad/5-stair-calc` · **Date:** 2026-05-15

## Scope shipped
Engine-only deliverable per issue #5 AC items 1–3, 5, 6. Linus owns the UI on
`StructuralPage` (AC item 4). Public API exported from `webapp/src/stairEngine.ts`:

- `StairConfig`, `StairLanding`, `StairRails`, `StairComponentItem`, `StairCostOverrides`, `StairCostBreakdown`
- `computeStairBom(cfg) → StairComponentItem[]`
- `computeStairCost(cfg, overrides?) → StairCostBreakdown`

## Workbook canonical cross-check
Reference case from `extracted_data/Stairs.txt` + `extracted_data/Structural.txt`:
3 levels, 12.5 ft FtF, 5 ft wide, mid-landings, treads = [10, 9, 9] @ 11", right
guard rail only, both hand rails, mid landing 10.5×4.667, floor landing 10.5×6.

| Workbook row | Field | Workbook | Engine | Δ |
|---|---|---:|---:|---:|
| 9 | Stringer qty | 12 | 12 | 0 |
| 9 | Stringer length (ft) | 11.0946 | 11.0946 | 0 |
| 9 | Stringer weight (lb) | 2898 | 2898 | 0 |
| 10 | Tread Support qty | 112 | 112 | 0 |
| 10 | Tread Support weight | 1075.2 | 1075.2 | 0 |
| 11 | Form Stringer 4ft qty / weight | 36 / 408 | 36 / 408 | 0 |
| 12 | Form Stringer 8ft qty / weight | 60 / 1224 | 60 / 1224 | 0 |
| 13 | Form Stringer 5ft qty / weight | 48 / 612 | 48 / 612 | 0 |
| 14 | Step Steel qty / weight | 56 / 1260 | 56 / 1260 | 0 |
| 15 | Guard Rail qty / length | 12 / 12.0946 | 12 / 12.0946 | 0 |
| 17 | Guard Rail Supports qty | 48 | 48 | 0 |
| 18 | Hand Rail qty / length | 12 / 13.0946 | 12 / 13.0946 | 0 |
| 19 | Brackets qty | 60 | 60 | 0 |
| 20 | **Stairs section weight** | **8944.92** | **8944.92** | **0** |
| 23 | Mid Landing Square qty / weight | 9 / 3216 | 9 / 3216 | 0 |
| 26 | Mid Landing Guard Rail length | 19.833 | 19.833 | 0 |
| 30 | **Mid landing weight** | **5030.52** | **5030.52** | **0** |
| 33 | Floor Landing Square length (2W+L) | 27 | 27 | 0 |
| 40 | **Floor landing weight** | **5581.496** | **5581.496** | **0** |
| 45 | **Columns weight (HSS 4×4)** | **3014.4** | **3014.4** | **0** |
| 47 | **Total stair weight** | **22571.336** | **22571.336** | **0** |
| 48 | **Direct cost** | **26174.05** | **26174.05** | **<0.001** |
| 49 | Labor (0.60 × weight) | 13542.80 | 13542.80 | 0 |
| 55 | Overhead (3%) | 1300.41 | 1300.41 | <0.001 |
| 59 | Sub Total | 44647.26 | 44647.26 | <0.001 |
| 60 | **Profit (10% — stair-specific)** | **4464.73** | **4464.73** | **<0.001** |
| 61 | Commission (4%) | 1785.89 | 1785.89 | <0.001 |
| 62 | **Grand Total** | **50897.88** | **50897.88** | **<0.001** |

All BOM weights match to the penny. Direct cost drifts by <$0.001 due to floating
point on lb/ft constants (all 9 lb/ft values were back-derived from workbook
`weight / lnF` and match exactly).

## Key formulas

| Component | Formula |
|---|---|
| flights | `levels × (hasMidLanding ? 2 : 1)` |
| rise per flight | `FtF / (hasMidLanding ? 2 : 1)` |
| run per flight | `treadsPerFlight[0] × treadRunInches / 12` |
| stringer length | `sqrt(rise² + run²)` |
| stringer qty | `2 × flights` |
| tread support qty | `4 × totalTreads`, length = `stairWidth` |
| step steel qty | `2 × totalTreads`, length = `stairWidth`, priced $/LnFt |
| guard rail qty | `2 × flights × (rightGuard + leftGuard)`, length = `stringer + 1` |
| guard rail supports | `ceil(stringer / 1.5) × flights × guardSides`, length = 4.5 ft |
| hand rail | `flights × (rightHand + leftHand)`, length = `stringer + 2` |
| brackets | `2 × totalTreads + 2 × handSides` |
| mid/floor landing channels | qty `3 × nLandings`, length `2W + L` (2 long + 1 short edge) |
| mid landing support | 1 per landing × `nLandings`, length = `stairWidth` |
| floor landing support | 1 per landing × `nLandings`, length = `landing.length` |
| landing angles | qty `7 × nLandings`, length = `landing.length` |
| landing guard rail | length = enabled-edge perimeter (A+B+C flags) |
| landing guard supports | `ceil(railLength / 4) × nLandings`, length 4.5 ft |
| landing deck panels | 2 panels of length `landing.width` per landing |
| columns (mid + floor) | 4 per landing × `levels` each, length = FtF |

## Geometry assumption (workbook idiosyncrasy)

⚠️ **Workbook flag:** When `hasMidLanding=true`, the workbook's stored stringer
length uses `sqrt((FtF/2)² + (treads × R/12)²)` — i.e. **half the rise but the
full per-ascent run**. That is geometrically idealized (the actual physical
sub-flight has only half the treads, hence half the run) but we mirror the
workbook so direct cost stacks match exactly. Documented inline in
`runPerFlight()`. Reuben should confirm this is intentional in the source
spreadsheet; if not, the engine can be tightened to true-geometric per-sub-flight
length, which would shrink stringer LnF by ~30% in the canonical case.

## Form Stringer constants (workbook-only)

⚠️ The three "Form Stringer" flat-bar quantities are stored in the workbook as
per-flight constants with no visible formula in the extracted text:

- 6 × 4 ft pieces per flight
- 10 × 8 ft pieces per flight
- 8 × 5 ft pieces per flight

These multipliers reproduce workbook qty 36 / 60 / 48 for the canonical 6-flight
case exactly, but their parametric derivation (per-tread? per-width?) is unknown
without spreadsheet formula access. **Open question for Reuben.** Until clarified,
the engine encodes them as fixed per-flight constants.

## Cost stack (separate 10% profit per #5 AC item 6)

Stairs use a distinct profit rate (10%) from the main-building stack (15%) — see
`Structural.txt` row 60 (workbook `[16]=0.1`). Commission stays at 4% — same as
the rest of the workbook (`[16]=0.04` row 61). Defaults are:

| Field | Default | Source |
|---|---|---|
| laborRate | 0.60 $/lb | Structural.txt row 49 |
| detailing | 1500 | row 51 |
| loadingHauling | 980 | row 53 |
| freight | 1150 | row 54 |
| overheadRate | 0.03 | row 55 |
| **profitRate** | **0.10** | row 60 (stairs-specific) |
| commissionRate | 0.04 | row 61 |

All overridable via `StairCostOverrides`.

## Diagram-coordinate flags ignored

Stairs.txt rows 4–5 had `[7]=False/True` flags and rows 29/47 had `[11]=a/c`,
`[17]=a/c` markers. These are diagram-coordinate hints from the original
spreadsheet (probably for the rendered stair plan view, mapping landing edges to
schematic letters). They don't drive any quantity calculation and are skipped.

## Open questions

1. **Reuben — Stringer geometry:** Confirm the half-rise/full-run formula is the
   intended workbook convention, not a bug. If sub-flights should use true
   geometry (half-rise + half-run), tighten the formula and re-baseline costs.
2. **Reuben — Form Stringer multipliers:** Where do 6/10/8 per flight come from
   in the original spreadsheet? Is it a fixed assembly or width-/tread-dependent?
3. **Linus — UI wiring:** A `Recalculate Stair BOM` button on StructuralPage
   should call `computeStairBom(stairConfig)`, merge results with user edits
   (same pattern as `mergeWithExisting` for main framing), and a cost preview
   card should call `computeStairCost(stairConfig)`. The existing
   `stairsCatalog` in `catalog.ts` aligns by name; do **not** delete it — the
   engine produces compatible `ComponentItem` rows with same IDs (`ST-01`…`ST-10`)
   plus new landing/column IDs (`ST-ML*`, `ST-FL*`, `ST-MC`, `ST-FC`).
4. **Catalog drift check:** Existing `stairsCatalog` entries match the engine's
   group/material/commLength/costPerUnit values 1:1. No silent overrides made.

## Tests
- `webapp/src/__tests__/stairEngine.test.ts` — 65 tests covering:
  - All 11 stair BOM rows + 12 landing rows + 2 column rows on the canonical case
  - 5 workbook section weight totals (8944.92, 5030.52, 5581.496, 3014.4, 22571.336)
  - Full cost stack rows 48–62
  - Parametric variant: 2 levels / 13 treads / no mid-landing / 2-sided landing rail
  - Cost overrides (profit rate)

Test count: 268 → 333 (+65).
