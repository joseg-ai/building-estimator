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

// ---------------------------------------------------------------------------
// Issue #13 — Sales tax field
//
// Reuben's formula:
//   salesTaxBase = Materials + Labor + Freight + Overhead + Erection
//                + Foundation + Permits + Contingency + Profit + Commission
//   salesTax     = salesTaxBase * salesTaxRate
//   grandTotal   = subTotal + profit + commission + (included ? salesTax : 0)
//
// Note: contingency (#15) is not yet implemented and is treated as 0 in the
// engine — these tests therefore omit it from expected values.
// ---------------------------------------------------------------------------
describe('Sales tax (#13) — defaults & toggle', () => {
  it('createDefaultConfig sets Texas default rate (8.25%) and excluded toggle', () => {
    const cfg = createDefaultConfig();
    expect(cfg.salesTaxRate).toBe(0.0825);
    expect(cfg.salesTaxIncluded).toBe(false);
  });

  it('excluded: grandTotal contains NO tax even with a nonzero rate', () => {
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0, laborRate: 0 });
    cfg.salesTaxRate = 0.0825;
    cfg.salesTaxIncluded = false;
    const r = calculateCosts(cfg);
    // subTotal = 10000; profit = 1500; commission = 400 → expected grandTotal w/o tax = 11900
    expect(r.subTotal).toBe(10000);
    expect(r.grandTotal).toBeCloseTo(11900, 6);
    // Engine still computes the tax number (so the UI can show "would-be tax"),
    // but it must not flow into the grand total.
    expect(r.salesTaxIncluded).toBe(false);
  });

  it('excluded with extreme rate (1.0) still leaves grandTotal untaxed', () => {
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0, laborRate: 0 });
    cfg.salesTaxRate = 1.0;
    cfg.salesTaxIncluded = false;
    const r = calculateCosts(cfg);
    expect(r.grandTotal).toBeCloseTo(11900, 6); // same as rate=0 when excluded
  });
});

