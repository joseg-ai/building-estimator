# Decision: Split insulation calc into side-wall vs end-wall (Issue #35)

**Author:** Livingston (Domain Engineer)
**Sprint:** 2
**Status:** Pending Reuben review
**Branch:** `squad/35-insulation-split`

## Summary

PR #32 (Issue #10) shipped auto-calculated insulation using a combined perimeter
(`2(W+L)×eaveHeight`). Audit follow-up: this loses per-orientation accuracy and
mis-attributes opening deductions. Issue #35 splits the wall calc into side and
end with average end-wall height that accounts for the gable triangle.

## Formula derivation

### Average end-wall height — gable

End wall area = rectangle + triangle:
```
rect     = width × eaveHeight
triangle = ½ × width × slopeRise,  where slopeRise = (roofPitch/12) × (width/2)
area     = width × eaveHeight + (width × roofPitch × width) / 48
avgH     = area / width
         = eaveHeight + (roofPitch × width) / 48
```

### Average end-wall height — single-slope

End wall is trapezoidal across the full width (one side at `eaveHeight`,
opposite at `eaveHeight + (roofPitch/12) × width`):
```
slopeRise = (roofPitch/12) × width
avgH      = eaveHeight + slopeRise/2
          = eaveHeight + (roofPitch × width) / 24
```

The single-slope rise is twice the gable contribution because the slope spans
the full width, not half. Branched in `avgEndWallHeight()` via `roofType`.

## PEMB defaults for opening → wall mapping

| Opening slot     | Default side | Rationale                                         |
|------------------|--------------|---------------------------------------------------|
| `doors3070`      | side         | Walk doors on side walls per typical PEMB layout  |
| `doors4070`      | side         | Walk doors                                        |
| `door6070`       | side         | Walk doors                                        |
| `window3030`     | side         | Daylighting on long sides                         |
| `window4030`     | side         | Daylighting                                       |
| `window6030`     | side         | Daylighting                                       |
| `window6040`     | side         | Daylighting                                       |
| `rollUpDoors`    | end          | Truck access at gable ends (clear-span advantage) |
| `frameOpenings`  | end          | Loading dock / equipment access at gable ends     |

Constant: `OPENING_DEFAULT_WALL_SIDE` in `types.ts`. Helper:
`getEffectiveWallSide(opening, type)` returns the explicit `wallSide` if set,
otherwise the PEMB default for that slot.

## Schema choice: `wallSide?: 'side'|'end'` vs `walls[]`

Chose the optional field on `DoorWindowEntry` for three reasons:

1. **Backwards compatible by construction.** Older localStorage configs
   without the field still type-check and fall through to PEMB defaults via
   `getEffectiveWallSide()`. A structured `walls[]` config would require a
   migration path.
2. **Matches user mental model.** Estimators think "I want 2 walk doors on
   the side wall," not "I want a wall array with door entries."
3. **Per-opening granularity.** A user can have 3 walk doors on the side
   and 1 explicitly tagged to an end wall without restructuring the config.

Trade-off: cannot model per-wall finishes (e.g. different sheeting on
north vs south side walls). Acceptable today — out of scope for #35.

## Backwards compatibility test

`backwards compat: opening without wallSide field falls through to PEMB default`
strips `wallSide` from every entry to simulate legacy localStorage, then asserts
the deduction still lands on the correct sub-total. Passes.

## Workbook cross-check delta vs PR #32

The new calc produces **+6.94% more wall sqft** on the 50×100×20 gable ref
building than the old combined-perimeter calc:

| Calc                     | Side wall | End wall              | Total |
|--------------------------|-----------|-----------------------|-------|
| Old (PR #32, perimeter)  | n/a       | n/a                   | 6000  |
| New (#35, split)         | 4000      | 2 × 50 × 24.167 = 2417 | 6417  |

This is the **correct geometry** — end walls physically extend up to the ridge
on average. PR #32's 5%-tolerance assertion was within tolerance of the *old*
combined-perimeter number, not the *true* wall area. The new calc is the bug
fix called for in the audit; no tolerance was relaxed — expected values were
recomputed from first principles in `insulation.test.ts`.

The 40×60×16 ref tests in the existing suite were also updated to use
`SIDE_WALL_SQFT + END_WALL_SQFT` instead of the old `PERIMETER × eaveHeight`.

## Zero-clamp behavior

Side and end sub-totals are clamped to ≥ 0 **independently**. An over-deducted
end wall (huge roll-up door) cannot subtract from the side wall sub-total.
Tested: `zero-clamp: oversized end-wall openings clamp end sub-total to 0,
side unaffected`.

## insulation.wall on/off

When `insulation.wall === false`, **both** side and end are excluded. The gable
triangle is part of the wall surface, not the roof, so it never leaks into
`breakdown.roof`. Tested: `insulation.wall === false suppresses BOTH side and
end (does not leak gable triangle)`.

## Deferred: per-wall R-value override

Issue #35 body explicitly says deferring this is acceptable. Today both sides
use the same `insulation.rValue`. Follow-up issue should:
- Extend `InsulationConfig` with `sideRValue?` / `endRValue?` / `roofRValue?`
- Default each to the global `rValue` for backwards compat
- Surface in Linus's UI when an "advanced" toggle is on

Flagged for Jose / Reuben if needed.

## Open questions for Reuben

1. **Are roll-up doors ever on side walls in practice?** I defaulted them to
   end walls. The `wallSide: 'side'` override is available, but if side-wall
   roll-ups are common enough we should make the default configurable per
   project profile.
2. **Frame openings — always end walls?** Same question. Could be either.
3. **Mono-slope end-wall direction matters for some calcs but not for the
   total area (since avg height applies regardless of which side is taller).**
   Confirm we're OK ignoring orientation for now.
4. **Workbook reference for 50×100×20 R-13 insulation total?** Couldn't find a
   first-party reference in `extracted_data/`. The cross-check uses
   first-principles derivation (sqft × $/sqft from `rValuePriceTable`).

## Files touched

- `webapp/src/types.ts` — added `wallSide?` to `DoorWindowEntry`,
  `OpeningType`, `OPENING_DEFAULT_WALL_SIDE`. `createDefaultConfig()` seeds
  defaults on each opening slot.
- `webapp/src/calculator.ts` — added `getOpeningWallSide`,
  `getEffectiveWallSide`, `avgEndWallHeight`, `computeInsulationBreakdown`.
  Refactored `computeInsulationCost` to delegate to the breakdown.
- `webapp/src/__tests__/insulation.test.ts` — 18 new assertions; updated the
  40×60×16 ref constants to the new geometry.

## Test count

- Before #35: 350
- After #35: 368 (+18)
- All passing on `npm test -- --run`.
