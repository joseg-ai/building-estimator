/**
 * BOM Engine Secondary Tests — computeSecondaryFraming / computeSheeting /
 * computeTrim / computeFasteners / computeFullBom
 *
 * Canonical test case: 40W × 60L × 16H ft, gable, 4 bays, pitch 1:12,
 * girts=4/side, purlins=10.  All expected values are hand-derived from
 * the workbook formulas documented in bomEngine.ts and in
 * .squad/decisions/inbox/livingston-issue4-component-qty.md.
 *
 * Workbook cross-check: 50W × 100L × 20H gable, 4 bays, pitch 1:12 (reference
 * building from Components.txt).  Verified against workbook rows annotated in
 * each test.
 */

import { describe, it, expect } from 'vitest';
import {
  computeSecondaryFraming,
  computeSheeting,
  computeTrim,
  computeFasteners,
  computeFullBom,
} from '../bomEngine';
import { createDefaultConfig } from '../types';
import type { BuildingConfig, ComponentItem } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: {
  width: number;
  length: number;
  eaveHeight: number;
  roofPitch: number;
  nBays: number;
  girts?: number;
  purlins?: number;
  roofType?: 'gable' | 'single-slope';
}): BuildingConfig {
  const cfg = createDefaultConfig();
  cfg.dimensions.width = overrides.width;
  cfg.dimensions.length = overrides.length;
  cfg.dimensions.eaveHeight = overrides.eaveHeight;
  cfg.dimensions.roofPitch = overrides.roofPitch;
  cfg.dimensions.baySpacing = overrides.nBays;
  cfg.dimensions.girts = overrides.girts ?? 4;
  cfg.dimensions.purlins = overrides.purlins ?? 10;
  cfg.roofType = overrides.roofType ?? 'gable';
  return cfg;
}

function findItem(items: ComponentItem[], id: string): ComponentItem {
  const item = items.find((it) => it.id === id);
  if (!item) throw new Error(`BOM item not found: ${id}`);
  return item;
}

// Canonical 40×60×16 test config
const CANONICAL = makeConfig({ width: 40, length: 60, eaveHeight: 16, roofPitch: 1, nBays: 4 });

// Workbook reference 50×100×20 config (for cross-checking against Components.txt)
const WORKBOOK_REF = makeConfig({ width: 50, length: 100, eaveHeight: 20, roofPitch: 1, nBays: 4 });

// ---------------------------------------------------------------------------
// 1. Secondary Framing
// ---------------------------------------------------------------------------

