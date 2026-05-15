# Issue #5 — Stair Calculator UI (StructuralPage)

**Owner:** Linus · **Branch:** `squad/5-stair-calc` · **Date:** 2026-05-15

## Scope shipped
AC item 4 of issue #5 — UI on `StructuralPage` for parametric stair entry with
live preview of generated components. Engine (items 1, 2, 3, 5, 6) shipped by
Livingston in `webapp/src/stairEngine.ts` — left untouched.

## What it does
- Two-column layout (inputs left, preview right) on `lg:` breakpoint, stacks on small screens.
- **Geometry** card: levels (1–5 select), floor-to-floor (ft), stair width (ft),
  tread run (in), per-level treads-per-flight inputs that resize automatically
  when `levels` changes. Live derived readout: flights / total treads / stringer length.
- **Rails** card: right/left guard + right/left hand checkboxes, plus a
  "pickets between rails" toggle (sets `picketsPerFt` 0 ↔ 1 — workbook treats
  pickets as a binary inclusion flag, no per-rail-foot field surfaced).
- **Mid Landing** card: enable/disable toggle that flips `hasMidLanding`;
  width/length + A/B/C guard-rail flags shown only when enabled.
- **Floor Landing** card: width/length + A/B/C guard-rail flags.
- **Cost Summary** card on the right: Direct → Labor → Detailing → Hauling →
  Freight → Overhead → Sub Total → Profit (10%, badged "stair-specific") →
  Commission → Grand Total, all formatted via the existing `formatUSD` helper.
- **BOM table** in a `<details open>` collapsible matching QuotationPage's
  pattern. Columns: Description (with ID + material subtitle) / Qty / Unit /
  Length-or-Weight / Unit Cost / Extended. Footer rows show total weight and
  BOM direct total.

## Persistence
- New `stairConfig` slice on the building context (`useBuildingConfig`),
  separate from the main `BuildingConfig` reducer state.
- Auto-saved to `localStorage` key **`building-estimator-stair-config`**
  via `saveStairConfig`/`loadStairConfig` in `storage.ts` (mirrors the
  pre-existing `saveConfig`/`loadConfig` pattern, including merge-with-defaults
  to tolerate forward-compat additions).
- Default config = workbook canonical reference building (3 levels / 12.5 ft /
  5 ft wide / 11" run / treads [10,9,9] / mid-landing 10.5×4.667 (3-sided
  rails) / floor-landing 10.5×6 (3-sided rails) / right guard + both hand
  rails). New unit test `stairDefaults.test.ts` locks the defaults to the
  canonical totals: grandTotal $50,897.88 ± $0.10, weight 22,571.336 lb.

## Validation
Inline, non-blocking errors per field:
- `levels` clamped to 1–5 (select already enforces).
- `floorToFloorHeight`, `width`, `treadRunInches` must be > 0.
- Negative-number inputs clamped to 0 via `Math.max(0, v)` in setters.
- Tread counts coerced to non-negative integers.

When any blocker is active, the cost/BOM preview displays a small "Fix
validation errors" message instead of stale numbers — avoids the appearance
of a valid quote while inputs are broken.

## Constraints respected
- `stairEngine.ts` and `stairEngine.test.ts` not modified.
- No new UI / icon / state-management libraries. Pure Tailwind utility classes
  matching DesignPage/QuotationPage conventions.
- No server code touched.
- Persistence reuses the existing localStorage pattern (one extra key,
  same wrapper shape).

## Tradeoffs / deferred

1. **No SVG stair plan preview.** Issue #5 AC item 4 says "live preview of
   generated components" — I interpreted that as the live BOM + cost preview
   (which mirrors QuotationPage's auto-BOM card and is the unambiguous
   "generated components" view). A 2D plan / elevation diagram (similar to
   `BuildingDiagram.tsx`) is desirable but non-trivial — punting to a
   follow-up. Suggest opening a "stair diagram SVG" follow-up issue.
2. **Pickets are a single toggle**, not a `picketsPerFt` slider. The engine
   accepts a per-ft count but the workbook only flags pickets binary; surface
   as a checkbox and pass `1` when on, `0` when off. Can expand later if
   pricing detail emerges.
3. **Guard-rail height field not surfaced.** The engine doesn't accept a
   guard-rail height parameter (it's baked into the workbook lb/ft constants).
   The task description mentioned a `height` input — exposing it without an
   engine consumer would mislead the user, so it's omitted. If Livingston
   extends `StairCostOverrides` with a height multiplier later, I'll wire it.
4. **No "Recalculate" button.** Engine is pure / cheap, runs in a `useMemo`
   on every input edit. Matches the live-preview spec. No need for a manual
   trigger.
5. **Catalog `<ComponentTable category="stairs">` removed** from the page —
   the auto-calculated BOM replaces it. The stair items in `catalog.ts` are
   unchanged and still flow through the main building cost path for any
   manually-added rows; just the duplicated table on this page is gone.

## Open questions for the team

1. **Reuben** — confirm Livingston's two open workbook questions (stringer
   geometry half-rise/full-run; Form Stringer 6/10/8 per-flight constants).
   The UI will inherit whatever the engine decides; no UI change needed
   either way.
2. **Reuben / Danny** — should the stair grand total roll into the main
   QuotationPage cost summary? Right now StructuralPage is standalone; the
   existing `calculator.ts` already sums `stairs` / `structural-landing` /
   `structural-columns` category rows from `config.components`, but those
   rows are manually entered — the new parametric `stairConfig` lives in a
   separate slice. Suggested follow-up: optionally push `computeStairBom`
   output into `config.components` (via a "Generate stair components" button,
   same pattern as Livingston's main-framing merge in `bomEngine.ts`).

## Files changed
- `webapp/src/pages/StructuralPage.tsx` — full rewrite (stub → parametric form + preview)
- `webapp/src/context.tsx` — added `stairConfig`, `setStairConfig` to context
- `webapp/src/storage.ts` — added `createDefaultStairConfig`, `saveStairConfig`, `loadStairConfig`
- `webapp/src/__tests__/stairDefaults.test.ts` — new smoke test (3 tests)

## Tests
- `npm run build` — passes (only pre-existing warning about `api.ts` dynamic import).
- `npm test` — 7 files / **336 tests passed** (was 333 → +3).
