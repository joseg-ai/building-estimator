# Squad Decisions

# Squad Decisions

## Active Decisions


## Building Estimator — Domain Assessment

**Date:** 2026-05-14  
**By:** Reuben  
**Status:** Delivered (inbox → decisions merge)

### Executive Summary

The Building Estimator webapp is a credible first migration from the VMBC `.xlsm` workbook — it captures the right structural skeleton (Design → Framing → Components → Summary → Quotation) and correctly models the weight-based cost chain for structural steel. However, it is not yet usable for real bids: the Beams/Take-off sheet workflow is entirely missing (the app has no way to generate the per-frame steel BOM from design inputs), the quotation output lacks required proposal language and escalation clauses, labor is a flat $/lb rate with no distinction between fabrication and erection labor, and the stair/structural sub-quote lives in a disconnected page with no parametric inputs. The headline recommendation is to restore the parametric calculation engine (auto-generating component quantities from building dimensions) before adding any new features — without it, every quantity is entered by hand and the app is a glorified spreadsheet form.

### Critical Gaps (must-fix before this is usable for real bids)

1. **No parametric BOM generation from building dimensions** — The Excel workbook auto-calculates quantities for every framing member from the Design sheet inputs. The webapp does NOT do this. A PEMB estimator quotes 3–5 buildings per day; if each requires 40+ manual entries, it's slower than Excel.

2. **Beams/Take-off sheet not implemented** — The "Beams" sheet (200 data rows) is the core steel BOM — purchasing document sent to service center. Without it, fabrication shop cannot cut/drill/assemble; estimator cannot get steel quote from mill.

3. **No insulation R-value / quantity calculation** — InsulationPage has only three boolean toggles. The workbook calculates insulation linear feet from roof/wall area. Insulation is ~5–15% of total quote value.

4. **Stair/structural sub-quote is unparameterized** — `StructuralPage.tsx` shows a raw component table. The workbook `Stairs.txt` is fully parameterized (levels, floor height, tread count, landing config). Stairs are a significant add-on ($15,000–$55,000).

5. **Quotation output missing required legal / commercial language** — Missing: validity period, escalation clause, exclusions list, payment terms, lead time statement. Omitting them creates contract and liability exposure.

6. **Sales tax not calculated** — QuotationPage shows static "Sales Tax Not Included." No tax rate field, no option to include/exclude. In Texas, metal building materials are taxable at 8.25%.

### Important Gaps (should-fix in next iteration)

7. **No wind load / exposure category input** — Quotation hardcodes "Wind Load Design 140 MPH." No field on DesignPage for design wind speed, exposure category (B/C/D per ASCE 7), roof live load, snow load.

8. **Ridge vents, skylights, masonry quantities not calculated** — DesignPage has inputs for these; never translated into catalog components or cost.

9. **Color selection not persisted to quotation** — Quotation hardcodes "Roof: Galvalume / Walls: Color by Customer / Trim: Color by Customer." Color drives panel item codes (RL6LS vs. CL244GL) with different unit prices.

10. **No quote revision / version history** — Quotes table has `status` but no revision number, parent quote ID, or change log. PEMB quotes routinely go through 3–5 revisions.

11. **No freight calculation logic** — Freight is a flat dollar input. The workbook has a KM field and $/km rate (4.6 $/km). Freight on a PEMB package is $800–$5,000.

12. **Vendors module not connected to pricing** — Vendors page stores records; price list and catalog not filtered by vendor. Everything references Central States only.

### Nice-to-Haves

13. **$/sqft summary metrics on the quote** — The workbook computes "Cost by SqFt BDG" and "Cost by Pound" — standard PEMB sanity-check metrics. iBeam.ai shows these on dashboard.

14. **PDF generation (not just browser print)** — Current "Print / PDF" button opens a new window and calls `window.print()`. Buildxact, FabSuite generate server-side PDFs with proper page breaks, watermarks, logos.

15. **Comparison / alternate quote view** — Side-by-side comparison of two or more quote versions is standard in estimating tools.

16. **Customer portal / self-service quote acceptance** — Quotation has two signature lines. Tokenized link for electronic acceptance eliminates fax/scan/email loop.

17. **Material escalation factor** — The M sheet row 1 has `component Increase = 1.1` — global multiplier on component prices to hedge against steel volatility.

### Pricing & Calculation Concerns

**Labor rate applied to wrong weight subtotal:** `calculator.ts` line 78 applies fabrication labor rate to both structural steel AND cold-formed components (purlins, girts, sheeting). Cold-formed are purchased cut-to-length from supplier — fabrication labor is not applied to them. Workbook Take-off sheet only applies labor to structural steel weight. **Recommendation: Restrict labor base to `structuralWeight` only.**

**Frame opening cost method:** `framesCost` uses `weightCostSum()` for category `frame-openings`, but frame opening items are cold-form Cee sections priced per LnFt (weight=0 in catalog). This will produce zero cost unless weight is manually entered. **Better fix: Dispatch cost method based on `component.measure` field rather than hardcoded category-to-method mapping.**

