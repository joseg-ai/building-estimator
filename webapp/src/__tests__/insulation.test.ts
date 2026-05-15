/**
 * Tests for Issue #10 — Auto-calculated insulation cost
 *
 * Reference building: 40W × 60L × 16H ft, pitch 4:12, gable.
 *
 * Covers:
 *   1. Roof insulation sqft = slope-adjusted rafter area × 2 sides
 *   2. Wall insulation sqft = perimeter × height − openings
 *   3. R-value pricing table completeness
 *   4. Manual override path (any insulation component qty > 0)
 *   5. Combined roof + wall auto-calc
 *   6. computeInsulationCost exported function directly
 */

import { describe, it, expect } from 'vitest';
import { calculateCosts, computeInsulationCost, computeInsulationBreakdown, getOpeningWallSide, getEffectiveWallSide, avgEndWallHeight } from '../calculator';
import { rValuePriceTable, getRValuePrice, R_VALUE_OPTIONS } from '../priceList';
import { createDefaultConfig, OPENING_DEFAULT_WALL_SIDE } from '../types';
import type { ComponentItem, ComponentCategory, BuildingConfig } from '../types';

// ---- helpers ---------------------------------------------------------------

const REF_WIDTH  = 40;
const REF_LENGTH = 60;
const REF_HEIGHT = 16;
const REF_PITCH  = 4;

function makeComponent(overrides: Partial<ComponentItem> & { category: ComponentCategory }): ComponentItem {
  return {
    id: overrides.id ?? `c-${Math.random().toString(36).slice(2, 9)}`,
    category: overrides.category,
    description: overrides.description ?? 'test',
    qty: overrides.qty ?? 0,
    length: overrides.length ?? 0,
    lnFeetToFab: overrides.lnFeetToFab ?? 0,
    enabled: overrides.enabled ?? true,
    group: overrides.group ?? 'INSULATION',
    material: overrides.material ?? '',
    commLength: overrides.commLength ?? 0,
    measure: overrides.measure ?? 'LnFt',
    costPerUnit: overrides.costPerUnit ?? 0,
    weight: overrides.weight ?? 0,
    lnF: overrides.lnF ?? 0,
  };
}

function refConfig(options: {
  roofIns?: boolean;
  wallIns?: boolean;
  rValue?: 'R-13' | 'R-19' | 'R-25' | 'R-30';
  components?: ComponentItem[];
  doors3070?: number;
  rollUpDoors?: Array<{ qty: number; width: number; height: number }>;
} = {}): BuildingConfig {
  const cfg = createDefaultConfig();
  cfg.dimensions = {
    width: REF_WIDTH, length: REF_LENGTH, eaveHeight: REF_HEIGHT,
    roofPitch: REF_PITCH, baySpacing: 4, girts: 4, purlins: 10,
  };
  cfg.insulation = {
    roof: options.roofIns ?? false,
    wall: options.wallIns ?? false,
    additional: false,
    rValue: options.rValue ?? 'R-13',
  };
  cfg.components = options.components ?? [];
  cfg.overheads = {
    laborRate: 0, detailing: 0, engineering: 0, loadingHauling: 0, freight: 0,
    overheadRate: 0, erection: 0, foundation: 0, permits: 0, profitRate: 0, commissionRate: 0,
  };
  // Apply door overrides
  if (options.doors3070 !== undefined) {
    cfg.doorsWindows.doors3070 = { qty: options.doors3070, includeFrame: false, width: 3, height: 7 };
  }
  if (options.rollUpDoors) {
    cfg.doorsWindows.rollUpDoors = options.rollUpDoors.map((d) => ({ qty: d.qty, includeFrame: false, width: d.width, height: d.height }));
  }
  return cfg;
}

