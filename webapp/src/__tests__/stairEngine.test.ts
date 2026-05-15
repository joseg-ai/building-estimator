/**
 * Stair Engine Tests — computeStairBom / computeStairCost
 *
 * CANONICAL CASE — from extracted_data/Stairs.txt + Structural.txt.
 *   3 levels, 12.5 ft FtF, 5 ft wide, mid-landings present, treads=[10,9,9]
 *   @ 11"/tread, right guard rail only, both hand rails, mid landing
 *   10.5×4.667 (3-sided rail), floor landing 10.5×6 (3-sided rail).
 *
 * All weights and direct costs below are taken directly from Structural.txt
 * rows 9–62, then re-derived from the formulas in stairEngine.ts. Any
 * deviation from these workbook numbers is a regression.
 */

import { describe, it, expect } from 'vitest';
import {
  computeStairBom,
  computeStairCost,
  type StairConfig,
  type StairComponentItem,
} from '../stairEngine';

function findItem(items: StairComponentItem[], id: string): StairComponentItem {
  const it = items.find((x) => x.id === id);
  if (!it) throw new Error(`Stair BOM item not found: ${id}`);
  return it;
}

const CANONICAL: StairConfig = {
  levels: 3,
  width: 5,
  floorToFloorHeight: 12.5,
  treadsPerFlight: [10, 9, 9],
  treadRunInches: 11,
  hasMidLanding: true,
  midLanding: {
    width: 10.5,
    length: 4.666666666666667,
    guardRailA: true,
    guardRailB: true,
    guardRailC: true,
  },
  floorLanding: {
    width: 10.5,
    length: 6,
    guardRailA: true,
    guardRailB: true,
    guardRailC: true,
  },
  rails: {
    rightGuardRail: true,
    leftGuardRail: false,
    rightHandRail: true,
    leftHandRail: true,
  },
};

// Pre-computed canonical geometry
const STRINGER_LEN = Math.sqrt(6.25 * 6.25 + (110 / 12) ** 2); // 11.094605796...

// ---------------------------------------------------------------------------
// 1. Stair BOM — workbook canonical case
// ---------------------------------------------------------------------------

