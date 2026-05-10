# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — calculation engine and catalog for PEMB cost estimation. Source of truth for all pricing math.
- **Stack:** TypeScript modules in webapp/src/: calculator.ts (cost engine), catalog.ts (components), priceList.ts (supplier prices, currently Central States), types.ts (domain models). Reference data extracted from the original `.xlsm` lives in extracted_data/. Original VBA in src/Modules/.
- **Cost formula:** Direct Materials + Labor + Overhead + Detailing + Engineering → SubTotal → Profit (15%) + Commission (4%) → Grand Total.
- **Created:** 2026-05-10

## Team Updates

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
