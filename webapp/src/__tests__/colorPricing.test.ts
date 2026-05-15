/**
 * Tests for Issue #8 — Color → Panel SKU pricing
 *
 * Covers:
 *   1. Color price lookup functions (getPanelUnitPrice, getTrimUnitPrice)
 *   2. PEMB_PANEL_COLORS completeness
 *   3. Calculator picks up color-adjusted pricing for sheeting and trim
 *   4. Unknown/blank color falls back to Galvalume baseline
 */

import { describe, it, expect } from 'vitest';
import {
  colorPriceTable,
  PEMB_PANEL_COLORS,
  getPanelUnitPrice,
  getTrimUnitPrice,
} from '../priceList';
import { calculateCosts } from '../calculator';
import { createDefaultConfig } from '../types';
import type { ComponentItem, ComponentCategory, BuildingConfig, ProjectOverheads } from '../types';

// ---- helpers ---------------------------------------------------------------

function makeComponent(overrides: Partial<ComponentItem> & { category: ComponentCategory }): ComponentItem {
  return {
    id: overrides.id ?? `c-${Math.random().toString(36).slice(2, 9)}`,
    category: overrides.category,
    description: overrides.description ?? 'test',
    qty: overrides.qty ?? 0,
    length: overrides.length ?? 0,
    lnFeetToFab: overrides.lnFeetToFab ?? 0,
    enabled: overrides.enabled ?? true,
    group: overrides.group ?? 'SHEETING',
    material: overrides.material ?? '',
    commLength: overrides.commLength ?? 0,
    measure: overrides.measure ?? 'Ln Ft',
    costPerUnit: overrides.costPerUnit ?? 0,
    weight: overrides.weight ?? 0,
    lnF: overrides.lnF ?? 0,
  };
}

function zeroCostConfig(components: ComponentItem[], overrides: Partial<ProjectOverheads> = {}): BuildingConfig {
  const cfg = createDefaultConfig();
  cfg.dimensions = { width: 40, length: 60, eaveHeight: 16, roofPitch: 4, baySpacing: 4, girts: 4, purlins: 10 };
  cfg.components = components;
  cfg.overheads = {
    laborRate: 0, detailing: 0, engineering: 0, loadingHauling: 0, freight: 0,
    overheadRate: 0, erection: 0, foundation: 0, permits: 0, profitRate: 0, commissionRate: 0,
    ...overrides,
  };
  return cfg;
}

// ---- Color table integrity -------------------------------------------------

describe('colorPriceTable — integrity', () => {
  it('has exactly 12 color entries', () => {
    expect(colorPriceTable).toHaveLength(12);
  });

  it('first entry is Galvalume (cheapest baseline)', () => {
    expect(colorPriceTable[0].color).toBe('Galvalume');
  });

  it('Galvalume has the lowest roof panel price', () => {
    const galvalumePrice = colorPriceTable[0].roofPanelPricePerLF;
    for (const entry of colorPriceTable.slice(1)) {
      expect(entry.roofPanelPricePerLF).toBeGreaterThan(galvalumePrice);
    }
  });

  it('all required PEMB colors are present', () => {
    const required = [
      'Galvalume', 'Polar White', 'Light Stone', 'Saddle Tan', 'Burnished Slate',
      'Hawaiian Blue', 'Brite Red', 'Forest Green', 'Charcoal Gray', 'Snow White',
      'Ash Gray', 'Koko Brown',
    ];
    for (const color of required) {
      expect(PEMB_PANEL_COLORS).toContain(color);
    }
  });

  it('PEMB_PANEL_COLORS matches colorPriceTable order', () => {
    expect(PEMB_PANEL_COLORS).toEqual(colorPriceTable.map((c) => c.color));
  });
});

// ---- getPanelUnitPrice -------------------------------------------------------

describe('getPanelUnitPrice', () => {
  it('returns Galvalume price for Galvalume color (roof)', () => {
    expect(getPanelUnitPrice('Galvalume', 'roof')).toBeCloseTo(3.2783, 4);
  });

  it('returns Galvalume wall price for Galvalume color (wall)', () => {
    expect(getPanelUnitPrice('Galvalume', 'wall')).toBeCloseTo(3.0082, 4);
  });

  it('returns SMP color price for Polar White (roof)', () => {
    expect(getPanelUnitPrice('Polar White', 'roof')).toBeCloseTo(4.0843, 4);
  });

  it('falls back to Galvalume when color is unknown (roof)', () => {
    expect(getPanelUnitPrice('Unknown Color', 'roof')).toBeCloseTo(3.2783, 4);
  });

  it('falls back to Galvalume wall price when color is blank (wall)', () => {
    expect(getPanelUnitPrice('', 'wall')).toBeCloseTo(3.0082, 4);
  });

  it('SMP roof price is ~24–26% above Galvalume', () => {
    const galv = getPanelUnitPrice('Galvalume', 'roof');
    const color = getPanelUnitPrice('Forest Green', 'roof');
    const markupPct = (color - galv) / galv;
    expect(markupPct).toBeGreaterThan(0.20);
    expect(markupPct).toBeLessThan(0.30);
  });
});

