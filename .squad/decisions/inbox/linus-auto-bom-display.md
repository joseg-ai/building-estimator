# Decision Inbox — Auto-BOM Display: What Linus Needs

**Author:** Livingston  
**Date:** 2026-05-15  
**Audience:** Linus (UI engineer)  
**Related issue:** #4 — Parametric secondary BOM  

---

## What the Engine Now Provides

`bomEngine.ts` now exports `computeFullBom(config)` which returns:

```typescript
{
  items: ComponentItem[];          // complete BOM: main framing + secondary + sheeting + trim + fasteners
  mainFramingSummary: FramingBOMSummary; // includes engineerInputRequired list
}
```

The `items` array contains ~30 parametrically-generated `ComponentItem` records covering:
- Main framing (MF-01 … MF-06, PL-01 … PL-04)
- Secondary framing (SF-01 … SF-04: side girts, end girts, purlins, eave struts)
- Sheeting (SH-01 … SH-04: ridge cap, roof panels, side walls, end walls)
- Trim (TR-01 … TR-07: base angle, rake angle, rake trim, peak box, rake end cap, eave gutter, corner trim)
- Fasteners/Hardware (FN-01 … FN-09: screws, sealants, closures, eave plates, rake supports, backup plates, sheeting angles)

---

## What Linus Needs to Build

### Option A — "Recalculate BOM" button on DesignPage or QuotationPage

Add a button (or auto-trigger on DesignPage save) that:
1. Calls `computeFullBom(config)`
2. Passes result to `mergeWithExisting(bom.items, config.components)`
3. Writes the merged array back to `config.components`
4. The existing `FramingTable` / component display then shows the populated BOM

This is the same pattern described in `bomEngine.ts` (OVERRIDE PATTERN section) for the main framing engine from PR #25.

### Option B — Read-only auto-BOM panel on QuotationPage

Add a collapsible "Auto-Calculated BOM" panel below the manual component table on QuotationPage that shows the engine output without modifying `config.components`. Useful for "what would the engine calculate?" without overwriting user edits.

---

## Recommended Wiring (Option A)

```tsx
// In DesignPage or QuotationPage:
import { computeFullBom, mergeWithExisting } from '../bomEngine';

const handleRecalculateBOM = () => {
  const { items } = computeFullBom(config);
  const merged = mergeWithExisting(items, config.components);
  updateConfig({ components: merged });
};
```

Add a `<button onClick={handleRecalculateBOM}>Recalculate BOM</button>` near the existing component table. The merge logic ensures user overrides (qty > 0 or weight > 0) are preserved.

---

## Items Flagged for Engineer Input

After recalculating, `mainFramingSummary.engineerInputRequired` contains `['MF-01', 'MF-03']` (main frame columns and rafters — custom plate girders). Linus should highlight these rows in the `FramingTable` so the estimator knows to fill in the engineer-supplied weight before computing costs.

---

## Priority

Medium. The BOM engine is fully functional without UI wiring — the estimator can still manually enter component quantities. The "Recalculate BOM" button is a productivity improvement, not a blocker for quoting.
