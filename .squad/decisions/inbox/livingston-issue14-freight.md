# Issue #14 — Freight calculator (engine portion)

**Author:** Livingston (Domain Engineer)
**Branch:** `squad/14-freight-calc`
**Scope:** Engine only — items 2, 3, 4, 6 of the acceptance criteria. UI (items 1, 5) is Linus's scope.

## Workbook reference

`extracted_data/Summary.txt` row 78:

```
[3]=Cost by SqFt ROOF | [5]=21.569... | [9]=KM | [10]=200 | [11]=0 | [12]=Freight | [14]=0
```

- Col 9 — unit label (`KM`)
- Col 10 — distance value (sample: 200)
- Col 11 — `$/km` rate (sample: 0, but **Issue #14 documents 4.6 $/km as the canonical default**)
- Col 14 — freight cell = col 10 × col 11

The workbook does not encode an "auto vs manual" switch — it just multiplies. We add that switch on top to preserve the existing flat-dollar UX without losing the parametric formula.

## Default rate justification

Default `freightRate = 4.6 $/km` per the Issue #14 body. Row 78's `0` is a sample with no shipment configured; the issue explicitly calls out 4.6 as the documented per-km rate. No rounding applied.

## Precedence rule

```ts
freightAutoCalc === true  → freight = max(0, freightDistance × freightRate)   // flat field IGNORED
freightAutoCalc === false → freight = overheads.freight (flat override)
freightAutoCalc undefined → flat (legacy localStorage compat)
```

Rationale: when auto-calc is on, the flat field is a stale leftover from the prior UX and must not silently leak into the total. Treating it as a max-of would defeat the "calculator vs override" mental model. Auto wins decisively when enabled.

`Math.max(0, …)` defends against negative distance/rate entered by a user (e.g. typo).

## Backwards-compatibility

`ProjectOverheads.freightDistance | freightRate | freightAutoCalc` are all declared **optional** so configs hydrated from older localStorage (pre-#14) continue to type-check. `resolveFreight()` reads `freightAutoCalc === true` strictly, so any legacy config without the flag falls through to flat-freight behavior — identical to the pre-#14 contract.

`createDefaultConfig()` ships new configs with `{ freightDistance: 0, freightRate: 4.6, freightAutoCalc: true, freight: 0 }`. A brand-new project starts at 0 freight (distance × rate = 0) — same total as before — until the user enters a distance.

## Calculator integration

`calculateCosts()` now destructures everything except `freight` from `overheads`, then calls `resolveFreight(config.overheads)` for the single source of truth. Sales-tax base behavior is unchanged: the resolved freight value flows into both `subTotal` and `salesTaxBase` exactly where the flat field used to.

## UI note (single-line type narrowing in SummaryPage.tsx)

Adding `freightAutoCalc?: boolean` to `ProjectOverheads` widened `overheads[key]` in `SummaryPage.tsx`'s overheads input loop to `number | boolean | undefined`, breaking the `value=` prop type. Applied a minimum-impact `as number` narrowing on line 123 to keep TS at 0 errors. No UI logic changed.

**For Linus (Issue #14 UI ticket):** when wiring the distance/rate inputs on `SummaryPage`/`QuotationPage`, give them their own controls outside the numeric-overheads `.map()` loop — that loop's `keyof typeof overheads` iteration only fits homogeneous numeric fields. Don't add `freightAutoCalc` or `freightDistance` to its array.

## Open questions for Reuben / Jose

1. **Unit toggle (km vs miles)** — Issue #14 item 1 mentions "(km or miles)". The engine stores distance in km only (matches workbook col 9 = `KM`). A miles toggle would be a UI-side conversion (`miles × 1.609 → km`) before writing to `freightDistance`. Engine deliberately stays unit-agnostic; flagging for product decision on whether the toggle ships in Sprint 2 or later.
2. **Per-project rate override vs global default** — Should the 4.6 $/km default be tweakable in a settings/admin page (like sales-tax rate), or always per-project? Current implementation is per-project (lives in `overheads`).
3. **Tax base inclusion** — Freight remains in the sales-tax base (unchanged from pre-#14). Confirmed correct per issue #13 spec; calling it out so it's not re-litigated.
