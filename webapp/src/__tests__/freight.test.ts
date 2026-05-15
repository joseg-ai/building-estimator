import { describe, it, expect } from 'vitest';
import { calculateCosts, resolveFreight } from '../calculator';
import { createDefaultConfig } from '../types';
import type { ProjectOverheads } from '../types';

function makeOverheads(overrides: Partial<ProjectOverheads> = {}): ProjectOverheads {
  return {
    laborRate: 0.75,
    detailing: 0,
    engineering: 0,
    loadingHauling: 0,
    freight: 0,
    freightDistance: 0,
    freightRate: 4.6,
    freightAutoCalc: true,
    overheadRate: 0,
    erection: 0,
    foundation: 0,
    permits: 0,
    profitRate: 0,
    commissionRate: 0,
    ...overrides,
  };
}

describe('resolveFreight (#14) — precedence rules', () => {
  it('auto-calc at workbook default: 200 km × 4.6 $/km = 920', () => {
    const f = resolveFreight(makeOverheads({
      freightAutoCalc: true,
      freightDistance: 200,
      freightRate: 4.6,
    }));
    expect(f).toBeCloseTo(920, 6);
  });

  it('manual override: freightAutoCalc=false uses the flat field regardless of distance/rate', () => {
    const f = resolveFreight(makeOverheads({
      freightAutoCalc: false,
      freight: 1500,
      freightDistance: 999,
      freightRate: 99,
    }));
    expect(f).toBe(1500);
  });

  it('zero distance with auto-calc returns 0', () => {
    const f = resolveFreight(makeOverheads({
      freightAutoCalc: true,
      freightDistance: 0,
      freightRate: 4.6,
    }));
    expect(f).toBe(0);
  });

  it('auto wins over flat — flat field ignored when freightAutoCalc=true', () => {
    const f = resolveFreight(makeOverheads({
      freightAutoCalc: true,
      freightDistance: 100,
      freightRate: 4.6,
      freight: 9999,
    }));
    expect(f).toBeCloseTo(460, 6);
  });

  it('negative product is clamped to 0', () => {
    const f = resolveFreight(makeOverheads({
      freightAutoCalc: true,
      freightDistance: -50,
      freightRate: 4.6,
    }));
    expect(f).toBe(0);
  });

  it('backwards-compat: legacy config (no new fields) is treated as flat-freight', () => {
    // Simulate a config loaded from older localStorage that predates Issue #14:
    // no freightDistance / freightRate / freightAutoCalc keys, just `freight`.
    const legacy: ProjectOverheads = {
      laborRate: 0.75,
      detailing: 0,
      engineering: 0,
      loadingHauling: 0,
      freight: 750,
      overheadRate: 0,
      erection: 0,
      foundation: 0,
      permits: 0,
      profitRate: 0,
      commissionRate: 0,
    };
    expect(resolveFreight(legacy)).toBe(750);
  });
});

describe('calculateCosts (#14) — freight integration', () => {
  function baseConfig() {
    const cfg = createDefaultConfig();
    cfg.dimensions.width = 40;
    cfg.dimensions.length = 60;
    cfg.dimensions.roofPitch = 4;
    cfg.components = [];
    cfg.overheads = makeOverheads({
      freightAutoCalc: true,
      freightDistance: 200,
      freightRate: 4.6,
      freight: 9999, // must be ignored under auto-calc
    });
    cfg.salesTaxRate = 0.0825;
    cfg.salesTaxIncluded = true;
    return cfg;
  }

  it('auto-calculated freight (200 × 4.6 = 920) flows into subTotal, grandTotal and tax base', () => {
    const cfg = baseConfig();
    const r = calculateCosts(cfg);

    expect(r.freight).toBeCloseTo(920, 6);

    // No materials/labor/other overheads in this fixture →
    //   subTotal = freight = 920
    //   profit = commission = 0
    //   salesTaxBase = freight + 0 + 0 + ... = 920
    //   salesTax = 920 × 0.0825 = 75.9
    //   grandTotal = 920 + 75.9 = 995.9
    expect(r.subTotal).toBeCloseTo(920, 6);
    expect(r.salesTaxBase).toBeCloseTo(920, 6);
    expect(r.salesTax).toBeCloseTo(75.9, 6);
    expect(r.grandTotal).toBeCloseTo(995.9, 6);
  });

  it('manual override mode honors the flat freight field in grandTotal', () => {
    const cfg = baseConfig();
    cfg.overheads = makeOverheads({
      freightAutoCalc: false,
      freight: 1500,
      freightDistance: 200,  // ignored
      freightRate: 4.6,      // ignored
    });
    cfg.salesTaxIncluded = false;
    const r = calculateCosts(cfg);

    expect(r.freight).toBe(1500);
    expect(r.subTotal).toBeCloseTo(1500, 6);
    expect(r.grandTotal).toBeCloseTo(1500, 6);
  });

  it('createDefaultConfig() ships with workbook defaults: distance=0, rate=4.6, auto=true', () => {
    const cfg = createDefaultConfig();
    expect(cfg.overheads.freightAutoCalc).toBe(true);
    expect(cfg.overheads.freightDistance).toBe(0);
    expect(cfg.overheads.freightRate).toBe(4.6);
    expect(cfg.overheads.freight).toBe(0);
    // Default config with zero distance → auto-calc yields zero freight
    expect(resolveFreight(cfg.overheads)).toBe(0);
  });
});