// ---- getTrimUnitPrice -------------------------------------------------------

describe('getTrimUnitPrice', () => {
  it('returns Galvalume trim price for Galvalume', () => {
    expect(getTrimUnitPrice('Galvalume')).toBeCloseTo(4.60, 4);
  });

  it('returns SMP trim price for Polar White', () => {
    expect(getTrimUnitPrice('Polar White')).toBeCloseTo(5.4699, 4);
  });

  it('falls back to Galvalume trim price for unknown color', () => {
    expect(getTrimUnitPrice('Not A Color')).toBeCloseTo(4.60, 4);
  });

  it('SMP trim price is higher than Galvalume baseline', () => {
    expect(getTrimUnitPrice('Burnished Slate')).toBeGreaterThan(getTrimUnitPrice('Galvalume'));
  });
});

// ---- Calculator color integration ------------------------------------------

describe('calculateCosts — color-adjusted sheeting cost (Issue #8)', () => {
  it('Galvalume roof panel: calculator uses Galvalume price', () => {
    const cfg = zeroCostConfig([
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', description: 'Roof Panels', qty: 100, costPerUnit: 99 }),
    ]);
    cfg.roofColor = 'Galvalume';
    const r = calculateCosts(cfg);
    // 100 qty × $3.2783 = $327.83
    expect(r.sheetingCost).toBeCloseTo(100 * 3.2783, 4);
  });

  it('Polar White roof panel: calculator uses SMP color price', () => {
    const cfg = zeroCostConfig([
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', description: 'Roof Panels', qty: 100, costPerUnit: 99 }),
    ]);
    cfg.roofColor = 'Polar White';
    const r = calculateCosts(cfg);
    expect(r.sheetingCost).toBeCloseTo(100 * 4.0843, 4);
  });

  it('wall panel cost uses wallColor independently of roofColor', () => {
    const cfg = zeroCostConfig([
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', description: 'Side Walls', qty: 200, costPerUnit: 99 }),
    ]);
    cfg.roofColor = 'Galvalume';
    cfg.wallColor = 'Burnished Slate';
    const r = calculateCosts(cfg);
    // wallColor = Burnished Slate → SMP price $4.0843
    expect(r.sheetingCost).toBeCloseTo(200 * 4.0843, 4);
  });

  it('unknown roofColor falls back to Galvalume panel price', () => {
    const cfg = zeroCostConfig([
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', description: 'Roof Panels', qty: 50, costPerUnit: 99 }),
    ]);
    cfg.roofColor = '';
    const r = calculateCosts(cfg);
    expect(r.sheetingCost).toBeCloseTo(50 * 3.2783, 4);
  });

  it('ridge caps keep stored costPerUnit (no color adjustment)', () => {
    const storedPrice = 4.257;
    const cfg = zeroCostConfig([
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', description: 'Ridge Caps', qty: 10, costPerUnit: storedPrice }),
    ]);
    cfg.roofColor = 'Hawaiian Blue';
    const r = calculateCosts(cfg);
    expect(r.sheetingCost).toBeCloseTo(10 * storedPrice, 4);
  });

  it('soffit keeps stored costPerUnit (no color adjustment)', () => {
    const storedPrice = 11.073;
    const cfg = zeroCostConfig([
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', description: 'Lean-to Soffit', qty: 5, costPerUnit: storedPrice }),
    ]);
    cfg.roofColor = 'Brite Red';
    const r = calculateCosts(cfg);
    expect(r.sheetingCost).toBeCloseTo(5 * storedPrice, 4);
  });

  it('linear-foot trim uses trimColor price', () => {
    const cfg = zeroCostConfig([
      makeComponent({ category: 'roof-trim', group: 'ROOF TRIM', description: 'Rake Trim', qty: 80, measure: 'Ln Ft', costPerUnit: 99 }),
    ]);
    cfg.trimColor = 'Polar White';
    const r = calculateCosts(cfg);
    expect(r.roofWallTrimCost).toBeCloseTo(80 * 5.4699, 4);
  });

  it('trim color markup flows into grandTotal', () => {
    const galvCfg = zeroCostConfig([
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', description: 'Roof Panels', qty: 100, costPerUnit: 0 }),
    ]);
    galvCfg.roofColor = 'Galvalume';

    const colorCfg = zeroCostConfig([
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', description: 'Roof Panels', qty: 100, costPerUnit: 0 }),
    ]);
    colorCfg.roofColor = 'Forest Green';

    const galvTotal = calculateCosts(galvCfg).grandTotal;
    const colorTotal = calculateCosts(colorCfg).grandTotal;
    expect(colorTotal).toBeGreaterThan(galvTotal);
  });
});
