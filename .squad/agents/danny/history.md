# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — Pre-Engineered Metal Building (PEMB) cost estimation tool. Migrated from a `.xlsm` workbook to a React web application. Manages customers, vendors, materials, prices, labor rates, and produces printable quotations.
- **Stack:** React 19 + TypeScript + Vite + Tailwind v4 (webapp/), Node.js + SQLite server with auth and quotes routes (server/), legacy VBA source preserved in src/.
- **Created:** 2026-05-10

📌 **2026-05-14T20:06 UTC: Backlog Triage Complete → GH Issues #1–#17 Filed**

Danny triaged Reuben's assessment into 17 GitHub issues with recommended sprint plan (S1: bugs + schema, S2: parametric engines, S3: polish). **GH Issue #17 (Server-side PDF generation)** assigned to you (primary) with Linus assist. Orchestration log: `.squad/orchestration-log/2026-05-14-danny-triage.md`. Scribe processed: merged decision to `.squad/decisions.md`, archived old phases, updated cross-agent notes in all history.md files. Ready for sprint planning.

📌 **2026-05-14T19:45:20Z: Reuben Full App Assessment Complete**

Reuben delivered comprehensive domain assessment of webapp vs. VMBC workbook. 17-item prioritized backlog identified (6 critical, 6 important, 5 nice-to-have). 2 pricing bugs flagged for your investigation/fix: (1) Labor applied to both structural + cold-formed components (should be structural-only). (2) Frame opening cold-form items priced per LnFt but use weight-based cost method (silent $0 cost). Assessment merged to `.squad/decisions.md`. Backlog ready for sprint planning.



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

## Phase 1-3 Coordination (2026-05-10)

Danny's initial survey identified 3-phase roadmap (Phase 1: persist pricing/catalog, Phase 2: customers, Phase 3: vendors/comparison). All 3 phases shipped by team. 85 tests green (74 server + 11 webapp). Server-backed reference data live.

📌 **EPIC COMPLETE** — Danny's Phase 1 kickoff survey led to 3-phase epic. All phases shipped. 85 tests green (74 server + 11 webapp). Server-backed reference data live (catalog, price-list, customers, vendors). Multi-vendor comparison working. Ready for next epic.

📌 **2026-05-14: Backlog Triage Complete** — Filed 17 GitHub issues (#1–#17) from Reuben's domain assessment. 8 P0 (incl. 2 bugs), 4 P1, 5 P2. 3-sprint plan drafted. See `.squad/decisions/inbox/danny-backlog-triage-2026-05-14.md`.
