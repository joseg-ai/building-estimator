/** Centralized price list -- mirrors the "Central Prices" sheet from the supplier */

export interface PriceListItem {
  itemCode: string;
  description: string;
  unit: string;
  unitPrice: number;
  /** Which catalog material names this price maps to (for auto-sync) */
  mapTo: string[];
}

// ---------------------------------------------------------------------------
// Color → SKU / price table (Issue #8)
// ---------------------------------------------------------------------------

/** Panel and trim pricing keyed by PEMB color name. */
export interface ColorSku {
  /** Display name / color selection value */
  color: string;
  /** Central States SKU for roof panel (PBR / RLoc) */
  roofPanelSku: string;
  /** Central States SKU for wall panel (PBR / RLoc) */
  wallPanelSku: string;
  /** Central States SKU for trim (Sculptured Rake / Corner / Jamb trim) */
  trimSku: string;
  /** Roof panel unit price $/LF */
  roofPanelPricePerLF: number;
  /** Wall panel unit price $/LF */
  wallPanelPricePerLF: number;
  /** Trim unit price $/LF (blended rake-trim rate; eave gutter priced separately) */
  trimPricePerLF: number;
}

/**
 * PEMB color options with Central States supplier codes and pricing.
 *
 * Pricing basis:
 *   Galvalume (baseline):   CL244GL @ $3.2783/LF roof,  RL6GLST @ $3.0082/LF wall,  trim ~$4.60/LF (estimated — no Galvalume-trim SKU in current supplier sheet).
 *   SMP color panels:       RL6LS  @ $4.0843/LF  (~24.6 % above Galvalume, per workbook CL244GL vs RL6LS).
 *   Color trim:             SSRA6LS @ $5.4699/LF  (~18.9 % above Galvalume trim estimate).
 *
 * NOTE: The brief requested "5–15 % markup"; actual workbook shows ~25 % for panels and ~19 % for trim.
 *       Using workbook values as authoritative. See .squad/decisions/inbox/livingston-issue8-10.md.
 *
 * All SMP colors share the same per-LF price from Central States — the SKU code encodes the
 * color, not the price tier.  Future: if the supplier introduces different price tiers per color,
 * extend ColorSku with per-SKU overrides.
 */
