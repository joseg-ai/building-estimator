/**
 * Stair Engine — parametric Bill of Materials & Cost for stairs.
 *
 * Generates ComponentItem rows for stair stringers, treads, mid-/floor-landings,
 * guard/hand rails, supports, columns and brackets from a StairConfig. Mirrors
 * formulas from the Excel workbook (extracted_data/Stairs.txt for inputs and
 * extracted_data/Structural.txt for the BOM totals).
 *
 * COST STACK (per Structural sheet rows 48–62, distinct from main building):
 *   Direct Materials  (Σ BOM row direct cost)
 * + Labor             (= structural weight × laborRate, default $0.60/lb)
 * + Detailing + Loading/Hauling + Freight + Overhead(3% of running subtotal)
 *   → Sub Total
 * + Profit            (10%, NOT the 15% used elsewhere — issue #5 AC item 6)
 * + Commission        (4% of subtotal, matches the rest of the workbook)
 *   → Grand Total
 *
 * WORKBOOK CANONICAL CASE — extracted_data/Stairs.txt + Structural.txt rows 9–45.
 *   3 levels, 12.5 ft floor-to-floor, 5 ft wide, mid-landings present,
 *   treads = [10, 9, 9] at 11"/tread, right guard rail only, both hand rails,
 *   mid landing 10.5 × 4.667 ft (3-sided guard rail), floor landing 10.5 × 6 ft
 *   (3-sided guard rail). All BOM totals below are cross-checked in
 *   __tests__/stairEngine.test.ts.
 */

import type { ComponentItem, ComponentCategory } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Per-landing geometry (mid OR top-of-flight floor landing). */
export interface StairLanding {
  /** Width of landing, perpendicular to ascent (ft). Typically 10.5. */
  width: number;
  /** Length of landing, along ascent (ft). Typically 4.667 for mid, 6 for floor. */
  length: number;
  /** Guard rail on side A (one short edge). */
  guardRailA: boolean;
  /** Guard rail on side B (the long edge opposite ascent). */
  guardRailB: boolean;
  /** Guard rail on side C (other short edge). */
  guardRailC: boolean;
}

/** Stair rails configuration. */
export interface StairRails {
  rightGuardRail: boolean;
  leftGuardRail: boolean;
  rightHandRail: boolean;
  leftHandRail: boolean;
  /** Pickets included between guard rail top/bottom (count per linear ft, 0 = none). */
  picketsPerFt?: number;
}

/** Parametric stair configuration. */
export interface StairConfig {
  /** Number of floors served above the base (1–5). */
  levels: number;
  /** Stair width — clear walking width (ft). */
  width: number;
  /** Floor-to-floor height (ft). */
  floorToFloorHeight: number;
  /**
   * Treads per flight, one entry per ascent (length = levels). When
   * hasMidLanding=true, each ascent uses HALF the listed treads on each of its
   * two sub-flights (workbook convention — see Stairs.txt rows 9–11).
   * Example: [10, 9, 9] for 3 levels.
   */
  treadsPerFlight: number[];
  /** Tread run depth (inches). Typically 11. */
  treadRunInches: number;
  /** True if each ascent has a mid-landing splitting it into two sub-flights. */
  hasMidLanding: boolean;
  /** Mid-landing geometry (required when hasMidLanding=true). */
  midLanding?: StairLanding;
  /** Floor landing at the top of each ascent (at the floor level). */
  floorLanding: StairLanding;
  /** Guard / hand rail flags. */
  rails: StairRails;
}

/** Stair BOM item — same shape as ComponentItem so it can flow into the cost engine. */
export type StairComponentItem = ComponentItem;

/** Optional pricing overrides for stair cost stack. */
export interface StairCostOverrides {
  /** $/lb fabrication labor rate. Workbook default: 0.60. */
  laborRate?: number;
  /** Flat detailing fee. Workbook default: 1500. */
  detailing?: number;
  /** Flat loading & hauling fee. Workbook default: 980. */
  loadingHauling?: number;
  /** Flat freight fee. Workbook default: 1150. */
  freight?: number;
  /** Overhead rate as decimal. Workbook default: 0.03. */
  overheadRate?: number;
  /**
   * Profit rate as decimal. **Workbook default for stairs: 0.10** — per issue
   * #5 AC item 6, stairs use 10% profit, distinct from the 15% used elsewhere.
   */
  profitRate?: number;
  /** Commission rate as decimal. Workbook default: 0.04. */
  commissionRate?: number;
}