describe('Sales tax (#13) — Reuben formula correctness', () => {
  it('included: salesTax = (Materials + Labor + Freight + Overhead + Erection + Foundation + Permits + Profit + Commission) × rate', () => {
    // Build a configuration that exercises every component of the tax base.
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const cfg = makeConfig(components, {
      laborRate: 0.75,
      detailing: 5000,        // NOT in tax base
      engineering: 1500,      // NOT in tax base
      loadingHauling: 200,    // NOT in tax base
      freight: 300,           // in tax base
      overheadRate: 0.02,
      erection: 400,
      foundation: 500,
      permits: 600,
      profitRate: 0.15,
      commissionRate: 0.04,
    });
    cfg.salesTaxRate = 0.0825;
    cfg.salesTaxIncluded = true;
    const r = calculateCosts(cfg);

    // Sanity: directMaterials=10000, labor=750, totalML=10750
    // overhead = 10750 * 0.02 = 215
    // subTotal = 10750 + 5000 + 1500 + 200 + 300 + 215 + 400 + 500 + 600 = 19465
    // profit = 19465 * 0.15 = 2919.75
    // commission = 19465 * 0.04 = 778.6
    // taxBase = 10000 + 750 + 300 + 215 + 400 + 500 + 600 + 2919.75 + 778.6 = 16463.35
    // tax = 16463.35 * 0.0825 = 1358.226375
    // grandTotal = 19465 + 2919.75 + 778.6 + 1358.226375 = 24521.576375
    expect(r.directMaterials).toBe(10000);
    expect(r.labor).toBe(750);
    expect(r.overheadCost).toBeCloseTo(215, 6);
    expect(r.subTotal).toBeCloseTo(19465, 6);
    expect(r.profit).toBeCloseTo(2919.75, 6);
    expect(r.commission).toBeCloseTo(778.6, 6);

    const expectedBase =
      r.directMaterials + r.labor + r.freight + r.overheadCost +
      r.erection + r.foundation + r.permits + r.profit + r.commission;
    expect(r.salesTaxBase).toBeCloseTo(expectedBase, 6);
    expect(r.salesTaxBase).toBeCloseTo(16463.35, 6);
    expect(r.salesTax).toBeCloseTo(16463.35 * 0.0825, 6);
    expect(r.salesTax).toBeCloseTo(1358.226375, 6);
    expect(r.grandTotal).toBeCloseTo(19465 + 2919.75 + 778.6 + 1358.226375, 6);
  });

  it('detailing, engineering and loadingHauling are EXCLUDED from the tax base', () => {
    // Same materials, but vary the excluded fees — tax must not change.
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const base = (over: Partial<ReturnType<typeof makeOverheads>>) => {
      const cfg = makeConfig(components, {
        laborRate: 0, overheadRate: 0, profitRate: 0, commissionRate: 0,
        erection: 0, foundation: 0, permits: 0, freight: 0,
        ...over,
      });
      cfg.salesTaxRate = 0.1;
      cfg.salesTaxIncluded = true;
      return calculateCosts(cfg);
    };
    const a = base({ detailing: 0, engineering: 0, loadingHauling: 0 });
    const b = base({ detailing: 9999, engineering: 8888, loadingHauling: 7777 });
    // Tax base unchanged → tax unchanged.
    expect(b.salesTaxBase).toBeCloseTo(a.salesTaxBase, 6);
    expect(b.salesTax).toBeCloseTo(a.salesTax, 6);
    // ... even though subTotal/grandTotal DO change by the excluded fees.
    expect(b.subTotal - a.subTotal).toBeCloseTo(9999 + 8888 + 7777, 6);
  });

  it('grandTotal = pre-tax-subtotal + tax when included, = pre-tax-subtotal when excluded', () => {
    // pre-tax-subtotal here means subTotal + profit + commission (the legacy total).
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const mk = (included: boolean) => {
      const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0, laborRate: 0 });
      cfg.salesTaxRate = 0.0825;
      cfg.salesTaxIncluded = included;
      return calculateCosts(cfg);
    };
    const excluded = mk(false);
    const included = mk(true);
    const preTax = excluded.subTotal + excluded.profit + excluded.commission;
    expect(excluded.grandTotal).toBeCloseTo(preTax, 6);
    expect(included.grandTotal).toBeCloseTo(preTax + included.salesTax, 6);
    expect(included.grandTotal - excluded.grandTotal).toBeCloseTo(included.salesTax, 6);
  });
});