// Pre-computed reference values for 40×60×16, pitch 4:12
const SLOPE_FACTOR = Math.sqrt(1 + (REF_PITCH / 12) ** 2); // ~1.054093
const RAFTER_HALF  = REF_WIDTH / 2;                          // 20 ft
const ROOF_SQFT    = RAFTER_HALF * SLOPE_FACTOR * 2 * REF_LENGTH; // ≈ 2529.82 sqft
// Issue #35: wall sqft is now split — side walls keep eaveHeight, end walls
// use avgEndWallHeight which includes the gable-triangle average.
const SIDE_WALL_SQFT = 2 * REF_LENGTH * REF_HEIGHT;                              // 2×60×16 = 1920
const AVG_END_H      = REF_HEIGHT + (REF_PITCH * REF_WIDTH) / 48;                // 16 + 3.333 = 19.333
const END_WALL_SQFT  = 2 * REF_WIDTH * AVG_END_H;                                // ≈ 1546.67
const WALL_SQFT      = SIDE_WALL_SQFT + END_WALL_SQFT;                           // ≈ 3466.67
const R13_PRICE    = getRValuePrice('R-13');                   // 0.55

// ---- R-value table ---------------------------------------------------------

describe('rValuePriceTable — integrity', () => {
  it('contains all 4 standard R-values', () => {
    expect(R_VALUE_OPTIONS).toEqual(['R-13', 'R-19', 'R-25', 'R-30']);
    expect(rValuePriceTable).toHaveLength(4);
  });

  it('prices are in ascending order with R-value', () => {
    for (let i = 1; i < rValuePriceTable.length; i++) {
      expect(rValuePriceTable[i].pricePerSqft).toBeGreaterThan(rValuePriceTable[i - 1].pricePerSqft);
    }
  });

  it('R-13 is the cheapest', () => {
    const prices = rValuePriceTable.map((r) => r.pricePerSqft);
    expect(Math.min(...prices)).toBe(rValuePriceTable[0].pricePerSqft);
  });

  it('R-30 is the most expensive', () => {
    const prices = rValuePriceTable.map((r) => r.pricePerSqft);
    expect(Math.max(...prices)).toBe(rValuePriceTable[rValuePriceTable.length - 1].pricePerSqft);
  });

  it('getRValuePrice falls back to R-13 for unknown value', () => {
    expect(getRValuePrice('R-99')).toBe(getRValuePrice('R-13'));
    expect(getRValuePrice(undefined)).toBe(getRValuePrice('R-13'));
  });
});

// ---- Roof insulation auto-calc ---------------------------------------------

describe('computeInsulationCost — roof auto-calc (40×60×16 ref building)', () => {
  it('returns 0 when insulation is disabled', () => {
    const cfg = refConfig({ roofIns: false, wallIns: false });
    expect(computeInsulationCost(cfg)).toBe(0);
  });

  it('roof insulation sqft = slope-adjusted rafter area × 2 sides', () => {
    const cfg = refConfig({ roofIns: true, wallIns: false, rValue: 'R-13' });
    const cost = computeInsulationCost(cfg);
    const expected = ROOF_SQFT * R13_PRICE;
    expect(cost).toBeCloseTo(expected, 2);
  });

  it('roof insulation with R-19 is more expensive than R-13', () => {
    const r13 = computeInsulationCost(refConfig({ roofIns: true, rValue: 'R-13' }));
    const r19 = computeInsulationCost(refConfig({ roofIns: true, rValue: 'R-19' }));
    expect(r19).toBeGreaterThan(r13);
  });

  it('roof insulation with R-25 > R-19 > R-13', () => {
    const r13 = computeInsulationCost(refConfig({ roofIns: true, rValue: 'R-13' }));
    const r19 = computeInsulationCost(refConfig({ roofIns: true, rValue: 'R-19' }));
    const r25 = computeInsulationCost(refConfig({ roofIns: true, rValue: 'R-25' }));
    expect(r25).toBeGreaterThan(r19);
    expect(r19).toBeGreaterThan(r13);
  });

  it('reference roof insulation cost is in a defensible $ range (R-13, 40×60)', () => {
    const cfg = refConfig({ roofIns: true, rValue: 'R-13' });
    const cost = computeInsulationCost(cfg);
    // ~2530 sqft × $0.55 ≈ $1,391 — expect $1,000–$2,000
    expect(cost).toBeGreaterThan(1000);
    expect(cost).toBeLessThan(2000);
  });
});

// ---- Wall insulation auto-calc ---------------------------------------------