### Prioritized Improvement Backlog (17 items)

**Critical Path (1–6):**
1. Parametric Main Framing Quantity Calculator (Livingston + Linus, Effort: L)
2. Parametric Component Quantity Calculator (Livingston, Effort: L)
3. Stair Parametric Calculator (Livingston + Linus, Effort: M)
4. Add Required Quote Fields: Number, Revision, Valid-Until, Status Enum (Rusty + Linus, Effort: S)
5. Add Design Wind Speed, Exposure Category, Color Selection to DesignPage (Linus + Rusty, Effort: S)
6. Wire Color Selection to Panel SKU in Price List (Livingston, Effort: S)

**High Priority (7–12):**
7. Fix Labor Calculation Base (Structural Weight Only) (Livingston, Effort: S)
8. Fix Frame Opening Cost Method (Livingston, Effort: S)
9. Proposal Legal Language: Validity, Exclusions, Payment Terms, Lead Time (Linus + Rusty, Effort: M)
10. Insulation Quantity Auto-Calculation (Livingston, Effort: S)
11. Display $/sqft and $/lb Summary Metrics (Linus, Effort: S)
12. Quote Number and Revision on Printed Proposal (Linus, Effort: S)

**Medium Priority (13–17):**
13. Sales Tax Field (Rate + Include/Exclude Toggle) (Linus + Livingston, Effort: S)
14. Freight Calculator (Distance × Rate) (Linus + Livingston, Effort: S)
15. Contingency Line Item (Livingston + Linus, Effort: S)
16. ComparisonPage Implementation (Linus, Effort: M)
17. Server-Side PDF Generation (Danny + Linus, Effort: M)

### Terminology & Labeling Issues (14 items)

| Current Label (UI) | Recommended | Why |
|---|---|---|
| "Framing Page" | **Main Framing** | Matches workbook tab name and industry convention. |
| "Structural Page" | **Stairs & Structural Steel** | Current label implies all structural steel; it's stairs + landings + columns only. |
| "Components Page" | **Secondary Framing & Sheeting** | "Components" is confusing to outside users. |
| "Insulation Page" | **Insulation** | OK — matches workbook. |
| "Fasteners Page" | **Fasteners & Bolts** | Add "Bolts" — anchor bolts, machine bolts, cable bracing deserve equal billing. |
| `laborRate` | **Fabrication Labor Rate ($/lb)** | Distinguish from erection labor. |
| "Building Erection ($)" | **Erection Labor ($)** | "Erection" alone can be misread. |
| "Loading & Hauling ($)" | **Loading & Hauling / Rigging ($)** | Rigging is sometimes included, sometimes separate. |
| `baySpacing` | **Number of Bays** | Field is a count, not a spacing dimension. |
| `girts` | **Girts per Bay Side** | Clarify what the number represents. |
| `purlins` | **Roof Purlins (count)** | Same — clarify this is a count, not a spacing. |
| "Economic End Frame" | **Economic End Frame (EEF)** | Add the abbreviation — appears as "EEF" in supplier catalogs. |
| "Single Slope" (checkbox) | **Single-Slope Roof** | Minor — add "Roof" for clarity. |
| "Bypass Girts" | **Bypass Girts (flush with columns)** | Add tooltip explaining this option. |

### Open Questions for Jose

1. **Who is the primary user?** In-house estimators at VMBC only, or contractor customers configuring their own buildings?
2. **Do you fabricate your own structural steel or purchase pre-fabricated frames?** Changes the cost model significantly.
3. **What is the target geography for wind load defaults?** Houston/Gulf Coast is Exposure D at 140–150 mph. If quoting statewide/out-of-state, this needs to be per-job input.
4. **Is the stair estimator always present or only for some project types?** Optional add-on or always embedded?
5. **How do you handle steel price escalation between quote date and delivery date?** 30-day validity but steel purchased 6–14 weeks later.

### Skill Created

📌 `.squad/skills/pemb-quotation-anatomy/SKILL.md` — Reusable skill documenting the structure and content of a professional PEMB proposal (per MBMA standard), with XML schema for generating proposal output programmatically.

---



# Danny — Backlog Triage from Reuben's Assessment (2026-05-14)

**Date:** 2026-05-14
**By:** Danny (Lead/Architect)
**Source:** Reuben's domain assessment merged to `.squad/decisions.md` (commit ebd6eb3)

---

## Summary

**17 issues filed** from Reuben's 17-item prioritized backlog plus 2 calculator bug flags (items 7 & 8 in the backlog correspond to the bugs).

| Priority | Count |
|----------|-------|
| P0 — Critical | 8 (including 2 bugs) |
| P1 — High | 4 |
| P2 — Nice-to-have | 5 |

| Owner | Count | Issues |
|-------|-------|--------|
| Livingston | 9 | #1, #2, #3, #4, #5, #8, #10, #14, #15 |
| Linus | 5 | #7, #9, #11, #12, #13, #16 |
| Rusty | 1 | #6 |
| Danny | 1 | #17 |

