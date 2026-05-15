# SKILL: PEMB Quotation Anatomy

**Skill ID:** `pemb-quotation-anatomy`
**Author:** Reuben (Domain Expert)
**Date:** 2026-05-14
**Applies to:** Any agent generating, reviewing, or modifying the QuotationPage, SummaryPage, or quote-related data models.

---

## What This Skill Is

A reusable reference for the required anatomy of a Pre-Engineered Metal Building (PEMB) quotation/proposal document — based on the VMBC workbook (`Quotation.txt`) and MBMA industry standards.

---

## Required Sections (in order)

### 1. Company Header
- Company legal name + DBA name
- Physical address
- Phone / Fax
- Optional: logo, email

### 2. Client / Job Block
- "Proposal Submitted To:" — customer name
- Customer phone
- Customer street, city/state/zip
- Date (proposal date — NOT today if different from creation date)
- Job name (project name)
- Job location (street address of the build site)
- Architect/Engineer (if applicable)
- A/E's date of plans (if applicable)
- Customer email / fax

### 3. Quote / Revision Number
- Quote number (e.g., QT-2026-0001)
- Revision number (e.g., Rev. 0)

### 4. Building Description Line
Free-text: "One Metal Building {W}W × {L}L × {H}H {pitch}:12, Roof Pitch, {Gable|Single-Slope} Slope"

### 5. Additional Structures Checklist (YES/NO per item)
- Overhangs (qty, dimensions if YES)
- Lean-to(s) (qty, width × length if YES)
- Parapet (if YES — height)
- Canopies (qty, W × D × H if YES)
- HSS Canopies (qty if YES)

### 6. Components Checklist (YES/NO per item)
- Roof Panel (full spec: gauge, finish, width, height)
- Side Wall System (full spec)
- End Wall System (full spec)
- Side Wall Liner System (YES/NO + spec)
- End Wall Liner System (YES/NO + spec)
- All Trim (style, gauge) with Down Spouts & Gutters
- All Structural Machine Bolts & Component Fasteners
- Roof Insulation (R-value + thickness, e.g., "R10 3"")
- Side Wall Insulation (same)
- End Wall Insulation (same)

### 7. Accessories Checklist (qty + YES/NO per item)
- Doors 3070 M w/STD Frame 8 1/4
- Doors 4070 M w/STD Frame 8 1/4
- Door 6070 M w/STD Frame 8 1/4
- Dead Bolt(s)
- Panic Hardware
- Roll Up Door(s) (qty × W × H)
- Frame Openings (4 slots — qty × W × H each)
- Windows (3030, 4030, 6030, 6040 — qty each)
- Non-Standard Doors or Windows flag

### 8. Building Engineering Checklist (YES/NO per item)
- Sealed Engineer and jurisdiction-approved fabricator stamped drawings
- Anchor Bolt, Approval & Erection Drawings
- Wind Load Design [X] MPH (configurable)
- Engineering Design [X] MPH
- Building Erection (YES = erection is in scope)
- Heavy Equipment by fabricator (YES/NO)

### 9. Itemized Pricing Table
| Item | Amount |
|---|---|
| Building Price | $XXX |
| Building Erection | $XXX or $0 |
| Foundation | $XXX or $0 |
| Permits | $XXX or $0 |
| **Total** | **$XXX** |

### 10. Observations Block
- Free-text observation line(s), e.g., "Building Design as Per Customer Specifications"
- "Sales Tax Not Included" (or tax amount if included)

### 11. Colors Block
- Roof: [color selection]
- Walls: [color selection]
- Trim: [color selection]

### 12. Legal / Commercial Language (REQUIRED — currently missing from webapp)
- **Validity:** "This proposal is valid for 30 days from the date shown above. All prices are subject to change due to fluctuation in material or component prices."
- **Exclusions:** Bulleted list — concrete, electrical, plumbing, HVAC, painting, permits (unless itemized above)
- **Payment Terms:** Standard PEMB = 50% with signed contract, 40% on delivery, 10% on completion
- **Lead Time:** "Estimated delivery: [N] weeks from receipt of signed contract, deposit, and approved anchor bolt drawings"
- **Scope:** "Scope of supply: fabricated metal building package only. Erection [is/is not] included."

### 13. Signature Block
- Authorized Signature line (with title/name)
- Date line
- Customer Acceptance line
- Customer date line

---

## Color / Panel SKU Mapping

| Finish | Supplier Code | Price ($/LnFt) |
|---|---|---|
| Galvalume (roof standard) | CL244GL | $3.2783 |
| Galvalume 26Ga RLoc | RL6GLST | $3.0082 |
| Color 26Ga RLoc Prime Lifetime | RL6LS | $4.0843 |
| Color 26Ga MLoc Prime Lifetime (liner) | ML6PW | $4.0843 |

Price difference between Galvalume and color: ~25%. Color selection must drive SKU selection in the price list lookup.

---

## Standard PEMB Markup Stack

```
Direct Materials (structural + components + insulation + fasteners)
+ Fabrication Labor  = structural_weight_lbs × $/lb  [NOT applied to cold-form]
= Total Materials + Labor
+ Detailing (flat $)
+ Engineering (flat $)
+ Loading & Hauling (flat $)
+ Freight (distance × $/mile or flat $)
+ Overhead (% of Materials + Labor total)
+ Erection (flat $ or $/sqft)
+ Foundation (flat $)
+ Permits (flat $)
+ Contingency (% of Direct Materials — optional, 3–5%)
= Sub Total
+ Profit (% of Sub Total)
+ Sales Commission (% of Sub Total)
= Grand Total
(+ Sales Tax if applicable)
```

**Key rule:** Labor base = structural steel weight ONLY (BEAMS, CHANNELS, FLAT BARS, ANGLES, PIPES, HSS). Cold-formed components (Zee/Cee purlins/girts, sheeting, trim) are purchased cut-to-length — no fabrication labor applied.

---

## Key Terminology (Industry vs. Common Confusion)

| Industry Term | Do NOT use | Notes |
|---|---|---|
| Purlins | "roof members" | Z-shaped or C-shaped secondary roof framing |
| Girts | "wall members" | Z-shaped or C-shaped secondary wall framing |
| Eave Strut | "eave beam" | Structural member at the eave combining girt and purlin function |
| Base Angle | "bottom trim" | Cold-formed angle at base of wall panels |
| Rake Angle | "edge trim" | Cold-formed angle at gable ends |
| Economic End Frame | EEF | Cold-formed end frame instead of hot-rolled |
| Bypass Girts | "flush girts" | Girts that bypass (sit outside) columns rather than fitting between them |
| Parapet | — | Wall extension above eave; requires its own framing (cold-form channels) |
| Lean-to | "shed addition" | Secondary structure sharing one wall with the main building |
| Frame Opening | "rough opening" | Framed opening in wall for field-installed door or window not supplied by fabricator |
| Roll-Up Door | "overhead door" | Coiling door (sectional or rolling steel) |
| PBR Panel | "ribbed panel" | Purlin Bearing Rib — the standard 36" exposed-fastener roof/wall panel |
| Standing Seam | "hidden fastener" | Concealed-fastener panel; higher cost, better performance |
| Galvalume | "galvanized" | Aluminum-zinc alloy coating; superior corrosion resistance vs. galvanized |

---

## References
- `extracted_data/Quotation.txt` — authoritative VMBC proposal format
- `extracted_data/Summary.txt` — cost rollup structure
- MBMA Metal Building Systems Manual Chapter 9 (Contracts & Specifications)
- AISC 360-22 (steel pricing basis)
- Texas Tax Code §151 (sales tax)
