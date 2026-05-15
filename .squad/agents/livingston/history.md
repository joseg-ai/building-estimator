# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — calculation engine and catalog for PEMB cost estimation. Source of truth for all pricing math.
- **Stack:** TypeScript modules in webapp/src/: calculator.ts (cost engine), catalog.ts (components), priceList.ts (supplier prices, currently Central States), types.ts (domain models). Reference data extracted from the original `.xlsm` lives in extracted_data/. Original VBA in src/Modules/.
- **Cost formula:** Direct Materials + Labor + Overhead + Detailing + Engineering → SubTotal → Profit (15%) + Commission (4%) → Grand Total.
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-10 (14:31 UTC):** Phase 1 CLOSED. Server-backed catalog & pricing live, quotes pin to version. 36 tests green. Catalog bug fixed: 3 beam material strings corrected (recovered ~$19k under-estimate per quote). Ready for Phase 2 (Customers).

📌 **2026-05-10 (Phase 2 CLOSED):** Customers live. Phase 2 CLOSED: customers live, 57 tests green (46 server + 11 webapp), quote↔customer linking working. Phase 3 (vendors/comparison) starting.

📌 **2026-05-14 (20:06 UTC):** Danny backlog triage → **GH issues #1, #2, #3, #4, #5, #8, #10, #14, #15** assigned. Sprint 1 (S1): #1 (fix labor calc base), #2 (fix frame opening cost), #8 (wire color SKU). Sprint 2 (S2): #3 (parametric main framing BOM), #4 (parametric component calc), #5 (stair parametric). Sprint 3+ (S3): #10 (insulation auto-calc), #14 (freight calculator), #15 (contingency line). **You carry 9 of 17 issues — Saul should pair on test coverage for all deliverables.** See `.squad/orchestration-log/2026-05-14-danny-triage.md` for sprint plan.

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

📌 **2026-05-10 (Round 1 — Phase 1 shipped):** Data contract finalized and merged to decisions.md. All 16+ catalog categories mapped (PERSIST vs. TRANSIENT fields). Versioning strategy: snapshot at quote save (price list, catalog, labor rates, overheads). ⚠️ CRITICAL BUG FLAGGED: Catalog `weight` field all zeros but calculator uses it for structural-steel labor cost. Mitigation: add `weight_per_unit` to schema; derive weight at calc time. 6 risks identified (material string lookup, zero-price items, immutability, sparse categories). Investigation pending on weight field.

## Learnings

### Price List Fields & Lookup (2026-05-10)
- **Shape:** itemCode (PK), description, unit, unitPrice, mapTo[] (derived).
- **Lookup key:** itemCode is supplier reference; **runtime match via material string** against priceList[].mapTo[].
- **Risk:** Material field is untyped string; typos in material names cause silent price lookup failures (cost = $0). Mitigation: Add optional priceCodeId FK or validate material sync at startup.

### Catalog Structure Per Category (2026-05-10)
- **16 categories**, ~100 items total. All use ComponentItem type (id, category, description, group, material, commLength, measure, costPerUnit, lnFeetToFab).
- **PERSIST fields:** id (immutable), category, description, group, material (string lookup key), commLength, measure, costPerUnit.
- **TRANSIENT fields:** qty, length, enabled (user input, stored only in quotes); weight, lnF (calculated).
- **Categories breakdown:**
  - Structural (main-framing, canopy, plates, frame-openings): use `weightCostSum()` → weight × costPerUnit. **Weight field is critical but currently empty in catalog (all = 0).**
  - Components (purlins-girts, base-rake-angles, sheeting, trim, doors-windows, hardware): use `simpleSum()` → qty × costPerUnit.
  - Fasteners (anchor-bolts, bolts, cable-bracing, fasteners): use `simpleSum()`. **Some have costPerUnit = 0 (washers, grips).**
  - Insulation, stairs: use `simpleSum()`.

### Calculator Consumption Map (2026-05-10)
- **Formula:** Direct Materials + Labor + Overhead + Detailing + Engineering → SubTotal → Profit + Commission → Grand Total.
- **Labor calculation:** (structuralWeight + componentsWeight) × laborRate. **Depends on weight field being accurate.**
- **Cost aggregation:** Category-based rollup using `sumCategories()`, `simpleSum()`, `weightCostSum()`, `sumWeight()`.
- **Key consumed fields:** qty, costPerUnit, weight (via lnFeetToFab?), category.
- **Empty categories (intentional?):** leanto-* (4 dirs), overhangs. Sums return $0; unclear if calculated separately or missing.