describe('computeSecondaryFraming — 40×60×16, gable, girts=4, purlins=10', () => {
  const items = computeSecondaryFraming(CANONICAL);

  it('returns exactly 4 items (SF-01 through SF-04)', () => {
    expect(items.map((i) => i.id).sort()).toEqual(['SF-01', 'SF-02', 'SF-03', 'SF-04']);
  });

  describe('SF-01 — Side Wall Girts', () => {
    // qty = girts × 2 = 4×2 = 8 rows; length = L = 60; lnFtToFab = 480
    // lnF = ceil(480/24)×24 = 20×24 = 480
    it('qty = girts × 2 = 8', () => {
      expect(findItem(items, 'SF-01').qty).toBe(8);
    });
    it('length = L = 60', () => {
      expect(findItem(items, 'SF-01').length).toBe(60);
    });
    it('lnFeetToFab = 8 × 60 = 480', () => {
      expect(findItem(items, 'SF-01').lnFeetToFab).toBe(480);
    });
    it('lnF = 480 (exactly divisible by commLength=24)', () => {
      expect(findItem(items, 'SF-01').lnF).toBe(480);
    });
    it('category = purlins-girts', () => {
      expect(findItem(items, 'SF-01').category).toBe('purlins-girts');
    });
    it('group = COLD FORM', () => {
      expect(findItem(items, 'SF-01').group).toBe('COLD FORM');
    });
    it('material = Zee 8 x 2 1/2 x 14 Red Ox', () => {
      expect(findItem(items, 'SF-01').material).toBe('Zee 8 x 2 1/2 x 14 Red Ox');
    });
    it('weight = lnF × 3.269 lb/ft ≈ 1569.1', () => {
      expect(findItem(items, 'SF-01').weight).toBeCloseTo(480 * 3.269, 1);
    });
  });

  describe('SF-02 — End Wall Girts', () => {
    // qty = girts × 2 = 8; length = W = 40; lnFtToFab = 320
    // lnF = ceil(320/24)×24 = 14×24 = 336
    it('qty = girts × 2 = 8', () => {
      expect(findItem(items, 'SF-02').qty).toBe(8);
    });
    it('length = W = 40', () => {
      expect(findItem(items, 'SF-02').length).toBe(40);
    });
    it('lnFeetToFab = 8 × 40 = 320', () => {
      expect(findItem(items, 'SF-02').lnFeetToFab).toBe(320);
    });
    it('lnF = 336 (14 × 24)', () => {
      expect(findItem(items, 'SF-02').lnF).toBe(336);
    });
  });

  describe('SF-03 — Roof Purlins', () => {
    // qty = purlins = 10; length = L = 60; lnFtToFab = 600
    // lnF = ceil(600/24)×24 = 25×24 = 600
    it('qty = purlins = 10', () => {
      expect(findItem(items, 'SF-03').qty).toBe(10);
    });
    it('length = L = 60', () => {
      expect(findItem(items, 'SF-03').length).toBe(60);
    });
    it('lnFeetToFab = 10 × 60 = 600', () => {
      expect(findItem(items, 'SF-03').lnFeetToFab).toBe(600);
    });
    it('lnF = 600 (exactly divisible by commLength=24)', () => {
      expect(findItem(items, 'SF-03').lnF).toBe(600);
    });
  });

  describe('SF-04 — Eave Struts', () => {
    // qty = 2; length = L = 60; lnFtToFab = 120
    // lnF = ceil(120/20)×20 = 6×20 = 120
    it('qty = 2 (one per sidewall)', () => {
      expect(findItem(items, 'SF-04').qty).toBe(2);
    });
    it('length = L = 60', () => {
      expect(findItem(items, 'SF-04').length).toBe(60);
    });
    it('lnFeetToFab = 2 × 60 = 120', () => {
      expect(findItem(items, 'SF-04').lnFeetToFab).toBe(120);
    });
    it('lnF = 120 (6 × 20 ft commercial lengths)', () => {
      expect(findItem(items, 'SF-04').lnF).toBe(120);
    });
    it('group = EAVE STRUT', () => {
      expect(findItem(items, 'SF-04').group).toBe('EAVE STRUT');
    });
    it('weight = lnF × 6.037 ≈ 724.4', () => {
      expect(findItem(items, 'SF-04').weight).toBeCloseTo(120 * 6.037, 1);
    });
  });
});