describe('Sales tax (#13) — edge cases', () => {
  it('rate = 0 → tax = 0 regardless of included flag', () => {
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    for (const included of [true, false]) {
      const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0, laborRate: 0 });
      cfg.salesTaxRate = 0;
      cfg.salesTaxIncluded = included;
      const r = calculateCosts(cfg);
      expect(r.salesTax).toBe(0);
      expect(r.grandTotal).toBeCloseTo(11900, 6);
    }
  });

  it('rate = 1.0 sanity check: tax exactly equals the tax base', () => {
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const cfg = makeConfig(components, {
      detailing: 0, engineering: 0, loadingHauling: 0,
      freight: 100, overheadRate: 0, erection: 50, foundation: 25, permits: 10,
      profitRate: 0.1, commissionRate: 0.05, laborRate: 0,
    });
    cfg.salesTaxRate = 1.0;
    cfg.salesTaxIncluded = true;
    const r = calculateCosts(cfg);
    expect(r.salesTax).toBeCloseTo(r.salesTaxBase, 6);
    // grandTotal = subTotal + profit + commission + salesTaxBase
    expect(r.grandTotal).toBeCloseTo(r.subTotal + r.profit + r.commission + r.salesTaxBase, 6);
  });

  it('empty building with included tax: tax base reduces to profit + commission of flat fees', () => {
    // Default detailing+engineering fees are NOT in the tax base, so with no
    // materials/labor/freight/overhead/erection/foundation/permits, the base is
    // exactly profit + commission (both computed off subTotal = 5000+1500 = 6500).
    const cfg = createDefaultConfig();
    cfg.overheads = makeOverheads();
    cfg.salesTaxRate = 0.0825;
    cfg.salesTaxIncluded = true;
    const r = calculateCosts(cfg);
    expect(r.subTotal).toBe(6500);
    expect(r.profit).toBeCloseTo(975, 6);
    expect(r.commission).toBeCloseTo(260, 6);
    expect(r.salesTaxBase).toBeCloseTo(975 + 260, 6);
    expect(r.salesTax).toBeCloseTo((975 + 260) * 0.0825, 6);
    expect(r.grandTotal).toBeCloseTo(7735 + r.salesTax, 6);
  });

  it('negative rate is NOT rejected or clamped — documents current behavior (FLAG for review)', () => {
    // The engine does not validate the rate; a negative rate produces a credit
    // against grand total. Form layer should clamp at >= 0 (analogous to the
    // negative costPerUnit case in Bug #1 fix tests).
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0, laborRate: 0 });
    cfg.salesTaxRate = -0.05;
    cfg.salesTaxIncluded = true;
    const r = calculateCosts(cfg);
    expect(r.salesTax).toBeLessThan(0);
    expect(r.salesTax).toBeCloseTo(r.salesTaxBase * -0.05, 6);
    // grandTotal is reduced — credit applied.
    expect(r.grandTotal).toBeLessThan(r.subTotal + r.profit + r.commission);
  });

  it('very large totals: tax keeps precision and no overflow', () => {
    const components = [makeComponent({ category: 'main-framing', weight: 1_000_000, costPerUnit: 1.5 })];
    const cfg = makeConfig(components, { detailing: 0, engineering: 0, overheadRate: 0 });
    cfg.salesTaxRate = 0.0825;
    cfg.salesTaxIncluded = true;
    const r = calculateCosts(cfg);
    expect(Number.isFinite(r.salesTax)).toBe(true);
    expect(Number.isFinite(r.grandTotal)).toBe(true);
    expect(r.salesTax).toBeCloseTo(r.salesTaxBase * 0.0825, 2);
  });
});

describe('Sales tax (#13) — rounding & display', () => {
  it('keeps full float precision internally (no mid-calc rounding)', () => {
    // 0.0825 × 100 = 8.25 exactly... but most rates × bases drift. Verify the
    // engine does NOT pre-round salesTax to cents — raw float is preserved
    // so it can be summed across many lines without compounding rounding error.
    const components = [makeComponent({ category: 'main-framing', weight: 1, costPerUnit: 0.1 })];
    const cfg = makeConfig(components, {
      laborRate: 0, detailing: 0, engineering: 0, overheadRate: 0,
      profitRate: 0, commissionRate: 0,
    });
    cfg.salesTaxRate = 0.0825;
    cfg.salesTaxIncluded = true;
    const r = calculateCosts(cfg);
    // base = directMaterials = 0.1, tax = 0.00825 — must NOT be rounded to 0.01
    expect(r.salesTaxBase).toBe(0.1);
    expect(r.salesTax).toBeCloseTo(0.00825, 10);
    // And the raw value is reachable (not pre-rounded).
    expect(r.salesTax).not.toBe(0.01);
  });

  it('formatUSD rounds the tax to cents at the display boundary', () => {
    // 16463.35 × 0.0825 = 1358.226375 → display "$1,358.23"
    const components = [makeComponent({ category: 'main-framing', weight: 1000, costPerUnit: 10 })];
    const cfg = makeConfig(components, {
      laborRate: 0.75, detailing: 5000, engineering: 1500, loadingHauling: 200,
      freight: 300, overheadRate: 0.02, erection: 400, foundation: 500, permits: 600,
      profitRate: 0.15, commissionRate: 0.04,
    });
    cfg.salesTaxRate = 0.0825;
    cfg.salesTaxIncluded = true;
    const r = calculateCosts(cfg);
    expect(formatUSD(r.salesTax)).toBe('$1,358.23');
  });
});