### Versioning & Snapshots (2026-05-10)
- **When quote saved:** Snapshot price_list_version, catalog_version, full component list with qty/length/weight/costPerUnit, and ProjectOverheads (labor rate, margins).
- **Why:** Prices and labor rates change; quotes must reproduce historical totals exactly.
- **Versioning dimensions:** supplier (Central States), effective_date (2026-05-10), internal version key (bundled-central-states-2026-05).
- **Date-sensitive fields:** laborRate ($/lb, monthly update typical), overheadRate/profitRate/commissionRate (annual).
- **Recommendation:** Add audit log when prices/labor are edited; increment version and tie to effective date.

### Bundled Defaults Strategy (2026-05-10)
- **Sensible:** YES. POST bundled priceList.ts + catalog.ts as version 1 ("bundled-central-states-2026-05") on first app load.
- **Caveat:** Prices are hardcoded for Central States vendor; if user switches vendor, remapping required.
- **Recommendation:** Add vendor_id/supplier_name to metadata for multi-vendor support in Phase 3.

### Data Contract Risks & Mitigations (2026-05-10)
1. **Material string lookup:** Add priceCodeId FK or pre-validate at sync.
2. **Zero-price items:** Mark with isFreebie/isIncluded flag or add cost_override field.
3. **Weight field bug:** Currently all = 0 in catalog; should store weight_per_unit and derive weight = qty × weight_per_unit × lnFeetToFab / commLength.
4. **Sparse categories:** leanto-*, overhangs have no entries but are summed in calculator; clarify intent.
5. **ID immutability:** Add DB constraints to prevent renames of catalog item IDs and price list itemCodes.

### Catalog Weight Investigation (2026-05-10T14:31:41-05:00)

**Data flow uncovered:**
- `ComponentItem.weight` field has THREE distinct lifecycles depending on category:
  1. **Structural-steel categories** (main-framing, canopy, plates, frame-openings):
     `FramingTable` (webapp/src/components/FramingTable.tsx:39-62) computes
     weight at runtime: `weight = lnFeetToFab * lookupMaterial(material).weightPerFt`.
     Calculator consumes this via `weightCostSum` (cost) and `sumWeight` (labor).
  2. **Component categories** (purlins-girts, sheeting, trim, doors, hardware,
     fasteners, insulation, stairs): `ComponentTable` never sets weight. Cost
     is `simpleSum` (qty * costPerUnit). Weight stays 0 — and the workbook
     agrees: components do not contribute to labor.
  3. **Catalog defaults** are templates only; never read directly by the calculator.
- So catalog `weight: 0` is correct by design. My earlier data-contract flag
  was a false positive — but a productive one, because the trace surfaced two
  real bugs.

**Per-foot vs per-item weight distinction:**
- The workbook stores weight as a CALCULATED column (Component sheet col [18]),
  derived from `LnF (commercial-length count) * weightPerFt`. `weightPerFt`
  lives on the "Beams specs" sheet (one row per AISC designation) — extracted
  to `webapp/src/materialSpecs.ts`. Our app mirrors this: per-foot weight is
  the catalog primitive, total weight is computed.
- I considered moving the per-foot value into the catalog as a `weightPerFoot`
  field, but it would duplicate `materialSpecs` and break the single source of
  truth. Rejected.

**What I changed:**
- `webapp/src/catalog.ts`: fixed 3 BEAMS material designations
  (`'W x 18 x 65'` → `'W 18 x 65'`, etc.) to match `materialSpecs.ts`.
  Added a header docstring explaining the weight lifecycle.
- `webapp/src/calculator.ts`: added a `console.warn` for structural lines
  with qty>0 but weight=0 (silent under-estimation guard). Math unchanged.

**What I did NOT change (deferred):**
- `calculator.ts:85` uses `(structuralWeight + componentsWeight) * laborRate`
  for labor; the workbook (Summary row 73) uses `structuralWeight * laborRate`
  only. Saul's tests freeze the current behavior. Currently masked because
  `componentsWeight` is always 0. Needs joint change with Saul.
- `MF-01 Main Frames` keeps `material: 'Ninguno'` per the workbook;
  user is expected to pick a real beam. The new console.warn covers this case.

**Extracted data files used:**
- `extracted_data/Main Framing.txt` (verified W-shape designations and
  per-line cost formula on row 9 — Direct Cost = qty * weight * costPerPound).
- `extracted_data/Components.txt` (confirmed ComponentTable categories use
  qty * costPerUnit and weight is informational only).
- `extracted_data/Summary.txt` rows 41-83 (verified labor formula:
  7613.625 = 10151.5 structural * 0.75; components weight not in labor).
- `extracted_data/Beams specs.txt` (cross-referenced AISC designations
  vs `materialSpecs.ts`).

**Result:** `npx vitest run` → 11/11 tests pass.

### Phase 2 Customer Domain Design (2026-05-10T14:31:41-05:00)

**Analysis completed:** Full domain model spec written for customer master records linked to quotes. Key insights:

