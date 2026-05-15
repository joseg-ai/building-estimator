import type { BuildingConfig, CostBreakdown, LeanToDirection, ComponentCategory, ComponentItem } from './types';

const LEAN_TO_DIRECTIONS: LeanToDirection[] = ['right', 'left', 'front', 'back'];

/**
 * Material groups that are fabricated in-house (cut, drilled, welded, painted in the
 * shop) and therefore incur fabrication labor. Cold-formed sections, sheeting, trim,
 * fasteners, insulation, doors and hardware ship cut-to-length from the supplier —
 * no in-house labor applies regardless of structural category.
 * Source: Reuben's PEMB assessment (2026-05-14), `.squad/decisions.md`.
 */
const IN_HOUSE_FAB_GROUPS = new Set<string>([
  'BEAMS',
  'CHANNELS',
  'FLAT BARS',
  'ANGLES',
  'PIPES',
  'HSS',
]);

function isInHouseFabricated(group: string): boolean {
  return IN_HOUSE_FAB_GROUPS.has((group ?? '').trim().toUpperCase());
}

/** Linear-foot pricing variants seen in the catalog (`Ln Ft`, `Ln ft`, etc.). */
function isLnFtMeasure(measure: string): boolean {
  const m = (measure ?? '').trim().toLowerCase();
  return m === 'ln ft' || m === 'ln. ft' || m === 'lnft' || m === 'linear ft' || m === 'linft';
}

/** Weight-priced ($/lb) measure variants. */
function isWeightMeasure(measure: string): boolean {
  const m = (measure ?? '').trim().toLowerCase();
  return m === 'pound/ft' || m === 'lb/ft' || m === 'pound' || m === 'lb' || m === '$/lb';
}

/**
 * Direct cost of a single structural component, dispatching on `measure`:
 *   - `Ln Ft`    → linearFeet × costPerUnit  (cold-form Cee / linear-foot pricing)
 *   - `Pound/ft` → weight × costPerUnit       (steel priced per pound)
 *   - default    → fall back to weight×cost when weight present, else qty×cost
 * linearFeet uses `lnF` if populated, otherwise `qty × length` so that linear-foot
 * priced rows (e.g. frame openings) never silently return $0 just because the
 * pre-calculated lnF roll-up hasn't been written back.
 */
function structuralComponentCost(c: ComponentItem): number {
  if (isLnFtMeasure(c.measure)) {
    const lnFt = c.lnF > 0 ? c.lnF : c.qty * c.length;
    return lnFt * c.costPerUnit;
  }
  if (isWeightMeasure(c.measure)) {
    return c.weight * c.costPerUnit;
  }
  // Legacy / unspecified measure — preserve the previous behavior to avoid
  // regressing rows authored before `measure` was populated.
  if (c.weight > 0) return c.weight * c.costPerUnit;
  return c.qty * c.costPerUnit;
}

/** Simple sum: qty * costPerUnit for components matching categories */
function simpleSum(config: BuildingConfig, categories: ComponentCategory[]): number {
  return config.components
    .filter((c) => categories.includes(c.category))
    .reduce((sum, c) => sum + c.qty * c.costPerUnit, 0);
}

/** Weight-based sum: weight * costPerUnit (for structural steel where cost is $/lb) */
function weightCostSum(config: BuildingConfig, categories: ComponentCategory[]): number {
  return config.components
    .filter((c) => categories.includes(c.category))
    .reduce((sum, c) => sum + c.weight * c.costPerUnit, 0);
}

/**
 * Cost sum for structural categories whose rows mix weight-priced ($/lb) and
 * linear-foot-priced ($/LnFt) items — e.g. frame-openings, where cold-form Cee
 * sections are priced per linear foot but a future steel-jamb row might be $/lb.
 * Dispatches per-row on `measure` via structuralComponentCost.
 */
