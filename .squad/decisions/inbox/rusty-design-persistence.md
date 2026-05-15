# Decision: Design Loads + Colors — Dedicated Scalar Columns

**Date:** 2026-05-15  
**Author:** Rusty (Backend)  
**Scope:** PR #24 follow-up — server-side persistence for design loads and panel colors

---

## Context

PR #24 (Linus) added seven fields to the client-side `BuildingConfig` TypeScript type:

| Field | Type |
|-------|------|
| `windSpeedMph` | `number` |
| `exposureCategory` | `'B' \| 'C' \| 'D'` |
| `roofLiveLoadPsf` | `number` |
| `snowLoadPsf` | `number` |
| `roofColor` | `string` |
| `wallColor` | `string` |
| `trimColor` | `string` |

These fields were already persisted implicitly because the entire `BuildingConfig` is stored in the `config_json` TEXT blob. So technically they "round-tripped" from client → JSON → DB → JSON → client without any server-side changes.

## Decision: Add Dedicated Scalar Columns (not a no-op)

I chose to add **seven proper typed columns** to the `quotes` table rather than relying solely on `config_json`:

```sql
wind_speed_mph     REAL    DEFAULT 115
exposure_category  TEXT    DEFAULT 'C'
roof_live_load_psf REAL    DEFAULT 20
snow_load_psf      REAL    DEFAULT 20
roof_color         TEXT    DEFAULT ''
wall_color         TEXT    DEFAULT ''
trim_color         TEXT    DEFAULT ''
```

### Why not just leave them in `config_json`?

1. **SQL queryability.** The primary use case called out in the task is quotes-list views and future BI filtering: `WHERE wind_speed_mph > 130`, `WHERE exposure_category = 'D'`, `GROUP BY roof_color`. SQLite JSON functions (`json_extract`) work but are cumbersome and cannot use indexes.

2. **Indexable if needed.** Scalar columns can gain a B-tree index with a one-line migration. `json_extract` results cannot be indexed without generated columns (a heavier lift).

3. **Not overkill given precedent.** `project_name`, `customer_name`, `job_location`, and `grand_total` are all redundantly stored as proper columns *and* embedded in `config_json`. This codebase already accepts denormalized scalars as the pattern for any field worth querying.

4. **Different from `additional_structures_json`.** The additional-structures blob (PR #26) was left as JSON because it is a nested checklist object with 5+ sub-fields — no individual sub-field is expected to be filtered on independently. Design load scalars are exactly the kind of first-class filter criteria BI dashboards use.

### Why not replace `config_json` with full normalization?

Over-engineering. The full config has ~40 fields. Full normalization would require 40 columns + joins and would make the schema brittle against future config additions. The hybrid pattern (scalar copies for queryable fields, JSON blob as source of truth for everything else) is deliberate.

## Migration Safety

- Used `PRAGMA table_info(quotes)` + `ALTER TABLE ADD COLUMN` pattern (consistent with all prior migrations in `db.js`).
- All 7 columns have `DEFAULT` values matching sensible domain-specific defaults (ASCE 7 Exposure C, 115 mph wind, 20 psf live/snow, empty strings for colors).
- Existing rows are unaffected on upgrade — SQLite fills `DEFAULT` for the new columns retroactively.

## Column Naming Convention

- DB: `snake_case` (consistent with all existing columns)
- JSON API: `camelCase` (consistent with all existing response fields, e.g. `grandTotal`, `validUntil`)
- Mapping is done in `rowToQuote()` in `routes-quotes.js`

## Validation Added

- `exposureCategory`: must be `'B'`, `'C'`, or `'D'`
- `windSpeedMph`, `roofLiveLoadPsf`, `snowLoadPsf`: must be `number` if provided
- `roofColor`, `wallColor`, `trimColor`: must be `string` if provided
- Validation applied on both POST and PUT (when `config` is included in the PUT body)
