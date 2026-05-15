# Reuben — History

## Project Context

- **Project:** Building Estimator — Pre-Engineered Metal Building (PEMB) cost estimation tool.
- **Background:** Migration from a `.xlsm` workbook (`26-0325855  GV - SR PEMB 23130 Tomball Pkwy Bldg 14.xlsm`) to a React + Node/SQLite webapp. Manages customers, vendors, materials, prices, labor rates, and produces printable quotations.
- **Stack:** React 19 + TypeScript + Vite + Tailwind v4 (webapp/), Node.js + SQLite (server/), legacy VBA (src/), extracted reference data in `extracted_data/`.
- **Owner:** Jose Guajardo
- **Joined:** 2026-05-14
- **Why I'm here:** Bring metal building / structural steel industry expertise so the app reflects real estimator workflows — not just a generic SaaS form.

## Reference URLs (provided by Jose at intake)

- https://www.ibeam.ai/lp/steel-takeoff-estimating-software — iBeam.ai (Trimble) steel takeoff/estimating
- https://get.contractorforeman.com/ — ContractorForeman generalist construction estimating
- https://steelestimatingsolutions.com/steel-estimating-software-guide/ — Steel Estimating Solutions guide
- https://www.buildxact.com/us/ — Buildxact cloud takeoff/estimating
- https://www.aisc.org/aisc/publications/current-standards/aisc-360/ — AISC 360 standard

## Key Files to Know

- `26-0325855  GV - SR PEMB 23130 Tomball Pkwy Bldg 14.xlsm` — source workbook (authoritative behavior spec)
- `extracted_data/` — extracted sheets (Beams, Components, Main Framing, Quotation, Take off, Stairs, Insulation, Fasteners and Bolts, Central States, Central Prices, etc.)
- `webapp/src/calculator.ts`, `webapp/src/catalog.ts`, `webapp/src/priceList.ts`, `webapp/src/types.ts` — Livingston's domain models
- `webapp/src/pages/QuotationPage.tsx`, `webapp/src/pages/SummaryPage.tsx` — the user-facing quote output
- `server/db.js`, `server/routes-*.js` — persistence

## Learnings

### App Assessment — 2026-05-14

**Lay of the land:**
The app is a React 19 + TypeScript SPA with a Node/SQLite backend. It follows the workbook's tab structure almost exactly: Design → Framing (Main Framing) → Components → Insulation → Fasteners → Structural (Stairs) → Summary → Quotation. Routes are protected behind JWT auth. The domain layer is `calculator.ts` + `catalog.ts` + `priceList.ts` + `types.ts`. Persistence is SQLite via `better-sqlite3` in `server/db.js`.

**Key architectural insight:**
The app is a **manual data-entry form** that mirrors the workbook, but it does NOT yet implement the workbook's calculation engine. The workbook's Design sheet automatically populates quantities in Main Framing, Components, and Insulation from building dimensions. The webapp requires manual entry of every qty and length. This is the #1 gap.

**Critical calculation bug identified:**
`calculator.ts` line 78 applies labor to `(structuralWeight + componentsWeight)`. The workbook applies labor only to structural steel weight. Cold-form is purchased cut-to-length. This overestimates labor cost significantly.

**Second calculation bug:**
`framesCost` uses `weightCostSum()` for `frame-openings` category, but those are Ln Ft items (weight=0). They will always cost $0. Should use `simpleSum()`.

**Key workbook tabs that matter:**
- `Design.txt` — parametric inputs feeding all downstream calculations
- `Main Framing.txt` — structural BOM (BEAMS, COLD FORM, FLAT BARS) with qty/length formulas
- `Components.txt` — secondary framing + sheeting + trim + hardware BOM
- `Fasteners and Bolts.txt` — anchor bolts, machine bolts (qty formulas from bay/purlin/girt counts), cable bracing, fasteners
- `Structural.txt` — stair sub-calculator with its own overhead/profit stack (10% profit, 4% commission)
- `Summary.txt` — authoritative cost rollup; shows labor = 10,150 lbs × $0.75 = $7,613 (structural only)
- `Quotation.txt` — authoritative proposal format; 15 required sections
- `M.txt` — material master (200 items per group, 15 groups); includes component increase multiplier (1.1) and steel price baseline ($0.85/lb)
- `Central Prices.txt` — 135 line items with supplier codes; drives `priceList.ts`

**Terminology decisions:**
- `baySpacing` field is a **count** (not a spacing dimension) — label should be "Bay Count"
- `girts` field is **girts per bay side** — label should clarify
- `purlins` field is a **count** — label should clarify
- Frame openings ≠ doors/windows — they are unframed rough openings
- "Bypass girts" = girts that run outside columns (not between them)
- `INSULACION` in Summary.txt row 59 is a misspelling — do not reproduce in webapp

**Markup stack (confirmed from workbook):**
Direct Materials + Fabrication Labor (structural only) → Total → Detailing → Engineering → Loading/Hauling → Freight → Overhead (%) → Erection → Foundation → Permits → Sub-Total → Profit (%) → Commission (%) → Grand Total

**Missing features by priority:**
1. Parametric BOM generation (quantities auto-calculated from dimensions)
2. Stair parametric calculator
3. Quote number + revision number + valid-until-date
4. Wind speed + exposure category fields
5. Color selection → panel SKU mapping
6. Labor calc fix (structural weight only)
7. Frame opening cost method fix (LnFt not weight)
8. Proposal legal language (validity, exclusions, payment terms, lead time)
9. $/sqft and $/lb summary metrics
10. Sales tax field
11. Freight distance calculator
12. Contingency line item

**Industry references used:**
- AISC 360-22 — structural steel pricing basis
- ASCE 7-22 §26 — wind loads, exposure categories
- MBMA Metal Building Systems Manual — framing systems, proposal format
- Texas Tax Code §151 — sales tax on building materials
- iBeam.ai, ContractorForeman, Buildxact, Steel Estimating Solutions, FabSuite — competitive feature comparison

**Skill extracted:**
- `.squad/skills/pemb-quotation-anatomy/SKILL.md` — full 13-section PEMB proposal anatomy, color/SKU mapping table, markup stack formula, terminology glossary
