/**
 * UI logic tests for the SummaryPage freight section (#14).
 *
 * The page itself is rendered React JSX and we don't have @testing-library/react
 * wired up (vitest env = node). So instead we exercise the same decisions the UI
 * component makes — auto vs manual branch selection, default fallbacks for
 * legacy configs missing the new fields, and value preservation across the
 * auto/manual toggle. The actual freight precedence math lives in
 * `resolveFreight` (covered by freight.test.ts).
 */

import { describe, it, expect } from 'vitest';
import { resolveFreight } from '../calculator';
import { createDefaultConfig } from '../types';
import type { ProjectOverheads } from '../types';

/** Mirrors the fallbacks SummaryPage applies when reading overheads. */
function readFreightUIState(o: ProjectOverheads) {
  const freightAutoCalc = o.freightAutoCalc ?? true;
  const freightDistance = o.freightDistance ?? 0;
  const freightRate = o.freightRate ?? 4.6;
  return {
    freightAutoCalc,
    freightDistance,
    freightRate,
    showAutoFields: freightAutoCalc,
    showManualField: !freightAutoCalc,
    computed: resolveFreight({ ...o, freightAutoCalc: true, freightDistance, freightRate }),
  };
}

describe('SummaryPage freight section (#14) — UI state', () => {
  it('default config: auto-calc fields visible, flat input hidden', () => {
    const { overheads } = createDefaultConfig();
    const ui = readFreightUIState(overheads);
    expect(ui.showAutoFields).toBe(true);
    expect(ui.showManualField).toBe(false);
    expect(ui.freightRate).toBe(4.6);
    expect(ui.freightDistance).toBe(0);
    expect(ui.computed).toBe(0);
  });

  it('toggling freightAutoCalc to false swaps which input group is shown', () => {
    const { overheads } = createDefaultConfig();
    const ui = readFreightUIState({ ...overheads, freightAutoCalc: false });
    expect(ui.showAutoFields).toBe(false);
    expect(ui.showManualField).toBe(true);
  });

  it('legacy config without freight* fields falls back to auto + default 4.6 $/km', () => {
    const legacy: ProjectOverheads = {
      laborRate: 0.75, detailing: 0, engineering: 0, loadingHauling: 0,
      freight: 1234, overheadRate: 0, erection: 0, foundation: 0,
      permits: 0, profitRate: 0, commissionRate: 0,
    };
    const ui = readFreightUIState(legacy);
    expect(ui.freightAutoCalc).toBe(true);
    expect(ui.freightRate).toBe(4.6);
    expect(ui.freightDistance).toBe(0);
    expect(ui.showAutoFields).toBe(true);
  });

  it('computed freight reflects distance × rate (200 × 4.6 = 920)', () => {
    const { overheads } = createDefaultConfig();
    const ui = readFreightUIState({ ...overheads, freightDistance: 200, freightRate: 4.6 });
    expect(ui.computed).toBeCloseTo(920, 5);
  });

  it('preserves distance/rate values when toggled to manual, then back', () => {
    const { overheads } = createDefaultConfig();
    const populated: ProjectOverheads = {
      ...overheads,
      freightAutoCalc: true,
      freightDistance: 150,
      freightRate: 5.2,
      freight: 7777,
    };
    // Toggle to manual — engine uses flat, but distance/rate must persist on the object.
    const manual = { ...populated, freightAutoCalc: false };
    expect(manual.freightDistance).toBe(150);
    expect(manual.freightRate).toBe(5.2);
    expect(resolveFreight(manual)).toBe(7777);
    // Toggle back to auto — distance × rate is restored without re-entry.
    const auto = { ...manual, freightAutoCalc: true };
    expect(resolveFreight(auto)).toBeCloseTo(150 * 5.2, 5);
    expect(auto.freight).toBe(7777); // flat value still retained too
  });
});