describe('computeInsulationCost — wall auto-calc (40×60×16 ref building)', () => {
  it('wall insulation = side (perimeter-style) + end (avg-gable-height) when no openings', () => {
    const cfg = refConfig({ wallIns: true, rValue: 'R-13' });
    const cost = computeInsulationCost(cfg);
    // Issue #35: new calc accounts for gable triangle on end walls.
    // First-principles: side=1920, end=2×40×19.333=1546.67 → total=3466.67
    const expected = WALL_SQFT * R13_PRICE;
    expect(cost).toBeCloseTo(expected, 2);
  });

  it('walk doors (3070) are deducted from wall area', () => {
    const noDoors = computeInsulationCost(refConfig({ wallIns: true, rValue: 'R-13' }));
    const withDoors = computeInsulationCost(refConfig({ wallIns: true, rValue: 'R-13', doors3070: 2 }));
    // 2 × 3ft × 7ft = 42 sqft deducted
    const deduction = 2 * 3 * 7 * R13_PRICE;
    expect(noDoors - withDoors).toBeCloseTo(deduction, 2);
  });

  it('roll-up doors deducted from wall area', () => {
    const noDoors = computeInsulationCost(refConfig({ wallIns: true, rValue: 'R-13' }));
    const withRollUp = computeInsulationCost(refConfig({
      wallIns: true, rValue: 'R-13',
      rollUpDoors: [{ qty: 1, width: 12, height: 14 }],
    }));
    const deduction = 1 * 12 * 14 * R13_PRICE;
    expect(noDoors - withRollUp).toBeCloseTo(deduction, 2);
  });

  it('reference wall insulation cost is in a defensible $ range (R-13, no openings)', () => {
    const cfg = refConfig({ wallIns: true, rValue: 'R-13' });
    const cost = computeInsulationCost(cfg);
    // ~3467 sqft × $0.55 ≈ $1,907 — expect $1,000–$3,000
    expect(cost).toBeGreaterThan(1000);
    expect(cost).toBeLessThan(3000);
  });
});

// ---- Issue #35: side vs end wall split -------------------------------------

describe('Issue #35 — wall-side helpers', () => {
  it('getOpeningWallSide: explicit field overrides default', () => {
    expect(getOpeningWallSide({ wallSide: 'end' }, 'side')).toBe('end');
    expect(getOpeningWallSide({ wallSide: 'side' }, 'end')).toBe('side');
  });

  it('getOpeningWallSide: falls back to default when absent (backwards compat)', () => {
    expect(getOpeningWallSide({}, 'side')).toBe('side');
    expect(getOpeningWallSide({}, 'end')).toBe('end');
  });

  it('getEffectiveWallSide: applies PEMB default for each opening type', () => {
    expect(getEffectiveWallSide({}, 'doors3070')).toBe('side');
    expect(getEffectiveWallSide({}, 'doors4070')).toBe('side');
    expect(getEffectiveWallSide({}, 'door6070')).toBe('side');
    expect(getEffectiveWallSide({}, 'window3030')).toBe('side');
    expect(getEffectiveWallSide({}, 'window4030')).toBe('side');
    expect(getEffectiveWallSide({}, 'window6030')).toBe('side');
    expect(getEffectiveWallSide({}, 'window6040')).toBe('side');
    expect(getEffectiveWallSide({}, 'rollUpDoors')).toBe('end');
    expect(getEffectiveWallSide({}, 'frameOpenings')).toBe('end');
  });

  it('getEffectiveWallSide: explicit override beats PEMB default', () => {
    expect(getEffectiveWallSide({ wallSide: 'end' }, 'doors3070')).toBe('end');
    expect(getEffectiveWallSide({ wallSide: 'side' }, 'rollUpDoors')).toBe('side');
  });

  it('OPENING_DEFAULT_WALL_SIDE matches documented PEMB layout', () => {
    expect(OPENING_DEFAULT_WALL_SIDE.doors3070).toBe('side');
    expect(OPENING_DEFAULT_WALL_SIDE.rollUpDoors).toBe('end');
    expect(OPENING_DEFAULT_WALL_SIDE.frameOpenings).toBe('end');
    expect(OPENING_DEFAULT_WALL_SIDE.window6040).toBe('side');
  });
});

