# Issue #14 — Freight UI (Linus, Sprint 2)

Wired the freight calculator UI on `SummaryPage.tsx` on top of Livingston's
engine (`resolveFreight`) and widened `ProjectOverheads`. Engine/types/tests
under Livingston's ownership untouched.

## Layout

Promoted Freight out of the generic numeric-overheads `.map()` loop into its
own dedicated section, placed immediately below "Overhead & Cost Parameters"
(so the rollup table directly underneath still reads top-to-bottom in the same
order the user just edited). Heading is `Freight` with the auto/manual toggle
on the right-hand side of the heading row, matching the visual weight of the
StructuralPage stair toggles.

```
┌── Freight ──────────────────── [✓] Auto-calculate (distance × rate) ──┐
│  Distance (km)    Rate ($/km)    Computed Freight                    │
│  [   200    ]     [   4.6   ]    $920.00                             │
└──────────────────────────────────────────────────────────────────────┘
```

When manual is selected, the three-column auto group collapses to a single
"Freight (flat $)" input. The rollup row `Freight` below still reads from
`costs.freight` (engine-resolved), so the displayed total auto-updates on
every keystroke through the existing `useReducer` → `calculateCosts` pipeline.

## Toggle style: native checkbox

Chose a plain checkbox over radio pair or a custom switch component. Reasons:
- Consistent with the existing form vocabulary (no switch components elsewhere
  in the app — StructuralPage uses checkboxes for booleans).
- One-click toggle, keyboard-accessible by default (space bar), no extra CSS.
- A radio pair would have implied two equal-weight modes; auto is the default
  and the common case, so a single "enable auto-calc" checkbox better matches
  intent.

## Value preservation across toggle

Toggling `freightAutoCalc` only flips that one boolean in `overheads` — the
flat `freight`, `freightDistance`, and `freightRate` fields are never cleared
by the UI. So a user who enters distance=150 / rate=5.2, toggles to manual,
types a flat $9,000, then toggles back to auto will see their original
$780 auto-calc restored without re-entry. Covered by the
"preserves distance/rate values when toggled to manual, then back" test in
`freightUI.test.ts`. This matches Livingston's engine which already ignores
the inactive branch's fields.

## Legacy localStorage tolerance

Older configs persisted before #14 won't have `freightAutoCalc` /
`freightDistance` / `freightRate`. The UI reads them with `?? true`, `?? 0`,
`?? 4.6` respectively (matching the workbook default rate Livingston spec'd).
No new localStorage key was introduced — everything lives in the existing
`overheads` slice that `context.tsx` already persists.

## Cleanup

Removed Livingston's transitional `(overheads[key] as number)` cast on the
generic overheads `.map()` loop. Since `freight` (now extracted) was the only
field that could be a boolean-adjacent concern, narrowing the loop's key union
to the explicit list of numeric/percent keys made the casts unnecessary —
TS compiles clean at 0 errors.

## Deferred

- **Miles ↔ km unit toggle** (Livingston's open question in
  `livingston-issue14-freight.md`). Not in #14 AC, would need a third toggle
  state and a stored unit preference. Punt to a follow-up issue if the
  US-based users find km awkward; current label is explicitly `Distance (km)`
  to make the unit unambiguous.
- **Per-account default rate.** Hardcoded fallback to 4.6 $/km matches the
  workbook. If different territories warrant different defaults, that's a
  customers/profiles concern, not the SummaryPage.

## Build & tests

- `npm run build`: clean, 0 TS errors.
- `npm test`: 350 passing (was 345; +5 new in `freightUI.test.ts`).

## Files touched

- `webapp/src/pages/SummaryPage.tsx` (refactor + new freight section)
- `webapp/src/__tests__/freightUI.test.ts` (new, 5 tests)
- `.squad/decisions/inbox/linus-issue14-freight-ui.md` (this note)
- `.squad/agents/linus/history.md` (sprint entry)

Engine, types, and Livingston's `freight.test.ts` deliberately untouched.
