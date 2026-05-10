# Squad Decisions

## Active Decisions

### Initial Survey: Customers, Vendors, Materials Master Data

**Date:** 2026-05-10T14:31:41-05:00  
**By:** Danny  
**Status:** Ready for team review

**Finding: Core Scope Gap**

Jose stated scope: *"customers, vendors, materials, prices, labor price"*

**Current State:**
- ✅ Labor pricing: Editable via ProjectOverheads (laborRate $/lb, overhead%, profit%, commission%)
- ✅ Materials: Component catalog exists (hardcoded, ~200+ items)
- ✅ Prices: Price list exists (120+ items, supplier-mapped)
- ❌ **Customers:** String field only, no master data
- ❌ **Vendors:** Hardcoded (Central States), no master data or multi-vendor support

**Impact:**
- Can't track customer history, repeat business, or negotiations
- Can't manage alternate vendors or price competition
- Can't run "what-if" scenarios with different supplier combinations
- Quotes are isolated; no customer account context

**Recommendation: Three-Phase Build**

**Phase 1 (HIGHEST PRIORITY):** Persist price list + materials to server
- Why: Prices are currently localStorage-only. Loss on logout = loss of customization. Materials should be versioned and tied to quotes.
- Effort: **Small** — Rusty adds 2 tables (materials_catalog, price_history), Linus adds server sync endpoints

**Phase 2 (MEDIUM PRIORITY):** Build Customers master + quotes.customer_id foreign key
- Why: Unlocks customer context, repeat quotes, history search, and prepopulation of defaults
- Effort: **Medium** — Rusty adds customers table + indexes, Linus builds Customers CRUD page + quote linking

**Phase 3 (NICE-TO-HAVE):** Add Vendors master + multi-vendor price comparison
- Why: Competitive advantage—estimate same building with 2 suppliers, pick lower cost
- Effort: **Large** — Complex UI, requires query builder or form generator

**Immediate Action:** Pick Phase 1 or Phase 2 to ship next. Phase 1 is lower risk and faster; Phase 2 enables customer workflows.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