describe('Issue #35 — avgEndWallHeight derivation', () => {
  it('gable: eaveHeight + (roofPitch × width) / 48 — 50×100×20 ref @ 4:12', () => {
    // For W=50, eaveH=20, pitch=4 → avg = 20 + (4×50)/48 = 20 + 4.1667 = 24.1667 ft
    expect(avgEndWallHeight(50, 20, 4, 'gable')).toBeCloseTo(20 + (4 * 50) / 48, 6);
  });

  it('gable: 40×16×4 ref → 19.333 ft', () => {
    expect(avgEndWallHeight(40, 16, 4, 'gable')).toBeCloseTo(16 + (4 * 40) / 48, 6);
  });

  it('single-slope: eaveHeight + (roofPitch × width) / 24 (twice the gable rise)', () => {
    // Single-slope rises across full width, not half — average is double the gable
    // triangle contribution.
    const gable = avgEndWallHeight(50, 20, 4, 'gable');
    const mono  = avgEndWallHeight(50, 20, 4, 'single-slope');
    expect(mono - 20).toBeCloseTo(2 * (gable - 20), 6);
  });

  it('flat roof (pitch=0): avg = eaveHeight regardless of roofType', () => {
    expect(avgEndWallHeight(40, 16, 0, 'gable')).toBe(16);
    expect(avgEndWallHeight(40, 16, 0, 'single-slope')).toBe(16);
  });
});