- **Customer TypeScript shape:** `id`, `name` (display), optional `company`/`contactName`/`address`/`email`, `defaultOverheads?: Partial<ProjectOverheads>`, `createdAt`/`updatedAt`, optional server-computed `quoteCount`.

- **Override semantics (critical):** Customer defaults are **initializers only**. Each quote snapshots its overheads at save time. Changing customer defaults does NOT retroactively adjust existing quotes — this ensures historical auditability. Per-quote overheads always win.

- **Ad-hoc mode:** Quotes can be created without a customer (for one-off estimates). Fallback to `customerName` string + app-level defaults in `createDefaultConfig()`.

- **UX for Linus:** DesignPage gets a customer picker modal (hybrid with fallback text field); QuotesPage's "Save Current" flow binds customer ID at quote save, pre-filling overheads from `customer.defaultOverheads`. Extend `apiCreateQuote()` and `apiUpdateQuote()` to accept optional `customerId` parameter.

- **Edge cases handled:** (1) Duplicate customer names — use secondary display info to disambiguate. (2) Deleted customers — orphaned quotes survive with `customer_id = NULL` + cached `customerName` string. (3) Incomplete defaults — shallow merge preserves app defaults for unset fields. (4) No customer at creation — prompt later to link.

- **Migration for existing quotes:** Do NOT auto-link during schema upgrade. Add one-shot UI affordance in Phase 2B ("Convert this name to a customer record?").

- **Spec document:** `.squad/decisions/inbox/livingston-phase2-customer-domain.md` (complete with API routes, edge cases, UX flow diagrams, and reasons for each design choice). Ready for Rusty (schema) and Linus (frontend wiring).

### Phase 3 Multi-Vendor Comparison Domain Spec (2026-05-10T14:31:41-05:00)

**Analysis completed:** Full domain model spec written for side-by-side vendor price comparison on a single building. Key insights:

- **Scope:** Structural materials only (main-framing, canopy, plates, frame-openings categories) in Phase 3. Components (sheets, trim, doors, hardware) stay single-vendor in MVP. Reasoning: structural steel is where PEMB vendor competition is fiercest; components are typically commodity, low-variance.

- **Comparison model:** Tabular view with one row per catalog item used in the build. Columns: Item Key, Description, Qty, Active List Price, Vendor A Price, Vendor B Price, Vendor C Price, Cheapest (highlighted), Row Subtotal. Below: per-vendor totals (materials, labor, overheads, profit, grand total). Labor and profit stay constant (project-level); only materials vary by vendor.

- **Effective price resolution:** (a) vendor override for item_key (if exists), (b) fallback to active price list price, (c) $0 + warn. No ambiguity; first match wins. Vendor prices for items not in the current build are orphaned/ignored; catalog items without vendor prices inherit active list price.

- **Per-vendor profit/commission:** NO. Vendor pricing is input cost; profit (15%) and commission (4%) are project-level and applied after vendor selection. Keeps vendor margin separate from estimator margin.

- **Vendor selection flow:** Estimator clicks "Use Vendor A" → Clone active price list version → Overlay vendor's prices → Save as new version (named "Quote 12345 — VendorName 2026-01-15") → Update quote's priceListVersionId → Quote pinned to snapshot. Original active list untouched. Audit trail preserved via version name + metadata + timestamp.

- **Edge cases handled:** (1) Vendor deleted mid-comparison — remove column, recalculate, show toast. (2) Vendor has price for orphan item — ignore, don't display. (3) Catalog item has no vendor price — fallback to active list, mark with subtle indicator. (4) Zero-priced items — show $0 with warning icon. (5) Vendor added mid-session — offer "Add to comparison" affordance.

- **UX hints for Linus:** Route `/compare/:quoteId` (or `/compare?quoteId=...` with fallback picker). Sticky header for columns, freeze left columns (item key, description) on horizontal scroll. Vendor selector (pills or dropdown). Main table with cheapest-per-row highlight (green/gold background). Totals section below with bold highlight on cheapest grand total. "Use Vendor X" button per vendor column. Collapsible details drawer for lead_time, minimum_order, notes. "Seed prices from active list" affordance in vendor-edit flow to bootstrap new vendors.

- **Data model:** New `vendors` table (id, name, created_at, updated_at, deleted_at for soft delete, supplier_code, notes). New `vendor_prices` table (vendor_id FK, item_key, unit_price, lead_time_days, minimum_order, notes). Extension to `price_list_versions` table (vendor_id FK, snapshot_date, source_version_id for audit trail).

