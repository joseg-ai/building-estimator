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
import { calculateCosts, computeInsulationCost } from '../calculator';
import { rValuePriceTable, getRValuePrice, R_VALUE_OPTIONS } from '../priceList';
import { createDefaultConfig } from '../types';
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
const PERIMETER    = 2 * (REF_WIDTH + REF_LENGTH);            // 200 ft
const WALL_SQFT    = PERIMETER * REF_HEIGHT;                  // 3200 sqft
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
  it('wall insulation = perimeter × height when no openings', () => {
    const cfg = refConfig({ wallIns: true, rValue: 'R-13' });
    const cost = computeInsulationCost(cfg);
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
    // 3200 sqft × $0.55 = $1,760 — expect $1,000–$3,000
    expect(cost).toBeGreaterThan(1000);
    expect(cost).toBeLessThan(3000);
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