describe('Issue #35 — 50×100×20 gable workbook cross-check', () => {
  // Reference: 50W × 100L × 20H, pitch 4:12, R-13.
  // Derivation from first principles:
  //   slopeFactor = √(1 + (4/12)²) = √(1.1111) ≈ 1.054093
  //   roofSqft    = (50/2) × 1.054093 × 2 × 100 = 5270.46
  //   sideWall    = 2 × 100 × 20 = 4000
  //   avgEndH     = 20 + (4 × 50)/48 = 24.1667
  //   endWall     = 2 × 50 × 24.1667 = 2416.67
  //   wallTotal   = 4000 + 2416.67 = 6416.67
  //   @ $0.55/sqft → roof=$2898.75, side=$2200, end=$1329.17 → total=$6427.92
  //
  // PR #32 audit delta: old combined-perimeter calc gave wall=2(W+L)×H = 6000 sqft
  // (vs new 6416.67) — new calc is +6.94% higher because it now includes the
  // gable triangle area on average. This is the correct geometry and the bug
  // fix called for in issue #35.
  const W = 50, L = 100, H = 20, P = 4;
  const slopeFactor = Math.sqrt(1 + (P / 12) ** 2);
  const expRoofSqft = (W / 2) * slopeFactor * 2 * L;
  const expSideSqft = 2 * L * H;
  const expAvgEndH  = H + (P * W) / 48;
  const expEndSqft  = 2 * W * expAvgEndH;
  const price       = getRValuePrice('R-13');

  function refCfg50x100(overrides?: { doors3070?: number; rollUps?: Array<{ qty: number; width: number; height: number }>; }): BuildingConfig {
    const cfg = createDefaultConfig();
    cfg.dimensions = { width: W, length: L, eaveHeight: H, roofPitch: P, baySpacing: 5, girts: 4, purlins: 10 };
    cfg.insulation = { roof: true, wall: true, additional: false, rValue: 'R-13' };
    cfg.overheads = { ...cfg.overheads, laborRate: 0, detailing: 0, engineering: 0, freightAutoCalc: false, freight: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 };
    if (overrides?.doors3070 !== undefined) {
      cfg.doorsWindows.doors3070 = { qty: overrides.doors3070, includeFrame: false, width: 3, height: 7, wallSide: 'side' };
    }
    if (overrides?.rollUps) {
      cfg.doorsWindows.rollUpDoors = overrides.rollUps.map((d) => ({ qty: d.qty, includeFrame: false, width: d.width, height: d.height, wallSide: 'end' }));
    }
    return cfg;
  }

  it('breakdown: roof, side-wall, end-wall sub-totals match first-principles geometry', () => {
    const b = computeInsulationBreakdown(refCfg50x100());
    expect(b.roof).toBeCloseTo(expRoofSqft * price, 2);
    expect(b.sideWall).toBeCloseTo(expSideSqft * price, 2);
    expect(b.endWall).toBeCloseTo(expEndSqft * price, 2);
    expect(b.total).toBeCloseTo((expRoofSqft + expSideSqft + expEndSqft) * price, 2);
  });

  it('walk door deduction is attributed to side wall by default (PEMB)', () => {
    const base = computeInsulationBreakdown(refCfg50x100());
    const withDoor = computeInsulationBreakdown(refCfg50x100({ doors3070: 2 }));
    const deduction = 2 * 3 * 7 * price;
    expect(base.sideWall - withDoor.sideWall).toBeCloseTo(deduction, 2);
    // End wall sub-total must NOT change.
    expect(withDoor.endWall).toBeCloseTo(base.endWall, 6);
  });

  it('roll-up door deduction is attributed to end wall by default (PEMB)', () => {
    const base = computeInsulationBreakdown(refCfg50x100());
    const withRoll = computeInsulationBreakdown(refCfg50x100({ rollUps: [{ qty: 1, width: 14, height: 16 }] }));
    const deduction = 1 * 14 * 16 * price;
    expect(base.endWall - withRoll.endWall).toBeCloseTo(deduction, 2);
    // Side wall sub-total must NOT change.
    expect(withRoll.sideWall).toBeCloseTo(base.sideWall, 6);
  });

  it('explicit wallSide override moves a walk door to end-wall sub-total', () => {
    const cfg = refCfg50x100();
    cfg.doorsWindows.doors3070 = { qty: 2, includeFrame: false, width: 3, height: 7, wallSide: 'end' };
    const b = computeInsulationBreakdown(cfg);
    const base = computeInsulationBreakdown(refCfg50x100());
    const deduction = 2 * 3 * 7 * price;
    // Side wall unchanged, end wall reduced.
    expect(b.sideWall).toBeCloseTo(base.sideWall, 6);
    expect(base.endWall - b.endWall).toBeCloseTo(deduction, 2);
  });

  it('backwards compat: opening without wallSide field falls through to PEMB default', () => {
    const cfg = refCfg50x100();
    // Simulate legacy localStorage: strip wallSide from every entry.
    const strip = (e: { wallSide?: 'side' | 'end' }) => { delete (e as { wallSide?: 'side' | 'end' }).wallSide; };
    strip(cfg.doorsWindows.doors3070);
    strip(cfg.doorsWindows.doors4070);
    strip(cfg.doorsWindows.door6070);
    cfg.doorsWindows.rollUpDoors.forEach(strip);
    cfg.doorsWindows.frameOpenings.forEach(strip);
    strip(cfg.doorsWindows.window3030);
    strip(cfg.doorsWindows.window4030);
    strip(cfg.doorsWindows.window6030);
    strip(cfg.doorsWindows.window6040);
    // Add a walk door (no wallSide). PEMB default → side wall.
    cfg.doorsWindows.doors3070 = { qty: 2, includeFrame: false, width: 3, height: 7 };
    const b = computeInsulationBreakdown(cfg);
    const base = computeInsulationBreakdown(refCfg50x100());
    const deduction = 2 * 3 * 7 * price;
    expect(base.sideWall - b.sideWall).toBeCloseTo(deduction, 2);
    expect(b.endWall).toBeCloseTo(base.endWall, 6);
  });

  it('zero-clamp: oversized end-wall openings clamp end sub-total to 0, side unaffected', () => {
    const cfg = refCfg50x100();
    // Pile a massive roll-up onto end wall: way more sqft than 2×50×24.17 ≈ 2417.
    cfg.doorsWindows.rollUpDoors = [{ qty: 1, width: 60, height: 60, wallSide: 'end' }];
    const b = computeInsulationBreakdown(cfg);
    expect(b.endWall).toBe(0);
    // Side wall sub-total still equals 2×L×H × price.
    expect(b.sideWall).toBeCloseTo(expSideSqft * price, 2);
  });

  it('insulation.wall === false suppresses BOTH side and end (does not leak gable triangle)', () => {
    const cfg = refCfg50x100();
    cfg.insulation.wall = false;
    const b = computeInsulationBreakdown(cfg);
    expect(b.sideWall).toBe(0);
    expect(b.endWall).toBe(0);
    // Roof is still on.
    expect(b.roof).toBeCloseTo(expRoofSqft * price, 2);
    expect(b.total).toBeCloseTo(b.roof, 6);
  });

  it('computeInsulationCost.total === sum of breakdown components', () => {
    const cfg = refCfg50x100({ doors3070: 1, rollUps: [{ qty: 1, width: 12, height: 14 }] });
    const b = computeInsulationBreakdown(cfg);
    const total = computeInsulationCost(cfg);
    expect(total).toBeCloseTo(b.roof + b.sideWall + b.endWall, 6);
    expect(total).toBeCloseTo(b.total, 6);
  });

  it('manual override path: breakdown roof/side/end all 0, total = simple sum', () => {
    const cfg = refCfg50x100();
    cfg.components = [{
      id: 'm1', category: 'insulation', description: '', qty: 100, length: 0, lnFeetToFab: 0,
      enabled: true, group: 'INSULATION', material: '', commLength: 0, measure: 'sqft',
      costPerUnit: 2.5, weight: 0, lnF: 0,
    }];
    const b = computeInsulationBreakdown(cfg);
    expect(b.roof).toBe(0);
    expect(b.sideWall).toBe(0);
    expect(b.endWall).toBe(0);
    expect(b.total).toBe(250);
  });
});

