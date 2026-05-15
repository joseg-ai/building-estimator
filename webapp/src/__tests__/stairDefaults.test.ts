/**
 * Smoke test — the default stair config persisted by storage.ts must
 * reproduce the workbook canonical totals when fed to the stair engine.
 * If the defaults drift from the canonical reference building, this test
 * fails fast and StructuralPage's first-load preview would no longer match
 * Livingston's golden numbers.
 */

import { describe, it, expect } from 'vitest';
import { createDefaultStairConfig } from '../storage';
import { computeStairBom, computeStairCost } from '../stairEngine';

describe('default stair config (StructuralPage first-load) — workbook canonical', () => {
  const cfg = createDefaultStairConfig();

  it('matches the canonical reference building parameters', () => {
    expect(cfg.levels).toBe(3);
    expect(cfg.floorToFloorHeight).toBe(12.5);
    expect(cfg.width).toBe(5);
    expect(cfg.treadsPerFlight).toEqual([10, 9, 9]);
    expect(cfg.treadRunInches).toBe(11);
    expect(cfg.hasMidLanding).toBe(true);
  });

  it('produces the canonical grand total ($50,897.88) and total weight (22,571.336 lb)', () => {
    const cost = computeStairCost(cfg);
    expect(cost.grandTotal).toBeCloseTo(50897.88, 1);
    expect(cost.weight).toBeCloseTo(22571.336, 2);
    expect(cost.profitRate).toBe(0.10);
  });

  it('returns a non-empty BOM that includes stair, landing, and column rows', () => {
    const bom = computeStairBom(cfg);
    expect(bom.length).toBeGreaterThan(0);
    expect(bom.some((it) => it.id === 'ST-01')).toBe(true); // stringer
    expect(bom.some((it) => it.id.startsWith('ST-ML'))).toBe(true); // mid landing
    expect(bom.some((it) => it.id.startsWith('ST-FL'))).toBe(true); // floor landing
  });
});