/** Stair cost breakdown — matches Structural sheet rows 48–64. */
export interface StairCostBreakdown {
  directCost: number;
  weight: number;
  labor: number;
  detailing: number;
  loadingHauling: number;
  freight: number;
  overheadRate: number;
  overhead: number;
  subTotal: number;
  profitRate: number;
  profit: number;
  commissionRate: number;
  commission: number;
  grandTotal: number;
}

// ---------------------------------------------------------------------------
// Internal helpers (mirror bomEngine.ts conventions)
// ---------------------------------------------------------------------------

const STAIRS: ComponentCategory = 'stairs';
const MID_LAND: ComponentCategory = 'structural-landing';
const FLR_LAND: ComponentCategory = 'structural-landing';
const COLS: ComponentCategory = 'structural-columns';

/** Round qty × length up to the nearest commercial bar length (ft). */
function commercialLnF(lnFeetToFab: number, commLength: number): number {
  if (commLength <= 0 || lnFeetToFab <= 0) return 0;
  return Math.ceil(lnFeetToFab / commLength) * commLength;
}

interface StairItemArgs {
  id: string;
  category: ComponentCategory;
  description: string;
  group: string;
  material: string;
  qty: number;
  length: number;
  lnFeetToFab: number;
  commLength: number;
  measure: string;
  costPerUnit: number;
  /** lb/ft for weight = lnF × lbPerFt (Pound/ft measure) or lnF × 1 (Ln Ft). */
  weightPerFt: number;
  /**
   * For HARDWARE / pc-priced items: pass `pricedByPiece=true` to bypass the
   * lnF rounding (cost = qty × costPerUnit, weight stays 0).
   */
  pricedByPiece?: boolean;
}

function makeItem(a: StairItemArgs): StairComponentItem {
  const lnF = a.pricedByPiece ? 0 : commercialLnF(a.lnFeetToFab, a.commLength);
  const weight = a.pricedByPiece ? 0 : lnF * a.weightPerFt;
  return {
    id: a.id,
    category: a.category,
    description: a.description,
    qty: a.qty,
    length: a.length,
    lnFeetToFab: a.lnFeetToFab,
    enabled: a.qty > 0,
    group: a.group,
    material: a.material,
    commLength: a.commLength,
    measure: a.measure,
    costPerUnit: a.costPerUnit,
    weight,
    lnF,
  };
}

// ---------------------------------------------------------------------------
// Workbook material constants (from Structural.txt rows 9–44)
// ---------------------------------------------------------------------------

const C12X20_7_LB_FT = 20.7; // Stringer channel
const L_1_25X1_25X025_LB_FT = 1.92; // Tread support angle (workbook: 1075.2 / 560 lnF)
const FLAT_BAR_1_4_X_3_LB_FT = 2.55; // Form stringer flat bar (workbook: 408 / 160 lnF)
const STEP_STEEL_LB_FT = 4.5; // Step Steel 11"x1"Lip (workbook: 1260 / 280 lnFt)
const PIPE_1_5_LB_FT = 2.718; // Pipe 1 1/2" 40S (workbook: 434.88 / 160 lnF)
const C9X13_4_LB_FT = 13.4; // Landing channel
const W8X31_LB_FT = 31; // Landing support beam
const L3X3X025_LB_FT = 4.9; // Landing angle (workbook: 490 / 100 lnF)
const DECK_PANEL_LB_FT = 4.5; // 20-ga decking (workbook: 324 / 72 lnFt)
const HSS4X4_LB_FT = 9.42; // Landing column (workbook: 1507.2 / 160 lnF)

const BEAMS_COST = 0.85;
const ANGLES_COST = 0.8245;
const FLAT_BAR_COST = 0.8245;
const PIPES_COST = 1.003;
const SHEETING_COST = 11.0726;
const STEP_STEEL_COST = 18.216;
const BRACKETS_COST = 20.24;

// ---------------------------------------------------------------------------
// Geometric helpers
// ---------------------------------------------------------------------------

/**
 * Number of flights per ascent. With a mid-landing each ascent splits into two
 * sub-flights of equal rise (workbook: Row 8 "Height to landing = floor/2").
 */
function flightsPerAscent(cfg: StairConfig): number {
  return cfg.hasMidLanding ? 2 : 1;
}

