# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — Pre-Engineered Metal Building (PEMB) cost estimation tool. Migrated from a `.xlsm` workbook to a React web application. Manages customers, vendors, materials, prices, labor rates, and produces printable quotations.
- **Stack:** React 19 + TypeScript + Vite + Tailwind v4 (webapp/), Node.js + SQLite server with auth and quotes routes (server/), legacy VBA source preserved in src/.
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

📌 **2026-05-10 (Round 1 — Phase 1 shipped):** Rusty finalized API contract (price_list_versions + catalog endpoints), data contract (all 16+ categories mapped), wiring map (4 API client functions + context changes), and test plan (12 calc tests + 10 server endpoint tests spec'd). Saul scaffolded vitest. ⚠️ FLAGGED: Catalog `weight` field all zeros but calculator uses it for structural-steel labor cost — investigation pending. All 4 contracts merged to decisions.md.

## Learnings

### 2026-05-10 Initial Survey

**What's Built:**
- **Webapp:** Full React 19 + TS + Vite app with 12 pages (Design, Menu, PriceList, Framing, Components, Insulation, Fasteners, Structural, Summary, Quotation, Quotes, Login). State via context.tsx + localStorage. Auth via authContext.tsx with JWT token management.
- **Server:** Node + SQLite. Two tables (users, quotes). Auth routes (login, register, /me). Quotes CRUD (list, create, read, update, delete) tied to user_id. 
- **Catalogs:** Component catalogs hardcoded in catalog.ts (framing, canopy, plates, frame-openings, purlins, girts, sheeting, trim, doors, hardware, bolts, insulation). Price list in priceList.ts (120+ items mapped to suppliers).
- **Labor Pricing:** In ProjectOverheads: laborRate ($/lb), detailing, engineering, freight, overhead%, erection, foundation, permits, profit%, commission%.
- **Cost Engine:** calculator.ts computes cost breakdown: materials (weight-based or qty-based), labor (weight * laborRate), overhead, profit, commission.

**Key File Paths:**
- webapp/src/types.ts (BuildingConfig, CostBreakdown, ComponentItem)
- webapp/src/context.tsx (reducer, BuildingConfigProvider)
- webapp/src/calculator.ts (calculateCosts, formatUSD)
- webapp/src/catalog.ts (hardcoded component entries)
- webapp/src/priceList.ts (defaultPriceList, PriceListItem)
- server/db.js (schema: users, quotes)
- server/routes-quotes.js (CRUD endpoints)
- extracted_data/ (raw exported data from .xlsm for reference)

**What's MISSING (vs. scope: "customers, vendors, materials, prices, labor price"):**
- **Customers Entity:** Not modeled. Only "customerName" in BuildingConfig and quotes.customer_name (string). No Customers page, no vendor tracking, no customer master data.
- **Vendors Entity:** Not modeled. Prices hardcoded in priceList.ts from "Central States" supplier. No vendor master, no multi-vendor support, no vendor performance tracking.
- **Materials Catalog:** Hardcoded in catalog.ts. Not persistent (no server-side catalog management). Price updates only via PriceListPage UI (localStorage only).
- **Quote-to-Customer Linkage:** Weak. customerName is just a string field in BuildingConfig, not a foreign key.
- **Server-side Persistence:** Only quotes + users. No catalog, no vendors, no materials master, no customers master. Price changes lost on browser close (localStorage only).

**Bugs/TODOs/Gaps:**
- None found in code (no TODO/FIXME comments).
- Minor: PriceListPage has logic to "unmapped prices" but incomplete (lines 77-80 truncated in view).
- Potential: No validation on labor rates or overhead percentages—could be set to negative.
- Design: Prices sync on demand only (PriceListPage "Sync to Project" button), not automatic.

**Architecture Notes:**
- State flows: React Context → localStorage (auto-save on changes) → server on manual save/quote-create.
- Auth: JWT tokens, 7-day expiry, stored in localStorage.
- Quotes tied to user_id; customer/job info embedded in quote.config_json.
- All cost formulas follow Excel workbook exactly (weight-based for structural steel, qty-based for components).
