import { describe, it, expect } from 'vitest';
import { calculateCosts, formatUSD } from '../calculator';
import { createDefaultConfig } from '../types';
import type {
  BuildingConfig,
  ComponentItem,
  ComponentCategory,
  ProjectOverheads,
} from '../types';

/** Build a minimal component with sensible defaults; override what the test cares about. */
function makeComponent(overrides: Partial<ComponentItem> & { category: ComponentCategory }): ComponentItem {
  return {
    id: overrides.id ?? `c-${Math.random().toString(36).slice(2, 9)}`,
    category: overrides.category,
    description: overrides.description ?? 'test component',
    qty: overrides.qty ?? 0,
    length: overrides.length ?? 0,
    lnFeetToFab: overrides.lnFeetToFab ?? 0,
    enabled: overrides.enabled ?? true,
    group: overrides.group ?? 'BEAMS',
    material: overrides.material ?? '',
    commLength: overrides.commLength ?? 0,
    measure: overrides.measure ?? 'Ea',
    costPerUnit: overrides.costPerUnit ?? 0,
    weight: overrides.weight ?? 0,
    lnF: overrides.lnF ?? 0,
  };
}

function makeOverheads(overrides: Partial<ProjectOverheads> = {}): ProjectOverheads {
  return {
    laborRate: 0.75,
    detailing: 5000,
    engineering: 1500,
    loadingHauling: 0,
    freight: 0,
    overheadRate: 0.02,
    erection: 0,
    foundation: 0,
    permits: 0,
    profitRate: 0.15,
    commissionRate: 0.04,
    ...overrides,
  };
}

function makeConfig(components: ComponentItem[], overheads: Partial<ProjectOverheads> = {}): BuildingConfig {
  const cfg = createDefaultConfig();
  cfg.dimensions.width = 40;
  cfg.dimensions.length = 60;
  cfg.dimensions.roofPitch = 4;
  cfg.components = components;
  cfg.overheads = makeOverheads(overheads);
  return cfg;
}

describe('calculateCosts — sanity-check building', () => {
  it('computes a tiny end-to-end building from the Excel formula', () => {
    // Direct Materials = 10000 (structural) + 2000 (purlins/girts simple sum) + 500 (insulation) = 12500
    // Labor = 1000 lb BEAMS * 0.75 = 750
    //   (purlins-girts is cold-formed → excluded from labor base per bug #1 fix)
    // Materials+Labor = 13250
    // Overhead = 13250 * 0.02 = 265.00
    // SubTotal = 13250 + 265.00 + 5000 + 1500 = 20015.00
    // Profit = 20015.00 * 0.15 = 3002.25
    // Commission = 20015.00 * 0.04 = 800.60
    // Grand Total = 23817.85
    const components: ComponentItem[] = [
      makeComponent({ category: 'main-framing', group: 'BEAMS', measure: 'Pound/ft', weight: 1000, costPerUnit: 10 }),
      makeComponent({ category: 'purlins-girts', group: 'COLD FORM', qty: 100, costPerUnit: 20, weight: 500 }),
      makeComponent({ category: 'insulation', qty: 50, costPerUnit: 10 }),
    ];
    const cfg = makeConfig(components);
    const r = calculateCosts(cfg);

    expect(r.structuralTotal).toBe(10000);
    expect(r.structuralWeight).toBe(1000);
    expect(r.laborBaseWeight).toBe(1000);
    expect(r.purlinsGirtsCost).toBe(2000);
    expect(r.componentsTotal).toBe(2000);
    expect(r.componentsWeight).toBe(500);
    expect(r.insulationTotal).toBe(500);
    expect(r.directMaterials).toBe(12500);
    expect(r.labor).toBe(750);
    expect(r.totalMaterialsLabor).toBe(13250);
    expect(r.overheadCost).toBeCloseTo(265.0, 6);
    expect(r.subTotal).toBeCloseTo(20015.0, 6);
    expect(r.profit).toBeCloseTo(3002.25, 6);
    expect(r.commission).toBeCloseTo(800.6, 6);
    expect(r.grandTotal).toBeCloseTo(23817.85, 6);
  });

  it('computes building area and roof area from dimensions', () => {
    const cfg = makeConfig([]);
    cfg.dimensions.width = 40;
    cfg.dimensions.length = 60;
    cfg.dimensions.roofPitch = 4;
    const r = calculateCosts(cfg);
    expect(r.mainBuildingArea).toBe(2400);
    expect(r.roofArea).toBeCloseTo(2529.822, 2);
  });
});