- **API endpoints:** `GET /api/vendors` (list), `GET /api/vendors/:vendorId/prices` (vendor's prices), `GET /api/quotes/:quoteId/comparison?vendorIds=1,2,3` (full comparison data), `POST /api/quotes/:quoteId/select-vendor` (create snapshot, pin quote).

- **Design decisions explained:** Structural materials only (high variance, clear ROI). Snapshot + clone approach (immutability, reproducibility) vs. overlay approach. Vendor column shows "—" for missing items (clarity, actionable). Orphan vendor prices ignored (simplicity, auditability, clean snapshots).

- **Spec document:** `.squad/decisions/inbox/livingston-phase3-comparison-spec.md` (12 sections covering scope, model, effective price rule, profit handling, vendor selection flow, edge cases, UX hints, data model, API, testing, terminology). Ready for team review, Rusty (schema), Linus (UI/UX), Saul (tests).

### 2026-05-14T19:45:20Z: Reuben App Assessment Complete

Reuben delivered comprehensive domain assessment of webapp vs. VMBC workbook. Key findings: (1) No parametric BOM generation engine → every quantity entered manually (slower than Excel); (2) Beams/Take-off sheet missing → no purchasing document for steel service center; (3) Labor applied to both structural + cold-formed components (should be structural-only → ~$9–19k underestimate per quote); (4) Frame opening cold-form items use weight-based cost method but are priced per LnFt (silent $0 cost). Backlog: 6 critical items (parametric BOM, Beams, insulation calc, stair calc, legal language, sales tax), 6 important (wind load, ridge vents, color persistence, revision history, freight, vendors), 5 nice-to-have ($/sqft metrics, PDF gen, comparison, customer portal, escalation). Assessment merged to `.squad/decisions.md`. Ready for sprint planning.




### Calc Bug Fixes #1, #2 (2026-05-14)

**PR:** #21 (squad/1-2-fix-calc-bugs)

Both calc bugs Reuben flagged are now closed. Test count 11 → 19 (8 new regression tests).

**Bug #1 — labor base.** Before: labor = (structuralWeight + componentsWeight) * laborRate. After: labor = laborBaseWeight * laborRate where laborBaseWeight sums weight only of rows whose group ∈ { BEAMS, CHANNELS, FLAT BARS, ANGLES, PIPES, HSS } AND whose category is structural. Cold-formed members ship cut-to-length from the supplier and contribute zero in-house labor regardless of which structural category they sit in (e.g. cold-form jambs in rame-openings). Added laborBaseWeight to CostBreakdown so the UI can show "labor base = X lb" if Linus wants it later.

**Bug #2 — frame-opening dispatch.** Frame-openings rows are cold-form Cee priced $0.85/LnFt with weight=0 in catalog. Old weightCostSum silently returned $0. Solution: structuralComponentCost(c) dispatches per-row on c.measure:
  - Ln Ft → (lnF || qty*length) * costPerUnit
  - Pound/ft → weight * costPerUnit
  - legacy fallback: weight when present, else qty × cost
Only frame-openings was switched to the mixed dispatcher (issue acceptance criteria explicitly said other structural categories must keep their existing methods).

## Learnings

### IN_HOUSE_FAB_GROUPS (2026-05-14)
The authoritative set of material groups that incur fabrication labor: BEAMS, CHANNELS, FLAT BARS, ANGLES, PIPES, HSS. Everything else — COLD FORM, SHEETING, ROOF TRIM, WALL TRIM, EAVE STRUT, DOOR AND WINDOWS, HARDWARE, INSULATION, BOLTS AND FASTENERS — ships cut-to-length from supplier and is excluded from labor base. Source: Reuben's PEMB assessment + workbook Take-off sheet. Encoded in calculator.ts as a const Set<string>.

### Measure field is the right cost-method discriminator (2026-05-14)
Category name is the WRONG axis to pick a cost method on. Frame-openings demonstrated this — same category, two pricing models (Ln Ft for cold-form jambs, Pound/ft for any steel-jamb variant). The catalog already stores measure on every row; lean on it. Ln Ft → length × $/LnFt, Pound/ft → weight × $/lb. Sniff measure variants case-insensitively and tolerate Ln ft/Ln Ft/ln. ft spellings — the catalog is inconsistent.

### lnF fallback pattern (2026-05-14)
For linear-foot pricing, prefer c.lnF (pre-rolled total LnFt) but fall back to c.qty * c.length when lnF hasn't been populated. Avoids silent $0 when a UI edit hasn't yet recomputed the LnF roll-up. Applied in structuralComponentCost.

### Pre-existing build errors on main (2026-05-14)

pm run build fails on main with TS errors in FramingTable.tsx, Layout.tsx, ComparisonPage.tsx, DesignPage.tsx, PriceListPage.tsx — not introduced by this PR. Per "don't fix unrelated issues" rule, left alone; flagged in PR description. Someone (Linus?) should clean those up.

### Vitest wiring (2026-05-14)
webapp/package.json previously had no 	est script and vitest was not a devDep. Added both ("test": "vitest run", devDep: vitest). The test file at webapp/src/__tests__/calculator.test.ts was sitting untracked in a stash from Saul — recovered + extended with bug regression tests.