export const colorPriceTable: ColorSku[] = [
  {
    color: 'Galvalume',
    roofPanelSku: 'CL244GL',   wallPanelSku: 'RL6GLST',  trimSku: 'SSRA6GL',
    roofPanelPricePerLF: 3.2783, wallPanelPricePerLF: 3.0082, trimPricePerLF: 4.60,
  },
  {
    color: 'Polar White',
    roofPanelSku: 'RL6PW',    wallPanelSku: 'RL6PW',    trimSku: 'SSRA6PW',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Light Stone',
    roofPanelSku: 'RL6LTS',   wallPanelSku: 'RL6LTS',   trimSku: 'SSRA6LTS',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Saddle Tan',
    roofPanelSku: 'RL6ST',    wallPanelSku: 'RL6ST',    trimSku: 'SSRA6ST',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Burnished Slate',
    roofPanelSku: 'RL6BS',    wallPanelSku: 'RL6BS',    trimSku: 'SSRA6BS',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Hawaiian Blue',
    roofPanelSku: 'RL6HB',    wallPanelSku: 'RL6HB',    trimSku: 'SSRA6HB',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Brite Red',
    roofPanelSku: 'RL6BR',    wallPanelSku: 'RL6BR',    trimSku: 'SSRA6BR',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Forest Green',
    roofPanelSku: 'RL6FG',    wallPanelSku: 'RL6FG',    trimSku: 'SSRA6FG',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Charcoal Gray',
    roofPanelSku: 'RL6CG',    wallPanelSku: 'RL6CG',    trimSku: 'SSRA6CG',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Snow White',
    roofPanelSku: 'RL6SW',    wallPanelSku: 'RL6SW',    trimSku: 'SSRA6SW',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Ash Gray',
    roofPanelSku: 'RL6AG',    wallPanelSku: 'RL6AG',    trimSku: 'SSRA6AG',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
  {
    color: 'Koko Brown',
    roofPanelSku: 'RL6KB',    wallPanelSku: 'RL6KB',    trimSku: 'SSRA6KB',
    roofPanelPricePerLF: 4.0843, wallPanelPricePerLF: 4.0843, trimPricePerLF: 5.4699,
  },
];

/** All valid PEMB color names in display order. Single source of truth for UI selects. */
export const PEMB_PANEL_COLORS: string[] = colorPriceTable.map((c) => c.color);

/**
 * Return the panel unit price ($/LF) for the given color.
 * Falls back to Galvalume price when the color is unknown or blank.
 */
export function getPanelUnitPrice(color: string, role: 'roof' | 'wall'): number {
  const entry = colorPriceTable.find((c) => c.color === color);
  if (!entry) {
    // Unknown / blank → Galvalume baseline
    const galvalume = colorPriceTable[0];
    return role === 'roof' ? galvalume.roofPanelPricePerLF : galvalume.wallPanelPricePerLF;
  }
  return role === 'roof' ? entry.roofPanelPricePerLF : entry.wallPanelPricePerLF;
}

/**
 * Return the trim unit price ($/LF) for the given color.
 * Falls back to Galvalume trim price when the color is unknown or blank.
 */
export function getTrimUnitPrice(color: string): number {
  const entry = colorPriceTable.find((c) => c.color === color);
  return entry ? entry.trimPricePerLF : colorPriceTable[0].trimPricePerLF;
}

// ---------------------------------------------------------------------------
// R-value insulation pricing (Issue #10)
// ---------------------------------------------------------------------------

/** Standard R-value options for PEMB blanket insulation. */
export type RValue = 'R-13' | 'R-19' | 'R-25' | 'R-30';

/** All R-value options in ascending order. */
export const R_VALUE_OPTIONS: RValue[] = ['R-13', 'R-19', 'R-25', 'R-30'];

export interface RValuePrice {
  rValue: RValue;
  /** Nominal thickness in inches (for display) */
  thicknessIn: number;
  /** Cost per square foot of coverage ($/sqft) */
  pricePerSqft: number;
}

/**
 * PEMB faced-fiberglass blanket insulation pricing by R-value.
 *
 * Basis: industry-standard PEMB blanket insulation (faced fiberglass roll, double-bubble).
 * The workbook has R-10 at $3.4956/LnFt (≈ $0.58/sqft assuming 72" wide roll).
 * Extrapolated to R-13/19/25/30 using proportional thickness and standard market premiums.
 * No per-R-value data found in the current workbook extract — assumptions filed in inbox.
 * Override pattern: if any insulation component has qty > 0 the stored qty×cost is used instead.
 */
export const rValuePriceTable: RValuePrice[] = [
  { rValue: 'R-13', thicknessIn: 3.5, pricePerSqft: 0.55 },
  { rValue: 'R-19', thicknessIn: 6.0, pricePerSqft: 0.72 },
  { rValue: 'R-25', thicknessIn: 8.0, pricePerSqft: 0.89 },
  { rValue: 'R-30', thicknessIn: 10.0, pricePerSqft: 1.05 },
];

/**
 * Return the insulation unit price ($/sqft) for the given R-value.
 * Falls back to R-13 when unknown.
 */
export function getRValuePrice(rValue: RValue | string | undefined): number {
  const entry = rValuePriceTable.find((r) => r.rValue === rValue);
  return entry ? entry.pricePerSqft : rValuePriceTable[0].pricePerSqft; // R-13 default
}

/** Master price list sourced from the Central States supplier sheet */
export const defaultPriceList: PriceListItem[] = [
  // Cold Form -- Purlins & Girts (Zee)
  { itemCode: 'Z82514R', description: 'Purlin, Zee, 8x2.5x14 Red Ox', unit: 'LF', unitPrice: 3.6295, mapTo: ['Zee 8 x 2 1/2 x 14 Red Ox'] },
  { itemCode: 'Z82516R', description: 'Purlin, Zee, 8x2.5x16 Red Ox', unit: 'LF', unitPrice: 3.6785, mapTo: ['Zee 8 x 2 1/2 x 16 Red Ox'] },
  { itemCode: 'Z82512R', description: 'Purlin, Zee, 8x2.5x12 Red Ox', unit: 'LF', unitPrice: 6.2277, mapTo: ['Zee 8 x 2 1/2 x 12 Red Ox'] },
  { itemCode: 'Z123514R', description: 'Purlin, Zee, 12x3.5x14 Red Ox', unit: 'LF', unitPrice: 5.8828, mapTo: ['Zee 12 x 3 1/2 x 14 Red Ox'] },
  { itemCode: 'Z103514R', description: 'Purlin, Zee, 10x3.5x14 Red Ox', unit: 'LF', unitPrice: 5.2927, mapTo: [] },
  { itemCode: 'Z102514R', description: 'Purlin, Zee, 10x2.5x14 Red Ox', unit: 'LF', unitPrice: 4.7025, mapTo: [] },
  { itemCode: 'Z102512R', description: 'Purlin, Zee, 10x2.5x12 Red Ox', unit: 'LF', unitPrice: 7.1213, mapTo: [] },

  // Cold Form -- Cee
  { itemCode: 'C82516R', description: 'Purlin, Cee, 8x2.5x16 Red Ox', unit: 'LF', unitPrice: 3.6785, mapTo: ['Cee 8 x 2 1/2 x 16 Red Ox'] },
  { itemCode: 'C82514R', description: 'Purlin, Cee, 8x2.5x14 Red Ox', unit: 'LF', unitPrice: 4.7025, mapTo: ['Cee 8 x 2 1/2 x 14 Red Ox'] },
  { itemCode: 'C83512R', description: 'Purlin, Cee, 8x3.5x12 Red Ox', unit: 'LF', unitPrice: 7.1213, mapTo: ['Cee 8 x 3 1/2 x 12 Red Ox'] },
  { itemCode: 'C83514R', description: 'Purlin, Cee, 8x3.5x14 Red Ox', unit: 'LF', unitPrice: 5.8828, mapTo: ['Cee 8 x 3 1/2 x 14 Red Ox'] },
  { itemCode: 'C102512R', description: 'Purlin, Cee, 10x2.5x12 Red Ox', unit: 'LF', unitPrice: 7.1213, mapTo: [] },
  { itemCode: 'C102514R', description: 'Purlin, Cee, 10x2.5x14 Red Ox', unit: 'LF', unitPrice: 4.7025, mapTo: [] },
  { itemCode: 'C82512R', description: 'Purlin, Cee, 8x2.5x12 Red Ox', unit: 'LF', unitPrice: 6.2277, mapTo: ['Cee 8 x 2 1/2 x 12 Red Ox'] },

  // Eave Strut
  { itemCode: 'PU2012R', description: 'Eave Strut, 12x5x2 Red Ox', unit: 'LF', unitPrice: 8.9086, mapTo: ['8 x 5 x 5 14GA Red Ox'] },
  { itemCode: 'ES85212R', description: 'Eave Strut, 8x5x2 3/4 12GA Red Ox', unit: 'LF', unitPrice: 6.6373, mapTo: ['8 x 5 x 2 3/4 12GA Red Ox'] },

  // Base / Rake Angles
  { itemCode: 'B4216R', description: 'Base Angle, 4x2x16 Red Ox', unit: 'LF', unitPrice: 1.567, mapTo: [] },
  { itemCode: 'B4214Z', description: 'Base Angle, 4x2x14 Galv', unit: 'LF', unitPrice: 2.0771, mapTo: ['Base/Rake angle 2 x 4 14GA Red Ox'] },

  // Panels -- Sheeting
  { itemCode: 'CL244GL', description: 'Panel, Galvalume, 24Ga, Central Loc', unit: 'LF', unitPrice: 3.2783, mapTo: ['Panel PBR 26Ga Lifetime Galvalume 36" x 1 1/4"'] },
  { itemCode: 'RL6LS', description: 'Panel, Color, 26Ga, RLoc, Prime Lifetime', unit: 'LF', unitPrice: 4.0843, mapTo: ['Panel PBR 26Ga Lifetime Color 36" x 1 1/4"'] },
  { itemCode: 'ML6PW', description: 'Panel, Polar, 26Ga, MLoc, Prime Lifetime', unit: 'LF', unitPrice: 4.0843, mapTo: ['Panel PBU 26Ga Color 36" x 3/4"'] },
  { itemCode: 'RL6GLST', description: 'Panel, Galvalume, 26Ga, RLoc, Standard', unit: 'LF', unitPrice: 3.0082, mapTo: [] },
  { itemCode: 'ML6GLSTREV', description: 'Panel, Galvalume, 26Ga, MLoc, Standard Rev', unit: 'LF', unitPrice: 3.0082, mapTo: [] },

  // Roof Trim
  { itemCode: 'SSRA6LS', description: 'Sculptured Rake Trim, Color', unit: 'LF', unitPrice: 5.4699, mapTo: ['Sculptured Rake Trim'] },
  { itemCode: 'SSGU-46LS', description: 'Eave Gutter, Color', unit: 'LF', unitPrice: 6.7663, mapTo: ['Eave Gutter'] },
  { itemCode: 'SSGEN6LS', description: 'Gutter End Cap', unit: 'Ea', unitPrice: 9.1497, mapTo: ['Gutter Endcap'] },
  { itemCode: 'CL246LS', description: 'Gutter Strap', unit: 'Ea', unitPrice: 10.101, mapTo: ['Gutter Strap'] },
  { itemCode: 'SSPC6LS', description: 'Box Panel Cap Trim', unit: 'Ea', unitPrice: 18.9177, mapTo: ['Box Panel Cap Trim'] },
  { itemCode: 'SSEF36GL', description: 'Parapet High Side Eave Flash', unit: 'Ea', unitPrice: 22.3007, mapTo: ['Parapet High Side Eave'] },

  // Wall Trim
  { itemCode: 'OU6LS', description: 'Outside Corner Trim, Color', unit: 'LF', unitPrice: 2.9143, mapTo: ['Outside Corner Trim'] },
  { itemCode: 'JA6LS', description: 'Jamb Trim, Color', unit: 'LF', unitPrice: 1.2647, mapTo: ['Jamb Trim'] },
  { itemCode: 'FRCHE6LS', description: 'Head Trim, Color', unit: 'LF', unitPrice: 1.4296, mapTo: ['Head Trim'] },
  { itemCode: 'DS6LS', description: 'Downspout Straight, Color', unit: 'LF', unitPrice: 3.5191, mapTo: ['Downspout Straight'] },
  { itemCode: 'DSE456LS', description: 'Downspout Elbow, Color', unit: 'Ea', unitPrice: 15.2016, mapTo: ['Downspout Elbow'] },
  { itemCode: 'DSS6LS', description: 'Downspout Strap, Color', unit: 'Ea', unitPrice: 4.114, mapTo: ['Downspout Strap'] },
  { itemCode: 'IC16PW', description: 'Inside Corner Trim / Liner', unit: 'LF', unitPrice: 2.8593, mapTo: ['Inside Corner Trim / Liner'] },
  { itemCode: 'TS6BS-DRIP', description: 'Drip Trim, B. Slate', unit: 'Ea', unitPrice: 19.45, mapTo: ['Drip Trim'] },
  { itemCode: 'TS6BS-MASONRY', description: 'Masonry Trim, B. Slate', unit: 'Ea', unitPrice: 34.6575, mapTo: ['Masonry Trim'] },

  // Hardware / Closures / Sealants
  { itemCode: 'CL504A', description: 'Tri Bead Tape Sealer 7/8x3/16x25\'', unit: 'Cse', unitPrice: 64.9161, mapTo: ['Tri Bead Tap Sealant'] },
  { itemCode: 'MRS10CLEAR', description: 'Sealant, Metal Roof, Clear', unit: 'Ea', unitPrice: 13.0379, mapTo: ['Polyurethane Tube Sealant'] },
  { itemCode: 'RLCLOUTGLUE', description: 'Closure, Outside, RLoc w/ Glue', unit: 'Ea', unitPrice: 1.0302, mapTo: ['Outside Closure For R/U Panel'] },
  { itemCode: 'RLCLINGLUE', description: 'Closure, Inside, RLoc w/ Glue', unit: 'Ea', unitPrice: 1.0302, mapTo: ['Inside Closure For R/U Panel'] },
  { itemCode: 'CL7600', description: 'Eave Plate, Low, 8\', 14ga Red Oxide', unit: 'Ea', unitPrice: 20.2691, mapTo: ['Low Floating Eave Plate'] },
  { itemCode: 'CL7710', description: 'Rake Support, Low Floating', unit: 'Ea', unitPrice: 56.9376, mapTo: ['Low Floating Rake Support'] },
  { itemCode: 'CL7700', description: 'Backup Plate', unit: 'Ea', unitPrice: 14.4848, mapTo: ['Backup Plate'] },
  { itemCode: 'BANDSW', description: 'Strapping Band, 24GA, 2", White Roll', unit: 'Roll', unitPrice: 330.1617, mapTo: [] },

  // Structural Steel -- reference only (purchased from steel distributors)
  { itemCode: 'STEEL-BEAMS', description: 'Structural Beams (W-shapes)', unit: 'Lb', unitPrice: 0.85, mapTo: ['Ninguno'] },
  { itemCode: 'STEEL-FLAT', description: 'Flat Bars', unit: 'Lb', unitPrice: 0.8245, mapTo: [] },
  { itemCode: 'STEEL-PIPE', description: 'Pipes (schedule 40)', unit: 'Lb', unitPrice: 1.003, mapTo: [] },
  { itemCode: 'STEEL-HSS', description: 'HSS Tubes', unit: 'Lb', unitPrice: 1.003, mapTo: [] },
  { itemCode: 'STEEL-ANGLE', description: 'Angles', unit: 'Lb', unitPrice: 0.8245, mapTo: [] },
  { itemCode: 'STEEL-CHANNEL', description: 'Channels', unit: 'Lb', unitPrice: 0.85, mapTo: [] },

  // Bolts & Fasteners
  { itemCode: 'AB-3/4', description: 'Anchor Bolts 3/4"', unit: 'pc', unitPrice: 12.00, mapTo: ['Anchor Bolts 3/4"'] },
  { itemCode: 'BT-1/2', description: 'Bolt 1/2 Machine bolt with nut 1"', unit: 'pc', unitPrice: 1.375, mapTo: ['Bolt 1/2 Machine bolt with nut 1"'] },
  { itemCode: 'BT-5/8', description: 'Bolt 5/8 with nut 1 3/4"', unit: 'pc', unitPrice: 1.485, mapTo: ['Bolt 5/8 Bolt with nut 1 3/4"'] },
  { itemCode: 'BT-3/4', description: 'Bolt 3/4 with nut 1 3/4"', unit: 'pc', unitPrice: 1.705, mapTo: ['Bolt 3/4 Bolt with nut 1 3/4"'] },
  { itemCode: 'CB-3/8', description: '3/8" Strand Cable', unit: 'LnFt', unitPrice: 0.9867, mapTo: ['3/8" Strand'] },
  { itemCode: 'BK-3/4', description: '3/4" Brace Kit', unit: 'pc', unitPrice: 84.3806, mapTo: ['3/4" Brace Kit'] },
  { itemCode: 'FW-3/4', description: '3/4 Flat Washer', unit: 'pc', unitPrice: 0, mapTo: ['3/4 Flat Washer'] },
  { itemCode: 'HW-3/4', description: '3/4 Hillside Washer', unit: 'pc', unitPrice: 0, mapTo: ['3/4 Hillside Washer'] },
  { itemCode: 'FLG', description: 'Flo-loc Grip', unit: 'pc', unitPrice: 0, mapTo: ['Flo-loc Grip'] },
  { itemCode: 'FASTENERS', description: 'Fasteners (screws)', unit: 'pc', unitPrice: 0.165, mapTo: ['Fasteners'] },

  // Insulation
  { itemCode: 'INS-R10', description: 'Insulation R10 3"', unit: 'LnFt', unitPrice: 3.4956, mapTo: ['R10 3"'] },

  // Doors & Windows -- supplier prices
  { itemCode: 'DR-3070', description: 'Door 3070 M w/ STD Frame 8 1/4', unit: 'pc', unitPrice: 850, mapTo: ['Doors 3070'] },
  { itemCode: 'DR-4070', description: 'Door 4070 M w/ STD Frame 8 1/4', unit: 'pc', unitPrice: 950, mapTo: ['Doors 4070'] },
  { itemCode: 'DR-6070', description: 'Door 6070 M w/ STD Frame 8 1/4', unit: 'pc', unitPrice: 1200, mapTo: ['Door 6070'] },
  { itemCode: 'PANIC', description: 'Panic Hardware', unit: 'pc', unitPrice: 350, mapTo: ['Panic Hardware'] },
  { itemCode: 'DEADBOLT', description: 'Dead Bolt', unit: 'pc', unitPrice: 45, mapTo: ['Dead Bolt'] },
  { itemCode: 'ROLLUP', description: 'Roll Up Door', unit: 'pc', unitPrice: 2400, mapTo: ['Roll up Door'] },
  { itemCode: 'WIN-3030', description: 'Window 3030 Self Flashing', unit: 'pc', unitPrice: 185, mapTo: ['Window 3030'] },
  { itemCode: 'WIN-4030', description: 'Window 4030 Self Flashing', unit: 'pc', unitPrice: 220, mapTo: ['Window 4030'] },
  { itemCode: 'WIN-6030', description: 'Window 6030 Self Flashing', unit: 'pc', unitPrice: 310, mapTo: ['Window 6030'] },
  { itemCode: 'WIN-6040', description: 'Window 6040 Self Flashing', unit: 'pc', unitPrice: 380, mapTo: ['Window 6040'] },

  // Stairs
  { itemCode: 'STEP-STEEL', description: 'Step Steel 11"x1" Lip', unit: 'LnFt', unitPrice: 18.216, mapTo: ['Step Steel 11"x1"Lip'] },
  { itemCode: 'BRACKETS-HR', description: 'Brackets for Handrail', unit: 'pc', unitPrice: 20.24, mapTo: ['Brackets for handrail'] },

  // Deck
  { itemCode: 'DECK-20GA', description: 'Deck Panel 20Ga', unit: 'LnFt', unitPrice: 11.0726, mapTo: ['Deck panel 20 Ga'] },

  // Sheeting angle / clips
  { itemCode: 'SH-ANGLE', description: 'Sheeting Angle', unit: 'pc', unitPrice: 3.7849, mapTo: ['Sheeting Angle'] },
  { itemCode: 'SH-CLIP', description: 'Sliding Clip', unit: 'pc', unitPrice: 3.785, mapTo: ['Sliding Clip'] },
];
