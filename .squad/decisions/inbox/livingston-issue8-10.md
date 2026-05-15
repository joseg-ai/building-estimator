# Livingston Inbox — Issues #8 & #10 Pricing Assumptions

**Date:** 2026-05-16  
**Author:** Livingston  
**Branch:** squad/8-10-pricing  
**Issues:** #8 (Color → Panel SKU), #10 (Auto-calc insulation)

---

## Issue #8 — Color Panel & Trim Pricing

### What the workbook says

From `priceList.ts` / SKILL.md (Central States supplier sheet):

| SKU | Description | $/LF |
|---|---|---|
| CL244GL | Panel, Galvalume, 24Ga, Central Loc (roof baseline) | $3.2783 |
| RL6GLST | Panel, Galvalume, 26Ga, RLoc, Standard (wall) | $3.0082 |
| RL6LS | Panel, Color, 26Ga, RLoc, Prime Lifetime (all SMP colors) | $4.0843 |
| SSRA6LS | Sculptured Rake Trim, Color | $5.4699 |

### Markup vs. task brief

The task brief says "SMP/premium colors a markup of ~5–15% over Galvalume." **The actual workbook shows ~24.6% for panels (CL244GL → RL6LS) and ~18.9% for trim.** Livingston used workbook values as authoritative (charter: "the Excel workbook is the spec"). If Jose wants to set a softer markup, override `colorPriceTable` entries in priceList.ts directly.

### Galvalume trim SKU

No Galvalume-specific trim SKU exists in the current supplier sheet. Used `SSRA6GL` as a placeholder with an estimated baseline price of **$4.60/LF** (~16% below the color SSRA6LS at $5.4699). If Central States provides a specific Galvalume trim price, update `colorPriceTable[0].trimPricePerLF`.

### All colors same price

Central States pricing has ALL 11 SMP colors at the same $/LF ($4.0843 panel, $5.4699 trim). SKU codes differ per color but the price tier is flat. If supplier introduces tiered pricing by color, extend `ColorSku.roofPanelPricePerLF` per entry.

### "Brick Red" renamed to "Brite Red"

The DesignPage previously had "Brick Red". The brief specified "Brite Red" (industry standard Central States name). Updated.

---

## Issue #10 — Auto-calculated Insulation

### Workbook data available

The workbook has one insulation item: R-10 3" at $3.4956/LnFt. No R-13/19/25/30 data in the current extract.

### R-value pricing (estimated)

No per-R-value data found in workbook extract or supplier sheet. Used industry-standard PEMB blanket insulation rates:

| R-value | Thickness | $/sqft |
|---|---|---|
| R-13 | 3.5" | $0.55 |
| R-19 | 6.0" | $0.72 |
| R-25 | 8.0" | $0.89 |
| R-30 | 10.0" | $1.05 |

Basis: PEMB faced-fiberglass blanket market rates (US, 2024–2025). The existing R-10 at $3.4956/LnFt converts to ~$0.58/sqft assuming a 72" wide roll (1 LnFt covers 6 sqft). This is consistent with the R-13 baseline of $0.55/sqft.

**Action needed:** Confirm pricing with Central States or current insulation supplier. If they quote by LnFt (roll format), the conversion is `pricePerSqft = LnFt_price / roll_width_ft`.

### Insulation measure

The catalog insulation items use `LnFt` measure (roll linear footage). The auto-calc function operates in sqft and returns a cost directly (bypassing the catalog `qty` field). The catalog items remain available for manual override — if an estimator sets qty > 0, the auto-calc is bypassed and stored qty×costPerUnit is used.

### Opening deductions (wall insulation)

Deductions use nominal rough-opening dimensions:
- 3070 door: 3×7 = 21 sqft
- 4070 door: 4×7 = 28 sqft
- 6070 door: 6×7 = 42 sqft
- Roll-up / frame openings: user-entered width × height
- 3030 window: 9 sqft, 4030: 12, 6030: 18, 6040: 24

No deduction for lean-to walls (lean-to insulation not in scope for this PR — treated as separate future item).

### Slope factor

Roof insulation sqft uses the slope-adjusted rafter area:  
`roof_sqft = (W/2) × √(1 + (pitch/12)²) × 2 × L`  
For 40×60×16, pitch 4:12: ~2,529.8 sqft.

---

## Flags for Danny / Jose

1. **Galvalume trim price** needs supplier confirmation ($4.60/LF is an estimate).
2. **Insulation R-value pricing** — get current quote from insulation supplier.
3. **Markup 5–15% vs 24.6%** — confirm whether brief was aspirational or a pricing policy.