describe('Bug #1 — labor base restricted to in-house-fabricated structural steel', () => {
  it('cold-formed-only building incurs ZERO fabrication labor', () => {
    // Two cold-form members totaling 800 lb. None of them are in-house fabricated,
    // so labor must be $0 even though they sit in a "structural" category.
    const components: ComponentItem[] = [
      makeComponent({ category: 'main-framing', group: 'COLD FORM', measure: 'Ln Ft', weight: 300, qty: 4, length: 24, lnF: 96, costPerUnit: 0.85 }),
      makeComponent({ category: 'frame-openings', group: 'COLD FORM', measure: 'Ln Ft', weight: 500, qty: 2, length: 17, lnF: 34, costPerUnit: 0.85 }),
    ];
    const cfg = makeConfig(components, { laborRate: 0.75, detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.laborBaseWeight).toBe(0);
    expect(r.labor).toBe(0);
  });

  it('only BEAMS/CHANNELS/FLAT BARS/ANGLES/PIPES/HSS contribute to labor base', () => {
    const components: ComponentItem[] = [
      makeComponent({ category: 'main-framing',   group: 'BEAMS',     measure: 'Pound/ft', weight: 1000, costPerUnit: 1 }),
      makeComponent({ category: 'canopy',         group: 'HSS',       measure: 'Pound/ft', weight: 200,  costPerUnit: 1 }),
      makeComponent({ category: 'plates',         group: 'FLAT BARS', measure: 'Pound/ft', weight: 150,  costPerUnit: 1 }),
      makeComponent({ category: 'main-framing',   group: 'PIPES',     measure: 'Pound/ft', weight: 80,   costPerUnit: 1 }),
      // Cold-form line in a structural category → excluded
      makeComponent({ category: 'frame-openings', group: 'COLD FORM', measure: 'Ln Ft',    weight: 999,  lnF: 50, costPerUnit: 0.85 }),
      // Sheeting in a components category → excluded regardless
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', weight: 700, qty: 100, costPerUnit: 1 }),
    ];
    const cfg = makeConfig(components, { laborRate: 1, detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 });
    const r = calculateCosts(cfg);
    // 1000 (BEAMS) + 200 (HSS) + 150 (FLAT BARS) + 80 (PIPES) = 1430
    expect(r.laborBaseWeight).toBe(1430);
    expect(r.labor).toBe(1430);
  });

  it('component (purlins/girts/sheeting/trim) weight does NOT flow into labor', () => {
    // Regression for the original bug: labor was (structuralWeight + componentsWeight) * rate.
    const components: ComponentItem[] = [
      makeComponent({ category: 'main-framing',    group: 'BEAMS',     measure: 'Pound/ft', weight: 1000, costPerUnit: 1 }),
      makeComponent({ category: 'purlins-girts',   group: 'COLD FORM', qty: 10, costPerUnit: 1, weight: 5000 }),
      makeComponent({ category: 'roof-wall-sheeting', group: 'SHEETING', qty: 1, costPerUnit: 1, weight: 2000 }),
      makeComponent({ category: 'roof-trim',       group: 'ROOF TRIM', qty: 1, costPerUnit: 1, weight: 300 }),
    ];
    const cfg = makeConfig(components, { laborRate: 0.75, detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.componentsWeight).toBe(7300);
    expect(r.laborBaseWeight).toBe(1000);
    expect(r.labor).toBe(750); // NOT (1000 + 7300) * 0.75 = 6225
  });
});

describe('Bug #2 — frame opening cost dispatches on measure field', () => {
  it('Ln Ft-priced frame openings with weight=0 produce nonzero cost', () => {
    // Real catalog row: FO-01 Cee 8x2½x14 priced at $0.85/LnFt, default length 17 ft.
    // qty=2 openings × 17 ft = 34 LnFt × $0.85 = $28.90. Old code: weight×cost = $0.
    const components: ComponentItem[] = [
      makeComponent({
        category: 'frame-openings', group: 'COLD FORM', measure: 'Ln Ft',
        qty: 2, length: 17, lnF: 34, weight: 0, costPerUnit: 0.85,
      }),
    ];
    const cfg = makeConfig(components, { laborRate: 0, detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.framesCost).toBeCloseTo(28.9, 6);
    expect(r.structuralTotal).toBeCloseTo(28.9, 6);
    expect(r.grandTotal).toBeCloseTo(28.9, 6);
  });

  it('falls back to qty × length when lnF is not pre-computed', () => {
    const components: ComponentItem[] = [
      makeComponent({
        category: 'frame-openings', group: 'COLD FORM', measure: 'Ln Ft',
        qty: 3, length: 20, lnF: 0, weight: 0, costPerUnit: 1.0,
      }),
    ];
    const cfg = makeConfig(components, { laborRate: 0, detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.framesCost).toBeCloseTo(60, 6); // 3 × 20 × $1
  });

  it('Pound/ft-priced frame openings still use weight × cost', () => {
    // A future steel-jamb row in frame-openings priced per pound.
    const components: ComponentItem[] = [
      makeComponent({
        category: 'frame-openings', group: 'BEAMS', measure: 'Pound/ft',
        weight: 500, costPerUnit: 0.9,
      }),
    ];
    const cfg = makeConfig(components, { laborRate: 0, detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.framesCost).toBeCloseTo(450, 6);
  });

  it('mixed frame-opening rows (Ln Ft + Pound/ft) sum correctly', () => {
    const components: ComponentItem[] = [
      makeComponent({ category: 'frame-openings', group: 'COLD FORM', measure: 'Ln Ft',    qty: 1, length: 10, lnF: 10, costPerUnit: 0.85 }),
      makeComponent({ category: 'frame-openings', group: 'BEAMS',     measure: 'Pound/ft', weight: 100, costPerUnit: 0.9 }),
    ];
    const cfg = makeConfig(components, { laborRate: 0, detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.framesCost).toBeCloseTo(8.5 + 90, 6);
  });

  it('other structural categories (main-framing, canopy, plates) still use weight × cost', () => {
    // Regression guard: bug #2 fix must not change cost method for non-frame-opening categories.
    const components: ComponentItem[] = [
      makeComponent({ category: 'main-framing', group: 'BEAMS',     measure: 'Pound/ft', weight: 1000, costPerUnit: 1 }),
      makeComponent({ category: 'canopy',       group: 'BEAMS',     measure: 'Pound/ft', weight: 200,  costPerUnit: 1 }),
      makeComponent({ category: 'plates',       group: 'FLAT BARS', measure: 'Pound/ft', weight: 50,   costPerUnit: 0.8 }),
    ];
    const cfg = makeConfig(components, { laborRate: 0, detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.beamsCost).toBe(1000);
    expect(r.canopyCost).toBe(200);
    expect(r.platesCost).toBe(40);
  });
});

describe('calculateCosts — edge cases', () => {
  it('handles a fully empty building (no components, no dimensions)', () => {
    const cfg = createDefaultConfig();
    cfg.overheads = makeOverheads();
    const r = calculateCosts(cfg);
    expect(r.directMaterials).toBe(0);
    expect(r.labor).toBe(0);
    expect(r.subTotal).toBe(5000 + 1500);
    expect(r.profit).toBeCloseTo(975, 6);
    expect(r.commission).toBeCloseTo(260, 6);
    expect(r.grandTotal).toBeCloseTo(7735, 6);
  });

  it('handles zero materials with all flat fees zeroed', () => {
    const cfg = makeConfig([], { laborRate: 0, detailing: 0, engineering: 0 });
    const r = calculateCosts(cfg);
    expect(r.labor).toBe(0);
    expect(r.subTotal).toBe(0);
    expect(r.profit).toBe(0);
    expect(r.commission).toBe(0);
    expect(r.grandTotal).toBe(0);
  });

  it('zero profit and commission rates produce grandTotal == subTotal', () => {
    const components = [makeComponent({ category: 'main-framing', weight: 500, costPerUnit: 1 })];
    const cfg = makeConfig(components, { profitRate: 0, commissionRate: 0, detailing: 0, engineering: 0, overheadRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.subTotal).toBe(500 + 500 * 0.75);
    expect(r.profit).toBe(0);
    expect(r.commission).toBe(0);
    expect(r.grandTotal).toBe(r.subTotal);
  });

  it('handles very large totals (millions) without precision loss', () => {
    const components = [
      makeComponent({ category: 'main-framing', weight: 1_000_000, costPerUnit: 1.5 }),
      makeComponent({ category: 'roof-wall-sheeting', qty: 100_000, costPerUnit: 5 }),
    ];
    const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.directMaterials).toBe(2_000_000);
    expect(r.labor).toBe(1_000_000 * 0.75);
    expect(r.subTotal).toBe(2_000_000 + 750_000);
    expect(r.profit).toBeCloseTo(2_750_000 * 0.15, 4);
    expect(r.grandTotal).toBeCloseTo(2_750_000 * 1.19, 4);
  });

  it('treats negative costPerUnit as a credit (current behavior — flag for review)', () => {
    const components = [
      makeComponent({ category: 'main-framing', weight: 100, costPerUnit: 10 }),
      makeComponent({ category: 'main-framing', weight: 50, costPerUnit: -2 }),
    ];
    const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0, profitRate: 0, commissionRate: 0, laborRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.structuralTotal).toBe(900);
    expect(r.grandTotal).toBe(900);
  });
});

describe('calculateCosts — formula composition', () => {
  it('profit and commission are both based on the same subTotal (not compounded)', () => {
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0, laborRate: 0 });
    const r = calculateCosts(cfg);
    expect(r.subTotal).toBe(10000);
    expect(r.profit).toBeCloseTo(1500, 6);
    expect(r.commission).toBeCloseTo(400, 6);
    expect(r.grandTotal).toBeCloseTo(10000 * 1.19, 6);
  });

  it('overhead is applied to materials+labor, not to flat fees', () => {
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const cfg = makeConfig(components, {
      laborRate: 0, detailing: 1000, engineering: 1000, overheadRate: 0.10,
      profitRate: 0, commissionRate: 0,
    });
    const r = calculateCosts(cfg);
    // overhead = 10000 * 0.10 = 1000  (NOT (10000+2000)*0.10)
    expect(r.overheadCost).toBe(1000);
    expect(r.subTotal).toBe(10000 + 1000 + 1000 + 1000);
  });

  it('does NOT round mid-calculation — preserves raw float (documents current behavior; FLAG for Livingston)', () => {
    // 0.1 cannot be represented exactly in IEEE-754; engine returns the raw float
    // (no .toFixed() / Math.round() anywhere mid-calc). Rounding happens only at
    // formatUSD() display boundary. This is currently SAFE because Excel does the
    // same, but if we ever sum 1000s of items the drift could appear.
    const components = [makeComponent({ category: 'main-framing', weight: 1, costPerUnit: 0.1 })];
    const cfg = makeConfig(components, {
      laborRate: 0, detailing: 0, engineering: 0, overheadRate: 0,
      profitRate: 0, commissionRate: 0,
    });
    const r = calculateCosts(cfg);
    expect(r.directMaterials).toBe(0.1);
    expect(r.grandTotal).toBe(0.1);
  });
});

describe('formatUSD', () => {
  it('formats amounts as USD currency at the display boundary', () => {
    expect(formatUSD(1234.5)).toBe('$1,234.50');
    expect(formatUSD(0)).toBe('$0.00');
  });
});
