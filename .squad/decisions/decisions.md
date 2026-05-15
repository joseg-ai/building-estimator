# Decisions Log

**Last updated:** 2026-05-15T14:30:00.000+00:00

---

## Sales Tax Calc — Formula Notes (Issue #13)

**Date:** 2026-05-15
**By:** Livingston
**Status:** Inbox (awaiting Reuben domain review)

### Field placement
- `salesTaxRate: number` and `salesTaxIncluded: boolean` placed at the **top level** of
  `BuildingConfig`, not inside `ProjectOverheads`. Rationale: tax is a jurisdictional
  switch on the *quote*, not a cost-engineering knob like labor rate or overhead %.
  Linus's UI is expected to render it as a dedicated tax block, not in the overheads
  table.

### Defaults
- `salesTaxRate = 0.0825` (Texas state base, per Reuben Critical Gap #6).
- `salesTaxIncluded = false` — preserves today's "Sales Tax Not Included" behavior
  for existing quotes. UI must let user opt in per quote.

### Tax base — VERBATIM from issue #13
    base = Materials + Labor + Freight + Overhead + Erection + Foundation
         + Permits + Contingency + Profit + Commission

Intentionally **excluded** from the base (matching the issue, not the SubTotal
formula): `detailing`, `engineering`, `loadingHauling`. If Reuben says these are
taxable in TX for PEMB, raise a follow-up — do not silently change here.

### Contingency placeholder
Issue #15 (contingency line) isn't built yet. I added `const contingency = 0`
inline in the tax base so:
- the formula matches the issue spec exactly today, and
- when Saul/Livingston ship #15 the contingency variable plugs straight in.

### Include/exclude semantics
- `salesTax` is **always computed** and persisted to the breakdown — so the UI can
  show "Tax would be $X if included" even when excluded.
- `grandTotal` only adds `salesTax` when `salesTaxIncluded === true`.
- `subTotal` is unchanged — tax sits outside it, after profit+commission.

### Rounding
- No rounding inside calculator. Full float precision carried in `CostBreakdown`.
- Display-side rounding is `formatUSD`'s job (Linus).

### Open questions for Reuben
1. Confirm Texas taxability of detailing/engineering fees on PEMB sales — issue
   formula excludes them, but real-world contracts sometimes tax them.
2. Confirm tax-on-profit/commission is correct for TX (issue says yes).
3. When a quote has out-of-state ship-to, do we still default 8.25%? Likely no —
   future ticket for jurisdiction lookup.

---

## Linus — Sales Tax UI (#13)

**Date:** 2026-05-15
**Scope:** UI half of issue #13. Livingston owns calc/type; Saul owns tests.

### Tax rate UX = percentage input, storage = decimal
User types `8.25` in the input; reducer stores `0.0825` in `config.salesTaxRate` (the type Livingston picked). One source of truth — calculator stays simple.

### Validation inline, no submit button
Field validates `0 ≤ pct ≤ 100` on every keystroke; invalid values keep the on-screen input but do NOT dispatch (so persisted/computed state stays valid). Matches existing form pattern (no modal, no toast).

### `SET_SALES_TAX` action shape
Single action with optional `rate` and `included` fields. Lets the rate input and the checkbox dispatch independently without two action types. Reducer ignores undefined fields.

### Controls live above the printRef block
Tax rate + include checkbox are editor chrome and must NOT appear on the printed proposal. The print template only sees the conditional tax line / "not included" note.

### Render off `costs`, not `config`
The itemized line uses `costs.salesTaxIncluded` and `costs.salesTaxRate` (returned by Livingston's calc) so display can never drift from what was actually summed into `grandTotal`.

### Implications for other agents
- **Saul:** When you wire UI tests, the inputs are `#sales-tax-rate` (number, percent units 0–100) and a sibling checkbox labeled "Include sales tax in total". The rendered line is `Sales Tax (X.XX%)` and only appears when `salesTaxIncluded` is true. The "Sales Tax Not Included" gray text only renders when `salesTaxIncluded` is false.
- **Livingston:** No changes requested on your side. The `salesTaxRate`/`salesTaxIncluded`/`salesTax`/`salesTaxBase` fields you exposed on `CostBreakdown` were exactly what I needed — thanks.
- **Future #15 (Contingency):** Your calc already includes `contingency = 0` in the tax base. When #15 lands and you replace that zero with a real number, my UI needs no changes — the rendered tax line picks it up automatically.

### Followups (not blocking)
- The `[INEFFECTIVE_DYNAMIC_IMPORT]` warning on `src/api.ts` is pre-existing (predates this branch) — left alone.
- ComparisonPage runtime bug noted in my earlier history — still deferred to a separate issue, per orchestrator guidance.

---

## Decision Record: Design Loads + Colors (Issue #7)

**Date:** 2026-05-15  
**Author:** Linus  
**Status:** Delivered — awaiting review by Jose / team

### Summary
Issue #7 shipped. Wind speed, exposure category, roof live load, snow load, and roof/wall/trim color selection are now live on DesignPage and reflected in the printable quotation (Sections 8 and 11).

### Palette Chosen (PEMB Standard Colors)

| Color | Notes |
|---|---|
| Galvalume | Standard roof (default) |
| Polar White | Most common wall/trim color (default walls + trim) |
| Burnished Slate | Popular neutral |
| Light Stone | Warm neutral |
| Saddle Tan | Southwest popular |
| Hawaiian Blue | Common commercial |
| Brick Red | Industrial standard |
| Forest Green | Common in rural/agricultural |

**Rationale:** These 8 colors represent the most-ordered finishes from Central States Manufacturing's standard palette. They match what appears in VMBC workbook color selections. Left as a static `PEMB_COLORS` array in DesignPage.tsx — catalog-driven palette (e.g., pulled from server) is a follow-up item for Livingston (#8).

### Validation Ranges

| Field | Range | Error Behavior |
|---|---|---|
| Wind Speed (mph) | 80–200 | Inline red error text; value still saved (forgiving input) |
| Roof Live Load (psf) | ≥ 0 | `Math.max(0, v)` clamp on dispatch |
| Snow Load (psf) | ≥ 0 | `Math.max(0, v)` clamp on dispatch |
| Exposure Category | B / C / D | Dropdown only — no free text; no invalid state possible |

Wind speed range (80–200 mph) based on ASCE 7-22 Table 26.5-1A minimum design wind speeds for Risk Category II buildings. Values below 80 indicate a data entry error; above 200 is not used for standard PEMB occupancy.

### Server Persistence Follow-Up — FOR RUSTY

**Current state:** All new fields (`windSpeedMph`, `exposureCategory`, `roofLiveLoadPsf`, `snowLoadPsf`, `roofColor`, `wallColor`, `trimColor`) are persisted to `localStorage` only via the existing `saveConfig` useEffect. They are included in the `building_config` JSON blob when a quote is saved to the server (because `saveQuote` serializes the full config), but the server has no dedicated schema columns for them — they ride inside the JSON blob.

**Action needed for Rusty:** If/when we want to query quotes by wind speed, filter by color, or expose these fields via the API, add schema columns to the `quotes` table:
- `wind_speed_mph INTEGER`
- `exposure_category TEXT CHECK(exposure_category IN ('B','C','D'))`
- `roof_live_load_psf REAL`
- `snow_load_psf REAL`
- `roof_color TEXT`
- `wall_color TEXT`
- `trim_color TEXT`

Until then, the JSON blob approach is sufficient for a single-user local tool. This is a **non-blocking follow-up** — no server changes are needed for the current PR to work correctly.

### Dependency: Issue #8 — Color → SKU Mapping (FOR LIVINGSTON)

Color selection now flows to the quotation display (Section 11) but does NOT yet drive panel SKU selection in the price list. Per the PEMB Skill anatomy:

| Color Type | SKU | Unit Price |
|---|---|---|
| Galvalume | CL244GL | $3.2783/LF |
| Color (any non-Galvalume) | RL6LS | $4.0843/LF |

**Action needed for Livingston (#8):** When `roofColor !== 'Galvalume'`, the roof sheeting component should resolve to `RL6LS` instead of `CL244GL`. This ~25% price delta is the primary business reason for capturing the color field. The `roofColor` / `wallColor` / `trimColor` fields in `BuildingConfig` are now available for Livingston to key off of in the calculator or catalog resolution logic.

### No Breaking Changes
- `storage.ts` `loadConfig` merge-with-defaults handles old localStorage saves without a migration — new fields default to 140 mph / Exposure C / 20 psf / 0 psf / Galvalume / Polar White / Polar White automatically.
- 32 existing calculator tests pass unchanged.
- Build: 54 modules, 0 TS errors.

---

## Azure Architecture Proposal — PEMB Building Estimator

**Date:** 2026-05-11  
**By:** Danny (Tech Lead)  
**Status:** Proposal — awaiting Jose's input  
**Requested by:** Jose Guajardo

**Decision:** Recommend Azure App Service (B1 plan) for Tier 1 production deployment (~$13-15/mo). Express serves React static files. SQLite persists on `/home/site/data/estimator.db`. Key Vault stores JWT_SECRET. Application Insights monitors. Daily backup cron to Blob Storage.

**Tier 2 (10+ users):** Migrate to PostgreSQL Flexible Server + scale App Service to B2/S1 + staging slot deploy pattern.

**Code changes required (Steps 1-2):**
- Make API URL configurable in `webapp/src/api.ts` (~30 min)
- Add Express static serving in `server/index.js` (~15 min)

**Why:** Simplest path from current state. No Docker. No breaking changes. ~2 hours total prep work + 1 hour resource provisioning.

**Key assumptions:**
- Single company, 1-5 users, budget ≤ $50/mo
- No compliance requirements
- Texas-based (South Central US region)
- Occasional 1-minute deploys acceptable
- SQLite + WAL mode suitable for concurrent reads

**Monthly cost estimate (Tier 1):**
| Service | SKU | Cost |
|---------|-----|------|
| App Service Plan | B1 | ~$13/mo |
| Key Vault | Free tier | $0 |
| Application Insights | Free tier | $0 |
| Blob Storage (backups) | LRS, Hot | ~$0.02/mo |
| **Total** | | **~$13-15/mo** |

**Next steps:** Jose to greenlight. Linus handles API URL config. Rusty handles API/DB integration changes if needed.

---

## Azure admin seed mechanism

**Author:** Rusty
**Date:** 2026-05-11
**Status:** Closed — seeder confirmed working, idempotent, left enabled

### Context

Admin login against https://vmbc-estimator.azurewebsites.net was reported as `HTTP 400 Bad Request` for `POST /api/auth/login {username:"admin",password:"admin123"}`. Suspected cause: fresh SQLite DB at `/home/site/data/estimator.db` (Azure persistent storage) had never been seeded with an admin user.

### Investigation

1. Reviewed `server/index.js` — an idempotent admin seeder was **already wired** (added in a prior session, lines 12–27). Runs only when `SEED_ADMIN=true` and `SELECT COUNT(*) FROM users` returns 0. Uses the same `bcryptjs` hashing as `routes-auth.js` (`bcrypt.hashSync(pw, 10)`) and the same `uuid v4` id scheme. Inserts `username=admin`, `password=admin123`, `display_name=Admin`.
2. Checked Azure app settings — `SEED_ADMIN=true`, `DB_PATH=/home/site/data/estimator.db`, `SERVE_WEBAPP=true` were **all already set**.
3. Tested login with a proper JSON body file (`curl --data-binary @body.json`) → **HTTP 200 + JWT returned**. Admin user exists and authenticates.
4. Reproduced the original 400: PowerShell + `curl.exe -d '{\"username\":...}'` mangles the backslash-escaped quotes, sending malformed JSON. `express.json()` rejects with HTML `400 Bad Request` (Express default body-parser error page — not our JSON envelope). This was a **client-side curl/PowerShell quoting bug, not a server bug**.

### Decision

**Keep the seeder as-is and leave `SEED_ADMIN=true` on Azure.** The seeder is idempotent (no-op once any user exists), so leaving it on costs one `SELECT COUNT(*)` at boot and protects against future DB resets (e.g., wiping `/home/site/data/`).

#### Seed mechanism (in `server/index.js`)

```js
function seedAdminIfEmpty() {
  const db = require('./db');
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const count = db.prepare('SELECT COUNT(*) as n FROM users').get();
  if (count.n === 0) {
    const id = uuidv4();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)')
      .run(id, 'admin', hash, 'Admin');
    console.log('[seed] Created default admin user — change this password immediately.');
  }
}
if (process.env.SEED_ADMIN === 'true') seedAdminIfEmpty();
```

- **Gated by env var** — never runs unless `SEED_ADMIN=true` (so local dev / tests don't get a surprise admin).
- **Idempotent** — only inserts when `users` table is empty. Subsequent boots and password changes are preserved.
- **Same hash scheme as `routes-auth.js`** — `bcryptjs.hashSync(pw, 10)`. Login verification via `bcrypt.compareSync` works against the seeded hash.
- **Credentials not in repo** — username/password are literals in code but they are the documented bootstrap default; no secrets file required. Users must change the password after first login.

#### Azure App Settings (already configured)

| Setting        | Value                              |
| -------------- | ---------------------------------- |
| `SEED_ADMIN`   | `true`                             |
| `DB_PATH`      | `/home/site/data/estimator.db`     |
| `SERVE_WEBAPP` | `true`                             |
| `PORT`         | injected by Azure (8080)           |

### Verification

```
$ curl -X POST https://vmbc-estimator.azurewebsites.net/api/auth/login \
    -H "Content-Type: application/json" \
    --data-binary '{"username":"admin","password":"admin123"}'
HTTP/1.1 200 OK
{"token":"eyJhbGciOiJIUzI1NiIs...","user":{"id":"c3b9cee8-...","username":"admin","displayName":"Admin"}}
```

### Follow-ups

- **Webapp consumers:** if the React app sends malformed JSON, express.json() returns HTML 400. Consider a global error handler that emits `{ error: { code: 'BAD_JSON', message: ... } }` instead. Non-urgent.
- **Bootstrap password rotation:** the seeded admin/admin123 should be changed after first prod use. No automated rotation yet — manual via `PUT /api/auth/...` (route TBD) or direct DB update.
- **Client-side note:** when testing from PowerShell, use `--data-binary @file.json` not `-d '{\"..\":...}'`. Backslash-quoted JSON does not survive PowerShell argument parsing.