---

## Issue Table

| # | Title | Owner | Priority |
|---|-------|-------|----------|
| 1 | [P0][BUG] Fix labor calculation base — restrict to structural weight only | Livingston | critical |
| 2 | [P0][BUG] Fix frame opening cost method — dispatch on measure field | Livingston | critical |
| 3 | [P0] Build parametric main framing BOM engine | Livingston | critical |
| 4 | [P0] Build parametric component quantity calculator | Livingston | critical |
| 5 | [P0] Build stair parametric calculator | Livingston | critical |
| 6 | [P0] Add quote number, revision, valid-until, and status enum | Rusty | critical |
| 7 | [P0] Add wind speed, exposure category, and color selection to DesignPage | Linus | critical |
| 8 | [P0] Wire color selection to panel SKU in price list lookup | Livingston | critical |
| 9 | [P1] Add proposal legal language — validity, exclusions, payment terms | Linus | high |
| 10 | [P1] Auto-calculate insulation quantities from building dimensions | Livingston | high |
| 11 | [P1] Display $/sqft and $/lb summary metrics | Linus | high |
| 12 | [P1] Show quote number and revision on printed proposal | Linus | high |
| 13 | [P2] Add sales tax field with rate and include/exclude toggle | Linus | nice-to-have |
| 14 | [P2] Add freight calculator — distance x rate | Livingston | nice-to-have |
| 15 | [P2] Add contingency/escalation line item | Livingston | nice-to-have |
| 16 | [P2] Implement quote comparison page | Linus | nice-to-have |
| 17 | [P2] Server-side PDF generation for quotations | Danny | nice-to-have |

---

## Recommended Sprint Plan

### Sprint 1 — Fix the math, unblock the engine
**Focus:** Bugs + foundational calc engine. Nothing else matters if the numbers are wrong.

| Issue | Owner | Effort |
|-------|-------|--------|
| #1 — Fix labor calc base (BUG) | Livingston | S |
| #2 — Fix frame opening cost (BUG) | Livingston | S |
| #6 — Quote number/revision schema | Rusty | S |
| #7 — Wind speed + color on DesignPage | Linus | S |
| #8 — Wire color to panel SKU | Livingston | S |

**Rationale:** Bugs are immediate correctness issues. #6 and #7 are small schema/UI additions that unblock downstream work (#8, #9, #12). Livingston carries the heaviest load but all three items are small.

### Sprint 2 — Parametric engines (the big lift)
**Focus:** The three parametric calculators that make the app faster than Excel.

| Issue | Owner | Effort |
|-------|-------|--------|
| #3 — Parametric main framing BOM | Livingston | L |
| #4 — Parametric component calculator | Livingston | L |
| #5 — Stair parametric calculator | Livingston + Linus | M |
| #9 — Proposal legal language | Linus | M |

**Rationale:** Items #3 and #4 are the highest-value features (eliminate 40+ manual entries per building). #5 and #9 run in parallel — Linus on legal language while Livingston focuses on the engines. This is Livingston-heavy; Saul should be writing tests alongside.

### Sprint 3 — Polish and professional output
**Focus:** Make the quotation output professional and add remaining high-priority items.

| Issue | Owner | Effort |
|-------|-------|--------|
| #10 — Insulation auto-calc | Livingston | S |
| #11 — $/sqft and $/lb metrics | Linus | S |
| #12 — Quote number on printed proposal | Linus | S |
| #13 — Sales tax field | Linus + Livingston | S |
| #14 — Freight calculator | Livingston | S |

**Rationale:** All small items that round out the quotation output. After Sprint 3 the app is usable for real bids.

### Backlog (Sprint 4+)
- #15 — Contingency line item
- #16 — Comparison page (depends on #6 revision tracking)
- #17 — Server-side PDF (architecture decision needed first)

---

## Owner Deviations from Reuben's Suggestions

| Item | Reuben Suggested | I Assigned | Reason |
|------|-----------------|------------|--------|
| #13 (Sales Tax) | Linus + Livingston | Linus (primary) | Livingston overloaded in sprints 1–2; UI-heavy item |
| #14 (Freight) | Linus + Livingston | Livingston (primary) | Calc logic is the core work; Linus assists on UI |
| #17 (PDF) | Danny + Linus | Danny (primary) | Architecture decision on PDF lib is mine; Linus assists after |

All items with dual owners: primary owner is the label; secondary collaborates but doesn't own delivery.

---

## Notes

- **Livingston is the bottleneck.** 9 of 17 issues land on him. Sprint planning must sequence his work carefully. Saul should pair on test coverage for every Livingston delivery.
- **Bugs (#1, #2) elevated to P0.** Reuben listed these as "High Priority" (items 7–8) but they're correctness issues — wrong numbers in production quotes is a P0.
- **Reuben does NOT code.** Any item Reuben specs, another agent implements. Reuben reviews domain correctness on all calculator PRs.

---

*Filed by Danny (squad lead) — 2026-05-14*