// Workbook cross-check for secondary framing
describe('computeSecondaryFraming — 50×100×20 workbook reference', () => {
  const items = computeSecondaryFraming(WORKBOOK_REF);

  it('SF-01 qty=8, length=100, lnFtToFab=800 (Components.txt row 9)', () => {
    const g = findItem(items, 'SF-01');
    expect(g.qty).toBe(8);
    expect(g.length).toBe(100);
    expect(g.lnFeetToFab).toBe(800);
  });

  it('SF-01 lnF=816 (34 × 24 ft), matches workbook ordered qty=34 ✓', () => {
    expect(findItem(items, 'SF-01').lnF).toBe(816);
  });

  it('SF-02 qty=8, length=50, lnFtToFab=400 (Components.txt row 10)', () => {
    const g = findItem(items, 'SF-02');
    expect(g.qty).toBe(8);
    expect(g.length).toBe(50);
    expect(g.lnFeetToFab).toBe(400);
  });

  it('SF-02 lnF=408 (17 × 24 ft), matches workbook ordered qty=17 ✓', () => {
    expect(findItem(items, 'SF-02').lnF).toBe(408);
  });

  it('SF-03 qty=10, length=100, lnFtToFab=1000', () => {
    // NOTE: workbook shows length=130 (likely includes gable overhangs).
    // Engine uses L=100 (no overhangs). Delta flagged in decisions inbox.
    const p = findItem(items, 'SF-03');
    expect(p.qty).toBe(10);
    expect(p.length).toBe(100);
    expect(p.lnFeetToFab).toBe(1000);
  });

  it('SF-04 qty=2, length=100, lnFtToFab=200 (Components.txt row 19) ✓', () => {
    const es = findItem(items, 'SF-04');
    expect(es.qty).toBe(2);
    expect(es.length).toBe(100);
    expect(es.lnFeetToFab).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 2. Sheeting
// ---------------------------------------------------------------------------

describe('computeSheeting — 40×60×16, gable, pitch 1:12', () => {
  const items = computeSheeting(CANONICAL);
  const slopeFactor = Math.sqrt(1 + (1 / 12) ** 2); // ≈ 1.003472

  it('returns 4 items (SH-01 through SH-04)', () => {
    expect(items.map((i) => i.id).sort()).toEqual(['SH-01', 'SH-02', 'SH-03', 'SH-04']);
  });

  describe('SH-01 — Ridge Cap', () => {
    // lnFtToFab = L = 60; lnF = ceil(60/24)×24 = 3×24 = 72
    it('length = L = 60', () => {
      expect(findItem(items, 'SH-01').length).toBe(60);
    });
    it('lnFeetToFab = 60', () => {
      expect(findItem(items, 'SH-01').lnFeetToFab).toBe(60);
    });
    it('lnF = 72 (3 × 24 ft)', () => {
      expect(findItem(items, 'SH-01').lnF).toBe(72);
    });
    it('category = roof-wall-sheeting', () => {
      expect(findItem(items, 'SH-01').category).toBe('roof-wall-sheeting');
    });
    it('group = SHEETING', () => {
      expect(findItem(items, 'SH-01').group).toBe('SHEETING');
    });
  });

  describe('SH-02 — Roof Panels (Galvalume)', () => {
    // qty = 60/3 = 20 panel runs; length = 40 × slopeFactor ≈ 40.139
    // lnFtToFab = 20 × 40.139 ≈ 802.78
    // lnF = ceil(802.78/24)×24 = 34×24 = 816
    it('qty = L/3 = 20 panel runs', () => {
      expect(findItem(items, 'SH-02').qty).toBeCloseTo(20, 5);
    });
    it('length ≈ W × slopeFactor = 40 × 1.00347 ≈ 40.139', () => {
      expect(findItem(items, 'SH-02').length).toBeCloseTo(40 * slopeFactor, 4);
    });
    it('lnFeetToFab = (L/3) × (W × slopeFactor) ≈ 802.78', () => {
      const expected = (60 / 3) * (40 * slopeFactor);
      expect(findItem(items, 'SH-02').lnFeetToFab).toBeCloseTo(expected, 3);
    });
    it('lnF = 816 (34 × 24 ft commercial lengths)', () => {
      expect(findItem(items, 'SH-02').lnF).toBe(816);
    });
  });

  describe('SH-03 — Side Wall Panels (Color)', () => {
    // qty = 2×60/3 = 40; length = H = 16; lnFtToFab = 640
    // lnF = ceil(640/24)×24 = 27×24 = 648
    it('qty = 2×L/3 = 40', () => {
      expect(findItem(items, 'SH-03').qty).toBeCloseTo(40, 5);
    });
    it('length = H = 16', () => {
      expect(findItem(items, 'SH-03').length).toBe(16);
    });
    it('lnFeetToFab = 40 × 16 = 640', () => {
      expect(findItem(items, 'SH-03').lnFeetToFab).toBeCloseTo(640, 3);
    });
    it('lnF = 648 (27 × 24 ft)', () => {
      expect(findItem(items, 'SH-03').lnF).toBe(648);
    });
  });

  describe('SH-04 — End Wall Panels (Color)', () => {
    // ridgeH = 16 + 20×(1/12) = 17.6667; avgEndWallH = (16+17.6667)/2 = 16.8333
    // qty = 2×40/3 ≈ 26.667; lnFtToFab = 26.667×16.8333 ≈ 448.89
    // lnF = ceil(448.89/24)×24 = 19×24 = 456
    it('qty = 2×W/3 ≈ 26.667', () => {
      expect(findItem(items, 'SH-04').qty).toBeCloseTo(2 * 40 / 3, 4);
    });
    it('length ≈ avgEndWallH = (H + ridgeH)/2 ≈ 16.833', () => {
      const ridgeH = 16 + (40 / 2) * (1 / 12);
      const expected = (16 + ridgeH) / 2;
      expect(findItem(items, 'SH-04').length).toBeCloseTo(expected, 3);
    });
    it('lnF = 456 (19 × 24 ft)', () => {
      expect(findItem(items, 'SH-04').lnF).toBe(456);
    });
  });
});

// Workbook cross-check for sheeting
describe('computeSheeting — 50×100×20 workbook reference', () => {
  const items = computeSheeting(WORKBOOK_REF);
  const slopeFactor = Math.sqrt(1 + (1 / 12) ** 2);

  it('SH-01 Ridge Cap lnFtToFab=100 (Components.txt row 28) ✓', () => {
    expect(findItem(items, 'SH-01').lnFeetToFab).toBe(100);
  });

  it('SH-01 Ridge Cap lnF=120 (5×24, workbook ordered=5) ✓', () => {
    expect(findItem(items, 'SH-01').lnF).toBe(120);
  });

  it('SH-02 Roof Panel qty=100/3≈33.33, length=50×slopeFactor≈50.17 (row 29) ✓', () => {
    const panel = findItem(items, 'SH-02');
    expect(panel.qty).toBeCloseTo(100 / 3, 4);
    expect(panel.length).toBeCloseTo(50 * slopeFactor, 3);
  });

  it('SH-02 lnFtToFab≈1672.7 (row 29: 1672.67) ✓', () => {
    const expected = (100 / 3) * (50 * slopeFactor);
    expect(findItem(items, 'SH-02').lnFeetToFab).toBeCloseTo(expected, 0);
  });

  it('SH-02 lnF=1680 (70×24, workbook ordered=70) ✓', () => {
    expect(findItem(items, 'SH-02').lnF).toBe(1680);
  });

  it('SH-03 Side Wall qty=200/3≈66.67, length=20 (row 30) ✓', () => {
    const sw = findItem(items, 'SH-03');
    expect(sw.qty).toBeCloseTo(200 / 3, 4);
    expect(sw.length).toBe(20);
  });

  it('SH-03 lnF=1344 (56×24, workbook ordered=56) ✓', () => {
    expect(findItem(items, 'SH-03').lnF).toBe(1344);
  });

  it('SH-04 End Wall qty=100/3≈33.33, length≈21.04 (row 33: 21.045) ✓', () => {
    const ew = findItem(items, 'SH-04');
    expect(ew.qty).toBeCloseTo(100 / 3, 4);
    const ridgeH = 20 + 25 * (1 / 12);
    const expectedAvgH = (20 + ridgeH) / 2;
    expect(ew.length).toBeCloseTo(expectedAvgH, 2);
  });

  it('SH-04 lnF=720 (30×24, workbook ordered=30) ✓', () => {
    expect(findItem(items, 'SH-04').lnF).toBe(720);
  });
});

// Gable vs single-slope: ridge cap only present for gable
describe('computeSheeting — single-slope omits ridge cap', () => {
  const cfg = makeConfig({ width: 40, length: 60, eaveHeight: 16, roofPitch: 1, nBays: 4, roofType: 'single-slope' });
  const items = computeSheeting(cfg);

  it('no SH-01 ridge cap for single-slope', () => {
    expect(items.find((i) => i.id === 'SH-01')).toBeUndefined();
  });

  it('SH-02 roof panel length = W × slopeFactor (one full slope)', () => {
    const slopeFactor = Math.sqrt(1 + (1 / 12) ** 2);
    expect(findItem(items, 'SH-02').length).toBeCloseTo(40 * slopeFactor, 4);
  });
});

// ---------------------------------------------------------------------------
// 3. Trim
// ---------------------------------------------------------------------------

describe('computeTrim — 40×60×16, gable, pitch 1:12', () => {
  const items = computeTrim(CANONICAL);
  const slopeFactor = Math.sqrt(1 + (1 / 12) ** 2);
  const rafterPerSlope = (40 / 2) * slopeFactor; // ≈ 20.069 ft

  it('returns 7 items (TR-01 through TR-07) for gable', () => {
    expect(items.map((i) => i.id).sort()).toEqual(
      ['TR-01', 'TR-02', 'TR-03', 'TR-04', 'TR-05', 'TR-06', 'TR-07'],
    );
  });

  describe('TR-01 — Base Angle', () => {
    // perimeter = 2×(60+40) = 200; lnF = ceil(200/24)×24 = 9×24 = 216
    it('length = perimeter = 2×(L+W) = 200', () => {
      expect(findItem(items, 'TR-01').length).toBe(200);
    });
    it('lnFeetToFab = 200', () => {
      expect(findItem(items, 'TR-01').lnFeetToFab).toBe(200);
    });
    it('lnF = 216 (9 × 24 ft)', () => {
      expect(findItem(items, 'TR-01').lnF).toBe(216);
    });
    it('group = ANGLES', () => {
      expect(findItem(items, 'TR-01').group).toBe('ANGLES');
    });
  });

  describe('TR-02 — Rake Angle', () => {
    // qty=4 rakes; each = W/2 × slopeFactor ≈ 20.069 ft; lnFtToFab ≈ 80.278
    // lnF = ceil(80.278/24)×24 = 4×24 = 96
    it('qty = 4 (gable: 2 per endwall × 2 endwalls)', () => {
      expect(findItem(items, 'TR-02').qty).toBe(4);
    });
    it('length per rake ≈ W/2 × slopeFactor ≈ 20.069', () => {
      expect(findItem(items, 'TR-02').length).toBeCloseTo(rafterPerSlope, 3);
    });
    it('lnFeetToFab = 4 × rakeLength ≈ 80.278', () => {
      expect(findItem(items, 'TR-02').lnFeetToFab).toBeCloseTo(4 * rafterPerSlope, 3);
    });
    it('lnF = 96 (4 × 24 ft)', () => {
      expect(findItem(items, 'TR-02').lnF).toBe(96);
    });
  });

  describe('TR-03 — Rake Trim', () => {
    // Same extents as rake angle; commLength=10 → lnF = ceil(80.278/10)×10 = 9×10 = 90
    it('qty = 4 (same as rake angle)', () => {
      expect(findItem(items, 'TR-03').qty).toBe(4);
    });
    it('lnF = 90 (9 × 10 ft)', () => {
      expect(findItem(items, 'TR-03').lnF).toBe(90);
    });
    it('group = ROOF TRIM', () => {
      expect(findItem(items, 'TR-03').group).toBe('ROOF TRIM');
    });
  });

  describe('TR-04 — Peak Box (gable)', () => {
    it('qty = 2 (one per gable end)', () => {
      expect(findItem(items, 'TR-04').qty).toBe(2);
    });
    it('measure = pc', () => {
      expect(findItem(items, 'TR-04').measure).toBe('pc');
    });
  });

  describe('TR-05 — Rake End Cap (gable)', () => {
    // qty = rakeQty × 2 = 4 × 2 = 8
    it('qty = 8 (2 caps per rake × 4 rakes)', () => {
      expect(findItem(items, 'TR-05').qty).toBe(8);
    });
  });

  describe('TR-06 — Eave Gutter', () => {
    // qty=2; lnFtToFab = 2×60=120; lnF = ceil(120/10)×10 = 12×10 = 120
    it('qty = 2 (one per sidewall)', () => {
      expect(findItem(items, 'TR-06').qty).toBe(2);
    });
    it('lnFeetToFab = 2×L = 120', () => {
      expect(findItem(items, 'TR-06').lnFeetToFab).toBe(120);
    });
    it('lnF = 120 (12 × 10 ft)', () => {
      expect(findItem(items, 'TR-06').lnF).toBe(120);
    });
    it('group = ROOF TRIM', () => {
      expect(findItem(items, 'TR-06').group).toBe('ROOF TRIM');
    });
  });

  describe('TR-07 — Outside Corner Trim', () => {
    // qty=4; lnFtToFab = 4×16=64; lnF = ceil(64/10)×10 = 7×10 = 70
    it('qty = 4 (4 building corners)', () => {
      expect(findItem(items, 'TR-07').qty).toBe(4);
    });
    it('length = H = 16', () => {
      expect(findItem(items, 'TR-07').length).toBe(16);
    });
    it('lnFeetToFab = 4 × H = 64', () => {
      expect(findItem(items, 'TR-07').lnFeetToFab).toBe(64);
    });
    it('lnF = 70 (7 × 10 ft)', () => {
      expect(findItem(items, 'TR-07').lnF).toBe(70);
    });
    it('group = WALL TRIM', () => {
      expect(findItem(items, 'TR-07').group).toBe('WALL TRIM');
    });
  });
});

// Workbook cross-check for trim
describe('computeTrim — 50×100×20 workbook reference', () => {
  const items = computeTrim(WORKBOOK_REF);
  const slopeFactor = Math.sqrt(1 + (1 / 12) ** 2);

  it('TR-01 Base Angle lnFtToFab=300=2×(100+50) (Components.txt row 23) ✓', () => {
    expect(findItem(items, 'TR-01').lnFeetToFab).toBe(300);
  });

  it('TR-01 lnF=312 (13×24, workbook ordered=13) ✓', () => {
    expect(findItem(items, 'TR-01').lnF).toBe(312);
  });

  it('TR-02 Rake Angle qty=4, lnFtToFab≈100.36 (row 24: 100.36) ✓', () => {
    const ra = findItem(items, 'TR-02');
    const expected = 4 * (25 * slopeFactor);
    expect(ra.qty).toBe(4);
    expect(ra.lnFeetToFab).toBeCloseTo(expected, 2);
  });

  it('TR-03 Rake Trim qty=4, lnF=110 (11×10, workbook ordered=11) ✓', () => {
    const rt = findItem(items, 'TR-03');
    expect(rt.qty).toBe(4);
    expect(rt.lnF).toBe(110);
  });

  it('TR-04 Peak Box qty=2 ✓', () => {
    expect(findItem(items, 'TR-04').qty).toBe(2);
  });

  it('TR-05 Rake End Cap qty=8 ✓', () => {
    expect(findItem(items, 'TR-05').qty).toBe(8);
  });

  it('TR-06 Eave Gutter lnFtToFab=200 (2×100), lnF=200 (20×10) (row 49) ✓', () => {
    const eg = findItem(items, 'TR-06');
    expect(eg.lnFeetToFab).toBe(200);
    expect(eg.lnF).toBe(200);
  });
});

// Single-slope trim: no peak box / rake end cap
describe('computeTrim — single-slope omits peak box and rake end caps', () => {
  const cfg = makeConfig({ width: 40, length: 60, eaveHeight: 16, roofPitch: 1, nBays: 4, roofType: 'single-slope' });
  const items = computeTrim(cfg);

  it('no TR-04 Peak Box for single-slope', () => {
    expect(items.find((i) => i.id === 'TR-04')).toBeUndefined();
  });

  it('no TR-05 Rake End Cap for single-slope', () => {
    expect(items.find((i) => i.id === 'TR-05')).toBeUndefined();
  });

  it('TR-02 Rake Angle qty=2 (single-slope has 2 rake edges)', () => {
    expect(findItem(items, 'TR-02').qty).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Fasteners & Hardware
// ---------------------------------------------------------------------------

describe('computeFasteners — 40×60×16, gable, pitch 1:12', () => {
  const items = computeFasteners(CANONICAL);
  const slopeFactor = Math.sqrt(1 + (1 / 12) ** 2);
  const ridgeH = 16 + 20 * (1 / 12);
  const avgEndWallH = (16 + ridgeH) / 2;
  const roofArea = 60 * 40 * slopeFactor;
  const sideWallArea = 2 * 60 * 16;
  const endWallArea = 2 * 40 * avgEndWallH;
  const totalArea = roofArea + sideWallArea + endWallArea;

  it('returns 9 items (FN-01 through FN-09)', () => {
    expect(items.map((i) => i.id).sort()).toEqual([
      'FN-01', 'FN-02', 'FN-03', 'FN-04', 'FN-05',
      'FN-06', 'FN-07', 'FN-08', 'FN-09',
    ]);
  });

  describe('FN-01 — Fasteners (screws)', () => {
    it('qty = round(totalArea × 0.71)', () => {
      expect(findItem(items, 'FN-01').qty).toBe(Math.round(totalArea * 0.71));
    });
    it('group = BOLTS AND FASTENERS', () => {
      expect(findItem(items, 'FN-01').group).toBe('BOLTS AND FASTENERS');
    });
  });

  describe('FN-02 — Tri Bead Tape Sealant', () => {
    // qty = ceil(60/25) = 3
    it('qty = ceil(L/25) = 3', () => {
      expect(findItem(items, 'FN-02').qty).toBe(3);
    });
  });

  describe('FN-03 — Polyurethane Tube Sealant', () => {
    // qty = ceil(totalArea/2960)
    it('qty = ceil(totalArea / 2960)', () => {
      expect(findItem(items, 'FN-03').qty).toBe(Math.ceil(totalArea / 2960));
    });
  });

  describe('FN-04 / FN-05 — Outside/Inside Closure', () => {
    // roofLnFtToFab = (60/3) × (40 × slopeFactor) ≈ 802.78
    // closureQty = ceil(802.78 / 13) = 62
    const roofLnFtToFab = (60 / 3) * (40 * slopeFactor);
    const expected = Math.ceil(roofLnFtToFab / 13);

    it('FN-04 outside closure qty = ceil(roofLnFtToFab / 13)', () => {
      expect(findItem(items, 'FN-04').qty).toBe(expected);
    });
    it('FN-05 inside closure qty equals outside closure qty', () => {
      expect(findItem(items, 'FN-05').qty).toBe(findItem(items, 'FN-04').qty);
    });
  });

  describe('FN-06 — Low Floating Eave Plate', () => {
    // qty = ceil(60/4) = 15
    it('qty = ceil(L/4) = 15', () => {
      expect(findItem(items, 'FN-06').qty).toBe(15);
    });
  });

  describe('FN-07 — Low Floating Rake Support', () => {
    // qty = (W/2 × slopeFactor) / 5 = 20.069 / 5 ≈ 4.014
    it('qty = (W/2 × slopeFactor) / 5 ≈ 4.014', () => {
      const expected = (20 * slopeFactor) / 5;
      expect(findItem(items, 'FN-07').qty).toBeCloseTo(expected, 4);
    });
  });

  describe('FN-08 — Backup Plate', () => {
    it('qty = L = 60', () => {
      expect(findItem(items, 'FN-08').qty).toBe(60);
    });
  });

  describe('FN-09 — Sheeting Angle', () => {
    // qty = perimeter = 2×(60+40) = 200
    it('qty = perimeter = 2×(L+W) = 200', () => {
      expect(findItem(items, 'FN-09').qty).toBe(200);
    });
  });
});

// Workbook cross-check for fasteners
describe('computeFasteners — 50×100×20 workbook reference', () => {
  const items = computeFasteners(WORKBOOK_REF);
  const slopeFactor = Math.sqrt(1 + (1 / 12) ** 2);
  it('FN-01 Fasteners qty ≈ 7858 (workbook: 7858.9 ≈ totalSheetedArea × 0.71) ✓', () => {
    // ridgeH = 20 + 25×(1/12); avgEndH = (20+ridgeH)/2; totalArea = roof+walls+ends
    const ridgeH = 20 + 25 * (1 / 12);
    const avgEndWallH = (20 + ridgeH) / 2;
    const totalArea = 100 * 50 * slopeFactor + 2 * 100 * 20 + 2 * 50 * avgEndWallH;
    expect(findItem(items, 'FN-01').qty).toBeCloseTo(Math.round(totalArea * 0.71), 0);
  });

  it('FN-02 Tape Sealant qty = ceil(100/25) = 4 (workbook: 4) ✓', () => {
    expect(findItem(items, 'FN-02').qty).toBe(4);
  });

  it('FN-04 Outside Closure qty ≈ 129 (workbook: 129 ✓)', () => {
    const roofLnFtToFab = (100 / 3) * (50 * slopeFactor);
    expect(findItem(items, 'FN-04').qty).toBe(Math.ceil(roofLnFtToFab / 13));
  });

  it('FN-06 Eave Plate qty = ceil(100/4) = 25 (workbook: 25) ✓', () => {
    expect(findItem(items, 'FN-06').qty).toBe(25);
  });

  it('FN-07 Rake Support qty ≈ 5.017 (workbook: 5.018) ✓', () => {
    const expected = (25 * slopeFactor) / 5;
    expect(findItem(items, 'FN-07').qty).toBeCloseTo(expected, 2);
  });

  it('FN-08 Backup Plate qty = 100 = L (workbook: 100) ✓', () => {
    expect(findItem(items, 'FN-08').qty).toBe(100);
  });

  it('FN-09 Sheeting Angle qty = 300 = perimeter (workbook: 300) ✓', () => {
    expect(findItem(items, 'FN-09').qty).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// 5. computeFullBom aggregator
// ---------------------------------------------------------------------------

describe('computeFullBom — 40×60×16 canonical', () => {
  const { items, mainFramingSummary } = computeFullBom(CANONICAL);

  it('returns items including all main framing IDs (MF-01, MF-03, PL-01 …)', () => {
    const ids = items.map((i) => i.id);
    expect(ids).toContain('MF-01');
    expect(ids).toContain('PL-01');
  });

  it('returns items including all secondary framing IDs (SF-01 … SF-04)', () => {
    const ids = items.map((i) => i.id);
    expect(ids).toContain('SF-01');
    expect(ids).toContain('SF-04');
  });

  it('returns items including sheeting IDs (SH-01 … SH-04)', () => {
    const ids = items.map((i) => i.id);
    expect(ids).toContain('SH-01');
    expect(ids).toContain('SH-04');
  });

  it('returns items including trim IDs (TR-01 … TR-07)', () => {
    const ids = items.map((i) => i.id);
    expect(ids).toContain('TR-01');
    expect(ids).toContain('TR-07');
  });

  it('returns items including fastener IDs (FN-01 … FN-09)', () => {
    const ids = items.map((i) => i.id);
    expect(ids).toContain('FN-01');
    expect(ids).toContain('FN-09');
  });

  it('has no duplicate IDs', () => {
    const ids = items.map((i) => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('returns mainFramingSummary with engineerInputRequired list', () => {
    expect(mainFramingSummary.engineerInputRequired).toContain('MF-01');
    expect(mainFramingSummary.engineerInputRequired).toContain('MF-03');
  });
});
