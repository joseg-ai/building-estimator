# Decision: Additional Structures Schema + Implementation

**Date:** 2026-05-15  
**Author:** Rusty (Backend Engineer)  
**Issue:** #20 — Additional Structures (overhangs, lean-tos, parapets, canopies, HSS canopies)  
**Status:** Implemented on branch `squad/20-additional-structures`

---

## Schema Shape

`additional_structures_json` TEXT column on `quotes` table, storing:

```json
{
  "overhangs":   { "enabled": bool, "qty": int, "dims": string },
  "leanTos":     { "enabled": bool, "qty": int, "width": number, "length": number },
  "parapets":    { "enabled": bool, "height": number },
  "canopies":    { "enabled": bool, "qty": int, "width": number, "depth": number, "height": number },
  "hssCanopies": { "enabled": bool, "qty": int }
}
```

All dimension values are **imperial (feet)**.

---

## Migration Approach

**JSON column** on `quotes` — not discrete columns.

Rationale:
- Matches the existing `config_json` pattern (BuildingConfig stored as TEXT).
- Avoids 5+ individual `ALTER TABLE` calls.
- Section 5 fields are logically cohesive and rarely queried server-side in isolation.
- If server-side filtering is ever needed, the JSON column can be parsed; or discrete columns can be added later.

Migration is **idempotent**: PRAGMA `table_info(quotes)` checked before `ALTER TABLE`, following the established pattern from history.md.

Primary data lives in `config_json` (as part of `BuildingConfig.additionalStructures`). The `additional_structures_json` column is a denormalized copy populated on every POST/PUT for potential future server-side query use.

---

## Validation Strategy

- Field is **optional** — missing `additionalStructures` in config is tolerated (defaults to empty object on client).
- When present, `validateAdditionalStructures()` in `routes-quotes.js` checks:
  - Top-level is an object (not array).
  - Each known sub-key, if present, has correct field types (`enabled: bool`, dims: `number` or `string`).
  - Returns `{error: {code: 'VALIDATION', ...}}` on failure, consistent with project envelope.

---

## Units

All additional structure dimensions stored in **imperial feet** (matching existing BuildingConfig dimensions pattern). No unit conversion at the API layer.

---

## Merge Risk Mitigation

- `AdditionalStructures` interface added at **end of types.ts**.
- `SET_ADDITIONAL_STRUCTURES` action appended to existing Action union in `context.tsx`.
- "Additional Structures" form section added at **bottom of DesignPage.tsx**, after the 3-column grid.
- QuotationPage Section 5 block replaces in-place (same location) with backward-compatible legacy fallback.