/** Total flights across the whole stair = levels × flightsPerAscent. */
function totalFlights(cfg: StairConfig): number {
  return cfg.levels * flightsPerAscent(cfg);
}

/**
 * Rise per flight (ft) — workbook splits floor-to-floor in half when a
 * mid-landing exists (Stairs.txt row 8: 12.5 / 2 = 6.25).
 */
function risePerFlight(cfg: StairConfig): number {
  return cfg.floorToFloorHeight / flightsPerAscent(cfg);
}

/**
 * Run per flight (ft). Workbook convention (Stairs.txt row 5): the stored
 * "Length" is the full per-ascent run (treads × treadRun), regardless of
 * whether a mid-landing splits the ascent. The mid-landing only halves the
 * RISE, not the run — so a 3-level / 12.5 FtF / 10-tread / 11" stair yields
 * stringer = sqrt(6.25² + 9.1667²) = 11.0946 ft (workbook canonical, row 9).
 *
 * That is geometrically idealized (real sub-flights have half the run too)
 * but we mirror the workbook for direct cross-check parity.
 */
function runPerFlight(cfg: StairConfig): number {
  const treads = cfg.treadsPerFlight[0] ?? 0;
  return (treads * cfg.treadRunInches) / 12;
}

/** Stringer (hypotenuse) length per flight (ft). */
function stringerLength(cfg: StairConfig): number {
  const rise = risePerFlight(cfg);
  const run = runPerFlight(cfg);
  return Math.sqrt(rise * rise + run * run);
}

/** Total tread count = sum of treadsPerFlight across all ascents. */
function totalTreads(cfg: StairConfig): number {
  return cfg.treadsPerFlight.reduce((s, n) => s + (n || 0), 0);
}

/**
 * Guard-rail perimeter for a 3-sided landing (workbook: rows 26 & 36).
 * Sides A and C are the short (width) sides parallel to ascent; side B is the
 * long edge opposite the stair. With guardRailA/B/C flags this returns the
 * sum of enabled edges in feet.
 */