// ---- Combined roof + wall auto-calc ----------------------------------------

describe('computeInsulationCost — combined roof + wall', () => {
  it('combined cost = roof cost + wall cost (ref building, no openings)', () => {
    const roofOnly  = computeInsulationCost(refConfig({ roofIns: true,  wallIns: false, rValue: 'R-13' }));
    const wallOnly  = computeInsulationCost(refConfig({ roofIns: false, wallIns: true,  rValue: 'R-13' }));
    const combined  = computeInsulationCost(refConfig({ roofIns: true,  wallIns: true,  rValue: 'R-13' }));
    expect(combined).toBeCloseTo(roofOnly + wallOnly, 6);
  });
});

// ---- Manual override path --------------------------------------------------

describe('computeInsulationCost — manual override', () => {
  it('uses stored qty×costPerUnit when any insulation component has qty > 0', () => {
    const manualQty = 50;
    const manualPrice = 10;
    const cfg = refConfig({
      roofIns: true, wallIns: true, rValue: 'R-13',
      components: [
        makeComponent({ category: 'insulation', qty: manualQty, costPerUnit: manualPrice }),
      ],
    });
    const cost = computeInsulationCost(cfg);
    expect(cost).toBe(manualQty * manualPrice); // NOT auto-calc
  });

  it('uses auto-calc when all insulation components have qty = 0', () => {
    const cfg = refConfig({
      roofIns: true, wallIns: false, rValue: 'R-13',
      components: [
        makeComponent({ category: 'insulation', qty: 0, costPerUnit: 99 }),
      ],
    });
    const autoCost = computeInsulationCost(refConfig({ roofIns: true, wallIns: false, rValue: 'R-13' }));
    const withZeroComponents = computeInsulationCost(cfg);
    expect(withZeroComponents).toBeCloseTo(autoCost, 6);
  });
});

// ---- Integration: insulationTotal flows through calculateCosts -------------

describe('calculateCosts — insulation integration', () => {
  it('insulationTotal from calculateCosts matches computeInsulationCost', () => {
    const cfg = refConfig({ roofIns: true, wallIns: true, rValue: 'R-19' });
    const r = calculateCosts(cfg);
    expect(r.insulationTotal).toBeCloseTo(computeInsulationCost(cfg), 6);
  });

  it('insulation cost flows into directMaterials and grandTotal', () => {
    const noIns = refConfig({ roofIns: false, wallIns: false });
    const withIns = refConfig({ roofIns: true, wallIns: true, rValue: 'R-13' });
    const r0 = calculateCosts(noIns);
    const r1 = calculateCosts(withIns);
    expect(r1.insulationTotal).toBeGreaterThan(0);
    expect(r1.directMaterials).toBeGreaterThan(r0.directMaterials);
    expect(r1.grandTotal).toBeGreaterThan(r0.grandTotal);
  });
});