describe('computeStairBom — workbook canonical (3 levels, 12.5 FtF, midlanding)', () => {
  const items = computeStairBom(CANONICAL);

  it('returns all expected stair component IDs in workbook order', () => {
    const ids = items.map((it) => it.id);
    expect(ids.slice(0, 11)).toEqual([
      'ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-04b',
      'ST-05', 'ST-06', 'ST-07', 'ST-08', 'ST-09', 'ST-10',
    ]);
    // Mid + floor landings + columns follow
    expect(ids).toContain('ST-ML1');
    expect(ids).toContain('ST-FL1');
    expect(ids).toContain('ST-MC');
    expect(ids).toContain('ST-FC');
  });

  describe('ST-01 Stringer — workbook row 9 (qty=12, len=11.0946, weight=2898)', () => {
    const row = findItem(items, 'ST-01');
    it('qty = 2 stringers × 6 flights = 12', () => expect(row.qty).toBe(12));
    it('length = sqrt(6.25² + 9.1667²) ≈ 11.0946', () => {
      expect(row.length).toBeCloseTo(11.094605796411956, 6);
    });
    it('lnFeetToFab = 12 × stringer length ≈ 133.135', () => {
      expect(row.lnFeetToFab).toBeCloseTo(133.13526955694348, 6);
    });
    it('lnF = ceil(133.135 / 20) × 20 = 140', () => expect(row.lnF).toBe(140));
    it('weight = 140 × 20.7 = 2898', () => expect(row.weight).toBeCloseTo(2898, 4));
  });

  describe('ST-02 Tread Support — row 10 (qty=112, len=5, weight=1075.2)', () => {
    const row = findItem(items, 'ST-02');
    it('qty = 4 × 28 treads = 112', () => expect(row.qty).toBe(112));
    it('length = stair width = 5', () => expect(row.length).toBe(5));
    it('lnFeetToFab = 560', () => expect(row.lnFeetToFab).toBe(560));
    it('weight = 560 × 1.92 = 1075.2', () => expect(row.weight).toBeCloseTo(1075.2, 4));
  });

  describe('Form Stringers — rows 11-13 (workbook constants per flight)', () => {
    it('ST-03 (4ft): 6 per flight × 6 = 36, weight=408', () => {
      const row = findItem(items, 'ST-03');
      expect(row.qty).toBe(36);
      expect(row.lnFeetToFab).toBe(144);
      expect(row.lnF).toBe(160);
      expect(row.weight).toBeCloseTo(408, 4);
    });
    it('ST-04 (8ft): 10 per flight × 6 = 60, weight=1224', () => {
      const row = findItem(items, 'ST-04');
      expect(row.qty).toBe(60);
      expect(row.lnFeetToFab).toBe(480);
      expect(row.weight).toBeCloseTo(1224, 4);
    });
    it('ST-04b (5ft): 8 per flight × 6 = 48, weight=612', () => {
      const row = findItem(items, 'ST-04b');
      expect(row.qty).toBe(48);
      expect(row.lnFeetToFab).toBe(240);
      expect(row.weight).toBeCloseTo(612, 4);
    });
  });

  describe('ST-05 Treads Step Steel — row 14 (qty=56, len=5, lnF=280, weight=1260)', () => {
    const row = findItem(items, 'ST-05');
    it('qty = 2 × 28 = 56', () => expect(row.qty).toBe(56));
    it('lnFeetToFab = lnF = 280 (already on 5-ft increment)', () => {
      expect(row.lnFeetToFab).toBe(280);
      expect(row.lnF).toBe(280);
    });
    it('weight = 280 × 4.5 = 1260', () => expect(row.weight).toBeCloseTo(1260, 4));
    it('measure = LnFt, costPerUnit = 18.216', () => {
      expect(row.measure).toBe('LnFt');
      expect(row.costPerUnit).toBeCloseTo(18.216, 4);
    });
  });

  describe('ST-06 Guard Rail (right only) — row 15 (qty=12, len=12.0946)', () => {
    const row = findItem(items, 'ST-06');
    it('qty = 2 rails × 6 flights × 1 side = 12', () => expect(row.qty).toBe(12));
    it('length = stringer + 1 ≈ 12.0946', () => {
      expect(row.length).toBeCloseTo(STRINGER_LEN + 1, 6);
    });
    it('lnFeetToFab ≈ 145.135', () => expect(row.lnFeetToFab).toBeCloseTo(145.13526955694348, 6));
    it('lnF = 160, weight ≈ 434.88', () => {
      expect(row.lnF).toBe(160);
      expect(row.weight).toBeCloseTo(434.88, 4);
    });
  });

  describe('ST-08 Guard Rail Supports — row 17 (qty=48, len=4.5, weight=597.96)', () => {
    const row = findItem(items, 'ST-08');
    it('qty = ceil(11.0946/1.5)=8 per flight × 6 flights × 1 side = 48', () => {
      expect(row.qty).toBe(48);
    });
    it('lnFeetToFab = 216, lnF = 220, weight ≈ 597.96', () => {
      expect(row.lnFeetToFab).toBe(216);
      expect(row.lnF).toBe(220);
      expect(row.weight).toBeCloseTo(597.96, 4);
    });
  });

  describe('ST-09 Hand Rail (both sides) — row 18 (qty=12, len=13.0946)', () => {
    const row = findItem(items, 'ST-09');
    it('qty = 6 flights × 2 sides = 12', () => expect(row.qty).toBe(12));
    it('length = stringer + 2 ≈ 13.0946', () => {
      expect(row.length).toBeCloseTo(STRINGER_LEN + 2, 6);
    });
    it('weight ≈ 434.88 (lnF=160)', () => {
      expect(row.lnF).toBe(160);
      expect(row.weight).toBeCloseTo(434.88, 4);
    });
  });

  describe('ST-10 Brackets — row 19 (qty=60)', () => {
    const row = findItem(items, 'ST-10');
    it('qty = 2×treads + 2×handSides = 60', () => expect(row.qty).toBe(60));
    it('cost = 60 × 20.24 = 1214.40 (priced per piece)', () => {
      expect(row.qty * row.costPerUnit).toBeCloseTo(1214.4, 4);
    });
  });

  // -------------------------------------------------------------------------
  // Mid Landing — Structural.txt rows 22-29
  // -------------------------------------------------------------------------
  describe('Mid landing (3 landings, 10.5×4.667, 3-sided rail)', () => {
    it('ML1 Square: qty=9, len=25.667, lnF=240, weight=3216', () => {
      const row = findItem(items, 'ST-ML1');
      expect(row.qty).toBe(9);
      expect(row.length).toBeCloseTo(25.666666666666668, 6);
      expect(row.lnFeetToFab).toBeCloseTo(231, 6);
      expect(row.lnF).toBe(240);
      expect(row.weight).toBeCloseTo(3216, 4);
    });
    it('ML2 Support: qty=3, len=5 (stair width), weight=620', () => {
      const row = findItem(items, 'ST-ML2');
      expect(row.qty).toBe(3);
      expect(row.length).toBe(5);
      expect(row.weight).toBeCloseTo(620, 4);
    });
    it('ML3 Angles: qty=21, len=4.667, lnF=100, weight=490', () => {
      const row = findItem(items, 'ST-ML3');
      expect(row.qty).toBe(21);
      expect(row.lnFeetToFab).toBeCloseTo(98, 6);
      expect(row.lnF).toBe(100);
      expect(row.weight).toBeCloseTo(490, 4);
    });
    it('ML4 GuardRail: qty=3, len=19.833 (A+B+C), weight≈163.08', () => {
      const row = findItem(items, 'ST-ML4');
      expect(row.qty).toBe(3);
      expect(row.length).toBeCloseTo(19.833333333333336, 6);
      expect(row.weight).toBeCloseTo(163.08, 3);
    });
    it('ML5 GuardRail Supports: qty=15 (5 per landing), weight≈217.44', () => {
      const row = findItem(items, 'ST-ML5');
      expect(row.qty).toBe(15);
      expect(row.weight).toBeCloseTo(217.44, 3);
    });
    it('ML6 Floor Decking: qty=6, lnF=72, weight=324', () => {
      const row = findItem(items, 'ST-ML6');
      expect(row.qty).toBe(6);
      expect(row.lnFeetToFab).toBe(63);
      expect(row.lnF).toBe(72);
      expect(row.weight).toBeCloseTo(324, 4);
    });
  });

  // -------------------------------------------------------------------------
  // Floor Landing — Structural.txt rows 32-39
  // -------------------------------------------------------------------------
  describe('Floor landing (3 landings, 10.5×6, 3-sided rail)', () => {
    it('FL1 Square: qty=9, len=27 (=2W+L), lnF=260, weight=3484', () => {
      const row = findItem(items, 'ST-FL1');
      expect(row.qty).toBe(9);
      expect(row.length).toBe(27);
      expect(row.lnFeetToFab).toBe(243);
      expect(row.lnF).toBe(260);
      expect(row.weight).toBeCloseTo(3484, 4);
    });
    it('FL2 Support: qty=3, len=6 (landing length), weight=620', () => {
      const row = findItem(items, 'ST-FL2');
      expect(row.qty).toBe(3);
      expect(row.length).toBe(6);
      expect(row.lnFeetToFab).toBe(18);
      expect(row.weight).toBeCloseTo(620, 4);
    });
    it('FL3 Angles: qty=21, len=6, lnF=140, weight=686', () => {
      const row = findItem(items, 'ST-FL3');
      expect(row.qty).toBe(21);
      expect(row.lnFeetToFab).toBe(126);
      expect(row.lnF).toBe(140);
      expect(row.weight).toBeCloseTo(686, 4);
    });
    it('FL4 GuardRail: qty=3, len=22.5, commLength=24, lnF=72, weight≈195.696', () => {
      const row = findItem(items, 'ST-FL4');
      expect(row.qty).toBe(3);
      expect(row.length).toBe(22.5);
      expect(row.commLength).toBe(24);
      expect(row.lnF).toBe(72);
      expect(row.weight).toBeCloseTo(195.696, 3);
    });
    it('FL5 GuardRail Supports: qty=18 (6 per landing, ceil(22.5/4)), weight≈271.8', () => {
      const row = findItem(items, 'ST-FL5');
      expect(row.qty).toBe(18);
      expect(row.weight).toBeCloseTo(271.8, 3);
    });
    it('FL6 Floor Decking: qty=6, lnF=72, weight=324', () => {
      const row = findItem(items, 'ST-FL6');
      expect(row.qty).toBe(6);
      expect(row.weight).toBeCloseTo(324, 4);
    });
  });

  // -------------------------------------------------------------------------
  // Columns — Structural.txt rows 42-44
  // -------------------------------------------------------------------------
  describe('Columns (4 per landing × 3 levels each, HSS 4×4×3/16)', () => {
    it('ST-MC mid columns: qty=12, len=12.5, weight=1507.2', () => {
      const row = findItem(items, 'ST-MC');
      expect(row.qty).toBe(12);
      expect(row.length).toBe(12.5);
      expect(row.lnF).toBe(160);
      expect(row.weight).toBeCloseTo(1507.2, 3);
    });
    it('ST-FC floor columns: qty=12, weight=1507.2', () => {
      const row = findItem(items, 'ST-FC');
      expect(row.qty).toBe(12);
      expect(row.weight).toBeCloseTo(1507.2, 3);
    });
  });

  // -------------------------------------------------------------------------
  // Workbook total cross-checks — Structural.txt rows 20/30/40/45/47
  // -------------------------------------------------------------------------
  describe('Workbook section totals (weight rollups)', () => {
    function sumWeights(prefixes: string[]): number {
      return items
        .filter((it) => prefixes.some((p) => it.id === p || it.id.startsWith(p + '-')
          || it.id.startsWith(p)))
        .reduce((s, it) => s + it.weight, 0);
    }
    it('Stairs section weight = 8944.92 (row 20)', () => {
      const stairsWeight = items
        .filter((it) => /^ST-(0\d|10|04b)$/.test(it.id))
        .reduce((s, it) => s + it.weight, 0);
      expect(stairsWeight).toBeCloseTo(8944.92, 2);
    });
    it('Mid landing weight = 5030.52 (row 30)', () => {
      const w = items
        .filter((it) => it.id.startsWith('ST-ML'))
        .reduce((s, it) => s + it.weight, 0);
      expect(w).toBeCloseTo(5030.52, 2);
    });
    it('Floor landing weight = 5581.496 (row 40)', () => {
      const w = items
        .filter((it) => it.id.startsWith('ST-FL'))
        .reduce((s, it) => s + it.weight, 0);
      expect(w).toBeCloseTo(5581.496, 2);
    });
    it('Columns weight = 3014.4 (row 45)', () => {
      const w = items
        .filter((it) => it.id === 'ST-MC' || it.id === 'ST-FC')
        .reduce((s, it) => s + it.weight, 0);
      expect(w).toBeCloseTo(3014.4, 2);
      void sumWeights; // silence unused
    });
    it('Total stair weight = 22571.336 (row 47)', () => {
      const w = items.reduce((s, it) => s + it.weight, 0);
      expect(w).toBeCloseTo(22571.336, 2);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Stair Cost Stack — workbook canonical (Structural.txt rows 48–62)
// ---------------------------------------------------------------------------

describe('computeStairCost — workbook canonical', () => {
  const cost = computeStairCost(CANONICAL);

  it('direct cost ≈ 26174.05 (row 48)', () => {
    expect(cost.directCost).toBeCloseTo(26174.053207998, 2);
  });
  it('total weight ≈ 22571.336', () => {
    expect(cost.weight).toBeCloseTo(22571.336, 2);
  });
  it('labor = weight × 0.60 = 13542.80 (row 49)', () => {
    expect(cost.labor).toBeCloseTo(13542.8016, 2);
  });
  it('overhead = 3% × beforeOverhead ≈ 1300.41 (row 55)', () => {
    expect(cost.overhead).toBeCloseTo(1300.40564424, 2);
  });
  it('subTotal ≈ 44647.26 (row 59)', () => {
    expect(cost.subTotal).toBeCloseTo(44647.26045224, 2);
  });
  it('profit = 10% × subTotal ≈ 4464.73 (row 60, distinct from 15% main)', () => {
    expect(cost.profitRate).toBe(0.10);
    expect(cost.profit).toBeCloseTo(4464.726045224, 2);
  });
  it('commission = 4% × subTotal ≈ 1785.89 (row 61)', () => {
    expect(cost.commissionRate).toBe(0.04);
    expect(cost.commission).toBeCloseTo(1785.8904180896, 2);
  });
  it('grandTotal ≈ 50897.88 (row 62)', () => {
    expect(cost.grandTotal).toBeCloseTo(50897.8769155536, 2);
  });
});

// ---------------------------------------------------------------------------
// 3. Parametric variant — 2 levels, no mid-landing
// ---------------------------------------------------------------------------

describe('computeStairBom — 2 levels, no mid-landing variant', () => {
  const cfg: StairConfig = {
    levels: 2,
    width: 4,
    floorToFloorHeight: 10,
    treadsPerFlight: [13, 13],
    treadRunInches: 11,
    hasMidLanding: false,
    floorLanding: { width: 8, length: 5, guardRailA: true, guardRailB: true, guardRailC: false },
    rails: {
      rightGuardRail: true, leftGuardRail: true,
      rightHandRail: true, leftHandRail: true,
    },
  };
  const items = computeStairBom(cfg);

  it('flights = levels = 2 → stringer qty = 4', () => {
    const st = findItem(items, 'ST-01');
    expect(st.qty).toBe(4);
  });
  it('stringer length = sqrt(10² + (13×11/12)²) ≈ 15.83', () => {
    const st = findItem(items, 'ST-01');
    const expected = Math.sqrt(100 + (13 * 11 / 12) ** 2);
    expect(st.length).toBeCloseTo(expected, 6);
  });
  it('no mid-landing BOM rows present', () => {
    expect(items.find((it) => it.id.startsWith('ST-ML'))).toBeUndefined();
    expect(items.find((it) => it.id === 'ST-MC')).toBeUndefined();
  });
  it('total treads = 26 → tread supports = 104, step steel = 52', () => {
    expect(findItem(items, 'ST-02').qty).toBe(104);
    expect(findItem(items, 'ST-05').qty).toBe(52);
  });
  it('guard rail: both sides × 2 flights × 2 pipes = 8', () => {
    expect(findItem(items, 'ST-06').qty).toBe(8);
  });
  it('hand rail: both sides × 2 flights = 4', () => {
    expect(findItem(items, 'ST-09').qty).toBe(4);
  });
  it('floor landing: 2 landings, 2-sided rail (A+B = 5+8 = 13 ft)', () => {
    const rail = findItem(items, 'ST-FL4');
    expect(rail.qty).toBe(2);
    expect(rail.length).toBe(13);
  });
  it('floor columns: 4 per landing × 2 levels = 8', () => {
    expect(findItem(items, 'ST-FC').qty).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// 4. Cost overrides
// ---------------------------------------------------------------------------

describe('computeStairCost — overrides', () => {
  it('profit rate override flows through to grand total', () => {
    const a = computeStairCost(CANONICAL);
    const b = computeStairCost(CANONICAL, { profitRate: 0.15 });
    expect(b.profitRate).toBe(0.15);
    expect(b.profit).toBeGreaterThan(a.profit);
    expect(b.grandTotal).toBeGreaterThan(a.grandTotal);
  });
  it('default profit rate is 10% (issue #5 AC item 6)', () => {
    const c = computeStairCost(CANONICAL);
    expect(c.profitRate).toBe(0.10);
  });
});