function landingRailPerimeter(l: StairLanding): number {
  let p = 0;
  if (l.guardRailA) p += l.length;
  if (l.guardRailB) p += l.width;
  if (l.guardRailC) p += l.length;
  return p;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a stair BOM as a flat list of ComponentItem rows.
 *
 * @param cfg parametric stair configuration
 * @returns BOM items in workbook order (stringer first, brackets last)
 */
export function computeStairBom(cfg: StairConfig): StairComponentItem[] {
  const items: StairComponentItem[] = [];

  const flights = totalFlights(cfg);
  const slen = stringerLength(cfg);
  const tTreads = totalTreads(cfg);
  const W = cfg.width;
  const rails = cfg.rails;

  // -----------------------------------------------------------------------
  // ST-01 Stringer  (C 12 X 20.7) — 2 per flight × all flights
  // Workbook canonical: qty=12, length=11.0946, lnFeetToFab=133.135 → lnF=140 → weight=2898
  // -----------------------------------------------------------------------
  const stringerQty = 2 * flights;
  items.push(makeItem({
    id: 'ST-01', category: STAIRS, description: 'Stringer',
    group: 'CHANNELS', material: 'C 12 X 20.7',
    qty: stringerQty, length: slen, lnFeetToFab: stringerQty * slen,
    commLength: 20, measure: 'Pound/ft', costPerUnit: BEAMS_COST,
    weightPerFt: C12X20_7_LB_FT,
  }));

  // -----------------------------------------------------------------------
  // ST-02 Tread Support (L 1 1/4 x 1 1/4 x 1/4) — 4 per tread, length = width
  // Workbook canonical: qty=112, length=5, lnFeetToFab=560 → lnF=560 → weight=1075.2
  // -----------------------------------------------------------------------
  const tsQty = 4 * tTreads;
  items.push(makeItem({
    id: 'ST-02', category: STAIRS, description: 'Tread Support',
    group: 'ANGLES', material: 'L 1 1/4 x 1 1/4 x 1/4',
    qty: tsQty, length: W, lnFeetToFab: tsQty * W,
    commLength: 20, measure: 'Pound/ft', costPerUnit: ANGLES_COST,
    weightPerFt: L_1_25X1_25X025_LB_FT,
  }));

  // -----------------------------------------------------------------------
  // Form Stringers (Flat Bar 1/4 × 3) — workbook-specific stiffener pattern.
  //
  // The workbook canonical (Stairs.txt + Structural.txt rows 11–13) ships
  // three flat-bar lengths per flight, regardless of width / tread count:
  //   6 × 4 ft + 10 × 8 ft + 8 × 5 ft  ⇒ qty 36/60/48 for 6 flights.
  // No formula is visible in the raw extract (the workbook stores these in
  // hidden helper cells), so we encode the workbook constants directly and
  // flag the assumption in livingston-issue5-stair-calc.md.
  // -----------------------------------------------------------------------
  const fs4 = 6 * flights;
  const fs8 = 10 * flights;
  const fs5 = 8 * flights;
  items.push(makeItem({
    id: 'ST-03', category: STAIRS, description: 'Form Stringer (4ft)',
    group: 'FLAT BARS', material: 'Flat Bar 1/4 x 3',
    qty: fs4, length: 4, lnFeetToFab: fs4 * 4,
    commLength: 20, measure: 'Pound/ft', costPerUnit: FLAT_BAR_COST,
    weightPerFt: FLAT_BAR_1_4_X_3_LB_FT,
  }));
  items.push(makeItem({
    id: 'ST-04', category: STAIRS, description: 'Form Stringer (8ft)',
    group: 'FLAT BARS', material: 'Flat Bar 1/4 x 3',
    qty: fs8, length: 8, lnFeetToFab: fs8 * 8,
    commLength: 20, measure: 'Pound/ft', costPerUnit: FLAT_BAR_COST,
    weightPerFt: FLAT_BAR_1_4_X_3_LB_FT,
  }));
  items.push(makeItem({
    id: 'ST-04b', category: STAIRS, description: 'Form Stringer (5ft)',
    group: 'FLAT BARS', material: 'Flat Bar 1/4 x 3',
    qty: fs5, length: 5, lnFeetToFab: fs5 * 5,
    commLength: 20, measure: 'Pound/ft', costPerUnit: FLAT_BAR_COST,
    weightPerFt: FLAT_BAR_1_4_X_3_LB_FT,
  }));

  // -----------------------------------------------------------------------
  // ST-05 Treads Step Steel — 2 per tread, length = width, priced $/LnFt
  // Workbook canonical: qty=56, length=5, lnFeetToFab=280 → lnF=280 → weight=1260, cost=5100.48
  // -----------------------------------------------------------------------
  const stepQty = 2 * tTreads;
  const stepFab = stepQty * W;
  const stepLnF = commercialLnF(stepFab, 5);
  items.push({
    id: 'ST-05', category: STAIRS, description: 'Treads Step Steel',
    qty: stepQty, length: W, lnFeetToFab: stepFab, enabled: stepQty > 0,
    group: 'HARDWARE', material: 'Step Steel 11"x1"Lip',
    commLength: 5, measure: 'LnFt', costPerUnit: STEP_STEEL_COST,
    weight: stepLnF * STEP_STEEL_LB_FT, lnF: stepLnF,
  });

  // -----------------------------------------------------------------------
  // ST-06 Guard Rail — top + bottom horizontal pipe per railed side, per flight
  // Length per piece = stringerLength + 1 (workbook: 11.0946 → 12.0946)
  // Workbook canonical (right only): qty=12, length=12.0946, lnFeetToFab=145.135
  // -----------------------------------------------------------------------
  const guardSides = (rails.rightGuardRail ? 1 : 0) + (rails.leftGuardRail ? 1 : 0);
  const guardLen = slen + 1;
  const guardQty = 2 * flights * guardSides; // 2 rails (top+bot) × flights × sides
  items.push(makeItem({
    id: 'ST-06', category: STAIRS, description: 'Guard Rail',
    group: 'PIPES', material: 'Pipe 1 1/2" Diam 40S std',
    qty: guardQty, length: guardLen, lnFeetToFab: guardQty * guardLen,
    commLength: 20, measure: 'Pound/ft', costPerUnit: PIPES_COST,
    weightPerFt: PIPE_1_5_LB_FT,
  }));

  // -----------------------------------------------------------------------
  // ST-07 Guard Rail Pickets — Round Bar 1/2, only when picketsPerFt > 0.
  // -----------------------------------------------------------------------
  const picketsPerFt = rails.picketsPerFt ?? 0;
  const picketLen = 3.5; // workbook: guard rail height
  const picketQty = picketsPerFt > 0
    ? Math.ceil(picketsPerFt * guardLen * flights * guardSides)
    : 0;
  items.push({
    id: 'ST-07', category: STAIRS, description: 'Guard Rail Pickets',
    qty: picketQty, length: picketLen, lnFeetToFab: picketQty * picketLen,
    enabled: picketQty > 0,
    group: 'PIPES', material: 'Round Bar 1/2',
    commLength: 20, measure: 'Pound/ft', costPerUnit: PIPES_COST,
    weight: 0, lnF: 0,
  });

  // -----------------------------------------------------------------------
  // ST-08 Guard Rail Supports (posts) — vertical pipe every ~1.5 ft of stringer
  //   per railed side. Length per post = 4.5 ft (3.5 ft rail + 1 ft anchor).
  // Workbook canonical (right only, 6 flights × 8 posts × 1 side = 48):
  //   qty=48, length=4.5, lnFeetToFab=216
  // -----------------------------------------------------------------------
  const postsPerFlight = Math.ceil(slen / 1.5);
  const postQty = postsPerFlight * flights * guardSides;
  items.push(makeItem({
    id: 'ST-08', category: STAIRS, description: 'Guard Rail Supports',
    group: 'PIPES', material: 'Pipe 1 1/2" Diam 40S std',
    qty: postQty, length: 4.5, lnFeetToFab: postQty * 4.5,
    commLength: 20, measure: 'Pound/ft', costPerUnit: PIPES_COST,
    weightPerFt: PIPE_1_5_LB_FT,
  }));

  // -----------------------------------------------------------------------
  // ST-09 Hand Rail — one pipe per railed side, per flight.
  //   Length per piece = stringerLength + 2 (workbook: 11.0946 → 13.0946).
  // Workbook canonical (both sides): qty=12 (6 flights × 2 sides), length=13.0946
  // -----------------------------------------------------------------------
  const handSides = (rails.rightHandRail ? 1 : 0) + (rails.leftHandRail ? 1 : 0);
  const handLen = slen + 2;
  const handQty = flights * handSides;
  items.push(makeItem({
    id: 'ST-09', category: STAIRS, description: 'Hand Rail',
    group: 'PIPES', material: 'Pipe 1 1/2" Diam 40S std',
    qty: handQty, length: handLen, lnFeetToFab: handQty * handLen,
    commLength: 20, measure: 'Pound/ft', costPerUnit: PIPES_COST,
    weightPerFt: PIPE_1_5_LB_FT,
  }));

  // -----------------------------------------------------------------------
  // ST-10 Hand Rail Brackets — workbook canonical = 60 pc.
  //   Approximated as: 2 × totalTreads + 2 × handSides  (28×2 + 2×2 = 60 ✓).
  // -----------------------------------------------------------------------
  const bracketQty = handSides > 0 ? 2 * tTreads + 2 * handSides : 0;
  items.push({
    id: 'ST-10', category: STAIRS, description: 'Brackets',
    qty: bracketQty, length: 0, lnFeetToFab: 0, enabled: bracketQty > 0,
    group: 'HARDWARE', material: 'Brackets for handrail',
    commLength: 0, measure: 'pc', costPerUnit: BRACKETS_COST,
    weight: 0, lnF: 0,
  });

  // -----------------------------------------------------------------------
  // Mid Landings  (Structural.txt rows 22–29) — one per ascent when enabled.
  // Total mid landings = levels (one between each pair of floors).
  // -----------------------------------------------------------------------
  if (cfg.hasMidLanding && cfg.midLanding) {
    pushLandingItems(items, cfg.midLanding, cfg.levels, 'MID', cfg.width);
  }

  // -----------------------------------------------------------------------
  // Floor Landings (Structural.txt rows 32–39) — one at top of each ascent.
  // Total floor landings = levels.
  // -----------------------------------------------------------------------
  pushLandingItems(items, cfg.floorLanding, cfg.levels, 'FLR', cfg.width);

  // -----------------------------------------------------------------------
  // Columns (Structural.txt rows 42–44) — 4 HSS columns per landing type per
  // ascent, length = floor-to-floor height.
  // -----------------------------------------------------------------------
  const FtF = cfg.floorToFloorHeight;
  if (cfg.hasMidLanding && cfg.midLanding) {
    const colQty = 4 * cfg.levels;
    items.push(makeItem({
      id: 'ST-MC', category: COLS, description: 'Columns Middle Landing',
      group: 'HSS', material: 'HSS 4 X 4 X 3/16GA',
      qty: colQty, length: FtF, lnFeetToFab: colQty * FtF,
      commLength: 20, measure: 'Pound/ft', costPerUnit: PIPES_COST,
      weightPerFt: HSS4X4_LB_FT,
    }));
  }
  const flrColQty = 4 * cfg.levels;
  items.push(makeItem({
    id: 'ST-FC', category: COLS, description: 'Columns Floor Landing',
    group: 'HSS', material: 'HSS 4 X 4 X 3/16GA',
    qty: flrColQty, length: FtF, lnFeetToFab: flrColQty * FtF,
    commLength: 20, measure: 'Pound/ft', costPerUnit: PIPES_COST,
    weightPerFt: HSS4X4_LB_FT,
  }));

  return items;
}

/**
 * Push a complete landing's worth of BOM rows (channels, support beam, angles,
 * guard rail, supports, deck) into the items array. Used for both mid and
 * floor landings. Workbook reference: Structural.txt rows 22–39.
 */
function pushLandingItems(
  items: StairComponentItem[],
  landing: StairLanding,
  nLandings: number,
  kind: 'MID' | 'FLR',
  stairWidth: number,
): void {
  const category: ComponentCategory = kind === 'MID' ? MID_LAND : FLR_LAND;
  const prefix = kind === 'MID' ? 'ML' : 'FL';
  const labelPrefix = kind === 'MID' ? 'Middle Landing' : 'Floor Landing';
  const L = landing.length;
  const Wl = landing.width;

  // ML/FL Square (C 9 X 13.4): 3 channels per landing (2 long + 1 short).
  // Workbook: qty=9, length=27 (=10.5+10.5+6) for floor; length=25.667 for mid.
  const squareLen = 2 * Wl + L;
  const squareQty = 3 * nLandings;
  items.push(makeItem({
    id: `ST-${prefix}1`, category, description: `${labelPrefix} Square`,
    group: 'CHANNELS', material: 'C 9 X 13.4',
    qty: squareQty, length: squareLen, lnFeetToFab: squareQty * squareLen,
    commLength: 20, measure: 'Pound/ft', costPerUnit: BEAMS_COST,
    weightPerFt: C9X13_4_LB_FT,
  }));

  // ML/FL Support (W 8x31): 1 beam per landing.
  //   Mid landing → spans stair direction (length = stair width).
  //   Floor landing → spans floor direction (length = landing length).
  // Workbook: mid row 24 length=5 (=stairWidth), floor row 34 length=6 (=floorLanding.length).
  const supLen = kind === 'MID' ? stairWidth : L;
  const supQty = nLandings;
  items.push(makeItem({
    id: `ST-${prefix}2`, category, description: `${labelPrefix} Support`,
    group: 'BEAMS', material: 'W x 8 x 31',
    qty: supQty, length: supLen, lnFeetToFab: supQty * supLen,
    commLength: 20, measure: 'Pound/ft', costPerUnit: BEAMS_COST,
    weightPerFt: W8X31_LB_FT,
  }));

  // ML/FL Angles (L 3x3x1/4): 7 angles per landing, length = landing length.
  const angQty = 7 * nLandings;
  items.push(makeItem({
    id: `ST-${prefix}3`, category, description: `${labelPrefix} Angles`,
    group: 'ANGLES', material: 'L 3 x 3 x 1/4',
    qty: angQty, length: L, lnFeetToFab: angQty * L,
    commLength: 20, measure: 'Pound/ft', costPerUnit: ANGLES_COST,
    weightPerFt: L3X3X025_LB_FT,
  }));

  // ML/FL Guard Rail: one continuous pipe per landing, length = enabled-edge perimeter.
  const railLen = landingRailPerimeter(landing);
  const railQty = railLen > 0 ? nLandings : 0;
  const railComm = kind === 'FLR' ? 24 : 20;
  items.push(makeItem({
    id: `ST-${prefix}4`, category, description: `${labelPrefix} GuardRail`,
    group: 'PIPES', material: 'Pipe 1 1/2" Diam 40S std',
    qty: railQty, length: railLen, lnFeetToFab: railQty * railLen,
    commLength: railComm, measure: 'Pound/ft', costPerUnit: PIPES_COST,
    weightPerFt: PIPE_1_5_LB_FT,
  }));

  // ML/FL Guard Rail Supports: spaced every ~4 ft of rail. Length 4.5 ft.
  // Workbook canonical: mid 15 (5/landing × 3), floor 18 (6/landing × 3).
  const supportsPerLanding = railLen > 0 ? Math.ceil(railLen / 4) : 0;
  const supportsQty = supportsPerLanding * nLandings;
  items.push(makeItem({
    id: `ST-${prefix}5`, category, description: `${labelPrefix} GuardRail Supports`,
    group: 'PIPES', material: 'Pipe 1 1/2" Diam 40S std',
    qty: supportsQty, length: 4.5, lnFeetToFab: supportsQty * 4.5,
    commLength: 20, measure: 'Pound/ft', costPerUnit: PIPES_COST,
    weightPerFt: PIPE_1_5_LB_FT,
  }));

  // ML/FL Floor Decking (20 ga): workbook ships 2 panels of length=10.5 per
  // landing regardless of landing length (qty=6 for both mid and floor with
  // nLandings=3). LnFt-priced, so cost = lnFeetToFab × $11.0726.
  const deckPanelLen = Wl;
  const deckQty = 2 * nLandings;
  const deckFab = deckQty * deckPanelLen;
  const deckLnF = commercialLnF(deckFab, 24);
  items.push({
    id: `ST-${prefix}6`, category, description: `${labelPrefix} Floor Decking`,
    qty: deckQty, length: deckPanelLen, lnFeetToFab: deckFab, enabled: deckQty > 0,
    group: 'SHEETING', material: 'Deck panel 20 Ga',
    commLength: 24, measure: 'Ln Ft', costPerUnit: SHEETING_COST,
    weight: deckLnF * DECK_PANEL_LB_FT, lnF: deckLnF,
  });
}

/** Direct material cost for one BOM row — mirrors workbook col [20]. */
function rowDirectCost(it: StairComponentItem): number {
  if (it.measure === 'pc') return it.qty * it.costPerUnit;
  if (it.measure === 'LnFt' || it.measure === 'Ln Ft') return it.lnF * it.costPerUnit;
  // Pound/ft → cost = weight × $/lb
  return it.weight * it.costPerUnit;
}

/**
 * Compute the stair cost stack from a BOM + overrides.
 *
 * Workbook reference (Structural.txt rows 48–62):
 *   Direct Materials = $26,174.05
 *   Labor (0.6 × 22,571.336 lb) = $13,542.80
 *   + Detailing 1500 + Hauling 980 + Freight 1150 + Overhead 0.03×subtotal_so_far
 *   = Sub Total $44,647.26 → +10% Profit ($4,464.73) +4% Commission ($1,785.89)
 *   = Grand Total $50,897.88
 */
export function computeStairCost(
  cfg: StairConfig,
  overrides: StairCostOverrides = {},
): StairCostBreakdown {
  const items = computeStairBom(cfg);

  const laborRate = overrides.laborRate ?? 0.60;
  const detailing = overrides.detailing ?? 1500;
  const loadingHauling = overrides.loadingHauling ?? 980;
  const freight = overrides.freight ?? 1150;
  const overheadRate = overrides.overheadRate ?? 0.03;
  const profitRate = overrides.profitRate ?? 0.10; // stairs = 10% (issue #5 AC #6)
  const commissionRate = overrides.commissionRate ?? 0.04;

  const directCost = items.reduce((s, it) => s + rowDirectCost(it), 0);
  const weight = items.reduce((s, it) => s + it.weight, 0);
  const labor = weight * laborRate;

  // Workbook overhead = overheadRate × (directCost + labor + detailing
  //                     + loadingHauling + freight) — bedded into row 55.
  const beforeOverhead = directCost + labor + detailing + loadingHauling + freight;
  const overhead = overheadRate * beforeOverhead;
  const subTotal = beforeOverhead + overhead;

  const profit = profitRate * subTotal;
  const commission = commissionRate * subTotal;
  const grandTotal = subTotal + profit + commission;

  return {
    directCost,
    weight,
    labor,
    detailing,
    loadingHauling,
    freight,
    overheadRate,
    overhead,
    subTotal,
    profitRate,
    profit,
    commissionRate,
    commission,
    grandTotal,
  };
}