function structuralMixedSum(config: BuildingConfig, categories: ComponentCategory[]): number {
  return config.components
    .filter((c) => categories.includes(c.category))
    .reduce((sum, c) => sum + structuralComponentCost(c), 0);
}

/** Sum weight for components matching categories */
function sumWeight(config: BuildingConfig, categories: ComponentCategory[]): number {
  return config.components
    .filter((c) => categories.includes(c.category))
    .reduce((sum, c) => sum + c.weight, 0);
}

/**
 * Weight of in-house-fabricated structural steel only — the correct base for the
 * fabrication labor charge. Cold-formed members ship cut-to-length and do not
 * incur shop labor regardless of which structural category they live in.
 */
function sumLaborBaseWeight(config: BuildingConfig, categories: ComponentCategory[]): number {
  return config.components
    .filter((c) => categories.includes(c.category) && isInHouseFabricated(c.group))
    .reduce((sum, c) => sum + c.weight, 0);
}

/** Compute full cost breakdown matching the Summary sheet layout */
export function calculateCosts(config: BuildingConfig): CostBreakdown {
  const { dimensions, leanTos } = config;
  const pitch = dimensions.roofPitch;
  const rafterLength = dimensions.width > 0 ? (dimensions.width / 2) * Math.sqrt(1 + (pitch / 12) ** 2) : 0;

  const mainBuildingArea = dimensions.width * dimensions.length;
  const roofArea = rafterLength * dimensions.length * 2;

  const leanToAreas = {} as Record<LeanToDirection, number>;
  for (const dir of LEAN_TO_DIRECTIONS) {
    const lt = leanTos[dir];
    leanToAreas[dir] = lt.enabled ? lt.length * lt.width : 0;
  }
  const totalArea = mainBuildingArea + Object.values(leanToAreas).reduce((a, b) => a + b, 0);

  // Structural Steel (cost = weight * $/lb for steel; linear-foot for cold-form jambs)
  const beamsCost = weightCostSum(config, ['main-framing']);
  const canopyCost = weightCostSum(config, ['canopy']);
  const overhangCost = weightCostSum(config, ['overhangs']);
  const leanToCost = weightCostSum(config, ['leanto-right', 'leanto-left', 'leanto-front', 'leanto-back']);
  const platesCost = weightCostSum(config, ['plates']);
  // Bug #2: frame openings are cold-form Cee sections priced per Ln Ft (weight=0).
  // Dispatch on `measure` so $/LnFt rows are not silently zeroed out by weight×cost.
  const framesCost = structuralMixedSum(config, ['frame-openings']);
  const structuralTotal = beamsCost + canopyCost + overhangCost + leanToCost + platesCost + framesCost;
  const STRUCTURAL_CATEGORIES: ComponentCategory[] = [
    'main-framing', 'canopy', 'overhangs',
    'leanto-right', 'leanto-left', 'leanto-front', 'leanto-back',
    'plates', 'frame-openings',
  ];
  const structuralWeight = sumWeight(config, STRUCTURAL_CATEGORIES);
  // Bug #1: labor is fabrication labor — only in-house-fabbed steel (BEAMS, CHANNELS,
  // FLAT BARS, ANGLES, PIPES, HSS) counts. Cold-formed members in any structural
  // category ship cut-to-length from the supplier and contribute zero shop labor.
  const laborBaseWeight = sumLaborBaseWeight(config, STRUCTURAL_CATEGORIES);

  // Components
  const purlinsGirtsCost = simpleSum(config, ['purlins-girts']);
  const anglesCost = simpleSum(config, ['base-rake-angles']);
  const sheetingCost = simpleSum(config, ['roof-wall-sheeting']);
  const roofWallTrimCost = simpleSum(config, ['roof-trim', 'wall-trim']);
  const doorsWindowsCost = simpleSum(config, ['doors-windows']);
  const hardwareCost = simpleSum(config, ['standard-hardware']);
  const componentsTotal = purlinsGirtsCost + anglesCost + sheetingCost + roofWallTrimCost + doorsWindowsCost + hardwareCost;
  const componentsWeight = sumWeight(config, ['purlins-girts', 'base-rake-angles', 'roof-wall-sheeting', 'roof-trim', 'wall-trim', 'doors-windows', 'standard-hardware']);

  // Insulation
  const insulationTotal = simpleSum(config, ['insulation']);

  // Fasteners
  const anchorBoltsCost = simpleSum(config, ['anchor-bolts']);
  const boltsCost = simpleSum(config, ['bolts']);
  const bracingCost = simpleSum(config, ['cable-bracing']);
  const fastenersCost = simpleSum(config, ['fasteners']);
  const fastenersTotal = anchorBoltsCost + boltsCost + bracingCost + fastenersCost;

  // Stairs / Structural
  const stairsCost = simpleSum(config, ['stairs', 'structural-landing', 'structural-columns']);

  // Grand totals (matching Summary sheet formulas)
  const directMaterials = structuralTotal + componentsTotal + insulationTotal + fastenersTotal + stairsCost;
  const { laborRate, detailing, engineering, loadingHauling, freight, overheadRate, erection, foundation, permits, profitRate, commissionRate } = config.overheads;
  // Bug #1 fix: labor base = in-house fabricated structural weight only.
  // (Cold-formed purlins/girts/sheeting/trim ship cut-to-length — no shop labor.)
  const labor = laborBaseWeight * laborRate;
  const totalMaterialsLabor = directMaterials + labor;
  const overheadCost = totalMaterialsLabor * overheadRate;

  const subTotal = totalMaterialsLabor + detailing + engineering + loadingHauling + freight + overheadCost + erection + foundation + permits;
  const profit = subTotal * profitRate;
  const commission = subTotal * commissionRate;

  // Sales tax (issue #13). Base is taken verbatim from the issue spec:
  //   Materials + Labor + Freight + Overhead + Erection + Foundation + Permits
  //   + Contingency + Profit + Commission
  // Note this base intentionally excludes detailing, engineering, loadingHauling.
  // Contingency line (#15) is not yet implemented — treated as 0 for now so the
  // formula can light up the moment contingency lands without changing this code.
  const contingency = 0;
  const salesTaxBase =
    directMaterials + labor + freight + overheadCost + erection + foundation + permits +
    contingency + profit + commission;
  const salesTaxRate = config.salesTaxRate ?? 0;
  const salesTaxIncluded = config.salesTaxIncluded === true;
  const salesTax = salesTaxBase * salesTaxRate;
  const grandTotal = subTotal + profit + commission + (salesTaxIncluded ? salesTax : 0);

  // Cold-formed linear feet: sum of lnF (or qty×length) for COLD FORM / Ln Ft items.
  const coldFormedLengthFt = config.components
    .filter((c) => (c.group ?? '').trim().toUpperCase() === 'COLD FORM' && isLnFtMeasure(c.measure))
    .reduce((sum, c) => sum + (c.lnF > 0 ? c.lnF : c.qty * c.length), 0);

  return {
    mainBuildingArea,
    leanToAreas,
    totalArea,
    roofArea,
    beamsCost, canopyCost, overhangCost, leanToCost, platesCost, framesCost,
    structuralTotal, structuralWeight, laborBaseWeight,
    purlinsGirtsCost, anglesCost, sheetingCost, roofWallTrimCost, doorsWindowsCost, hardwareCost,
    componentsTotal, componentsWeight,
    insulationTotal,
    anchorBoltsCost, boltsCost, bracingCost, fastenersCost, fastenersTotal,
    directMaterials, labor, totalMaterialsLabor,
    detailing, engineering, loadingHauling, freight, overheadCost, erection, foundation, permits,
    subTotal, profitRate, profit, commissionRate, commission,
    salesTaxRate, salesTaxIncluded, salesTaxBase, salesTax,
    coldFormedLengthFt,
    grandTotal,
  };
}

/** Format a number as USD currency */
export function formatUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
