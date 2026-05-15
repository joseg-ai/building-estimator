# Found Bug: ComparisonPage references non-existent context fields

**Date:** 2026-05-14
**By:** Linus
**Found during:** `squad/build-fix-ts-errors` (unblocking TS build on `main`)

## Summary

`webapp/src/pages/ComparisonPage.tsx` destructures `comparisonVendorIds` and
`setComparisonVendorIds` from `useBuildingConfig()`, but these fields **do not
exist** on `BuildingContextValue` (`webapp/src/context.tsx` lines 166–190).

At runtime this means:
- `selectedVendorIds` was initialised from `undefined`, so any `.filter`,
  `.includes`, or spread (`[...selectedVendorIds, id]`) on it would throw
  `TypeError: ... is not iterable / not a function`.
- Calling `setComparisonVendorIds(next)` would throw because it is `undefined`.

In other words, the Comparison page has been crashing on render for any user
who reaches it — the TS build error was masking a real runtime bug shipped in
the Phase 3 (Vendors + Comparison) work.

The `history.md` note for Phase 3 claims "localStorage persistence of
comparison selection" was implemented; `storage.ts` contains no such helpers
and `context.tsx` was never extended with these fields. The persistence wiring
appears to have been dropped between design and merge.

## Workaround applied in this PR

Replaced the broken context destructure with a plain `useState<number[]>([])`:

```ts
const { config, priceList } = useBuildingConfig();
...
const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
```

Removed the two `setComparisonVendorIds(next)` calls (the `setSelectedVendorIds`
calls remain — local React state still works).

**Behavioural effect:** the Comparison page now actually renders (it was crashing
before), but the user's vendor selection no longer persists across reloads.
This restores the page to a working baseline; persistence can be reintroduced
properly in a follow-up.

## Recommended follow-up (NOT in this PR)

Either:
1. Add `comparisonVendorIds: number[]` and `setComparisonVendorIds(next: number[]): void`
   to `BuildingContextValue` and back them with `storage.ts` helpers
   (`saveComparisonVendorIds` / `loadComparisonVendorIds`); or
2. Inline localStorage read/write directly in `ComparisonPage.tsx` (simpler,
   no context churn) — initial state from `localStorage.getItem(...)`, update
   on add/remove.

Option 2 is the smaller change and matches the "context for per-quote config,
local state for page-scoped UI" pattern Linus has used elsewhere.

## Files referenced

- `webapp/src/pages/ComparisonPage.tsx` (lines 37, 47, 125, 132 pre-fix)
- `webapp/src/context.tsx` (lines 166–190, `BuildingContextValue` interface)
- `webapp/src/storage.ts` (no comparison helpers exist)
