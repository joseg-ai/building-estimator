import type { BuildingConfig, CostBreakdown, LeanToDirection, ComponentCategory, ComponentItem, ProjectOverheads, OpeningType, DoorWindowEntry } from './types';
import { getPanelUnitPrice, getTrimUnitPrice, getRValuePrice } from './priceList';
import { OPENING_DEFAULT_WALL_SIDE } from './types';

/**
 * Resolve the freight charge for a project (Issue #14).
 *
 * Precedence rules — auto-calc wins when enabled; flat is a pure override:
 *   - freightAutoCalc === true  → freight = max(0, freightDistance × freightRate).
 *     The flat `freight` field is COMPLETELY IGNORED in this branch, even if
 *     the auto-calc product is 0. (Workbook ref: Summary.txt row 78,
 *     col 10 = distance, col 11 = rate, col 14 = distance × rate.)
 *   - freightAutoCalc === false → freight = flat `freight` field as entered.
 *   - freightAutoCalc === undefined (legacy configs loaded from older
 *     localStorage that predate Issue #14) → treated as `false`, preserving
 *     the historical flat-freight behavior.
 *
 * Default workbook rate: 4.6 $/km (per Issue #14 body).
 */
export function resolveFreight(overheads: ProjectOverheads): number {
  if (overheads.freightAutoCalc === true) {
    const distance = overheads.freightDistance ?? 0;
    const rate = overheads.freightRate ?? 0;
    return Math.max(0, distance * rate);
  }
  return overheads.freight ?? 0;
}

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

// ---------------------------------------------------------------------------
// Issue #8 — Color-aware sheeting / trim cost
// ---------------------------------------------------------------------------

/**
 * Map a SHEETING-group component to the correct color role.
 * Returns 'roof' if the description contains "Roof" (but not "Wall" or "Liner"),
 * 'wall' for wall/liner panels, null for ridge caps, soffits, and other non-panel items.
 */
function sheetingColorRole(c: ComponentItem): 'roof' | 'wall' | null {
  if ((c.group ?? '').toUpperCase() !== 'SHEETING') return null;
  const desc = (c.description ?? '').toLowerCase();
  if (desc.includes('soffit') || desc.includes('ridge') || desc.includes('peak')) return null;
  if (desc.includes('roof') || desc.includes('lean-to') || desc.includes('canopy')) return 'roof';
  if (desc.includes('wall') || desc.includes('liner')) return 'wall';
  return null;
}

/**
 * Cost of a single sheeting component, substituting the color-based unit price
 * for roof and wall panels.  Ridge caps, soffits, and unknowns keep their stored
 * costPerUnit (no color adjustment).
 */
function colorAdjustedSheetingCost(c: ComponentItem, config: BuildingConfig): number {
  const role = sheetingColorRole(c);
  if (role === 'roof') {
    return c.qty * getPanelUnitPrice(config.roofColor, 'roof');
  }
  if (role === 'wall') {
    return c.qty * getPanelUnitPrice(config.wallColor, 'wall');
  }
  return c.qty * c.costPerUnit;
}

/**
 * Cost of a single trim component, substituting the color-based trim price.
 * Only applied to ROOF TRIM and WALL TRIM group items.
 * Per-piece items (Ea / pc) keep their stored costPerUnit (no color adjustment).
 */
function colorAdjustedTrimCost(c: ComponentItem, config: BuildingConfig): number {
  const grp = (c.group ?? '').toUpperCase();
  if (grp !== 'ROOF TRIM' && grp !== 'WALL TRIM') return c.qty * c.costPerUnit;
  const meas = (c.measure ?? '').toLowerCase();
  // Only adjust linear-foot-priced trim; per-piece items (end caps, straps) keep stored price
  if (meas === 'ln ft' || meas === 'lnft' || meas === 'linear ft') {
    return c.qty * getTrimUnitPrice(config.trimColor);
  }
  return c.qty * c.costPerUnit;
}

/** Color-adjusted sum for roof-wall-sheeting category. */
function colorAdjustedSheetingSum(config: BuildingConfig): number {
  return config.components
    .filter((c) => c.category === 'roof-wall-sheeting')
    .reduce((sum, c) => sum + colorAdjustedSheetingCost(c, config), 0);
}

/** Color-adjusted sum for roof-trim and wall-trim categories. */
function colorAdjustedTrimSum(config: BuildingConfig): number {
  return config.components
    .filter((c) => c.category === 'roof-trim' || c.category === 'wall-trim')
    .reduce((sum, c) => sum + colorAdjustedTrimCost(c, config), 0);
}

// ---------------------------------------------------------------------------
// Issue #10 — Auto-calculated insulation cost
// Issue #35 — Split into side-wall vs end-wall sub-totals with per-opening
//             wall-side attribution.
// ---------------------------------------------------------------------------

/**
 * Issue #35: precedence helper for opening → wall-side resolution.
 * If the opening explicitly carries a `wallSide`, that wins; otherwise the
 * caller-supplied default applies. Exported so future UI components share
 * exactly the same precedence rule as the calculator.
 */
export function getOpeningWallSide(
  opening: { wallSide?: 'side' | 'end' },
  defaultSide: 'side' | 'end',
): 'side' | 'end' {
  return opening.wallSide ?? defaultSide;
}

/**
 * Issue #35: resolve the effective wall side for a typed opening slot,
 * applying the PEMB default from `OPENING_DEFAULT_WALL_SIDE` when the
 * opening itself has no `wallSide` set (true for older localStorage configs
 * created before this field existed).
 */
export function getEffectiveWallSide(
  opening: { wallSide?: 'side' | 'end' },
  type: OpeningType,
): 'side' | 'end' {
  return getOpeningWallSide(opening, OPENING_DEFAULT_WALL_SIDE[type]);
}

/**
 * Average end-wall height for a building, accounting for the gable triangle
 * (gable roof) or full slope (single-slope / mono-slope roof).
 *
 * Derivation — gable:
 *   End wall = rectangle (width × eaveHeight) + triangle (½ × width × slopeRise)
 *   where slopeRise = (roofPitch/12) × (width/2).
 *   avgH = (rect + triangle) / width
 *        = eaveHeight + slopeRise/2
 *        = eaveHeight + (roofPitch × width) / 48
 *
 * Derivation — single-slope:
 *   End wall is a trapezoid with parallel sides eaveHeight and
 *   (eaveHeight + slopeRise), base = width.
 *   slopeRise = (roofPitch/12) × width.
 *   avgH = eaveHeight + slopeRise/2
 *        = eaveHeight + (roofPitch × width) / 24
 */
export function avgEndWallHeight(
  width: number,
  eaveHeight: number,
  roofPitch: number,
  roofType: 'gable' | 'single-slope' = 'gable',
): number {
  if (roofType === 'single-slope') {
    return eaveHeight + (roofPitch * width) / 24;
  }
  return eaveHeight + (roofPitch * width) / 48;
}

/** Issue #35: per-component insulation cost breakdown (dollars). Linus may
 *  surface these on the UI. Sub-total clamping is independent per wall side,
 *  so a wall over-deducted by openings cannot bleed negative area into the
 *  opposite wall. */
export interface InsulationBreakdown {
  roof: number;
  sideWall: number;
  endWall: number;
  total: number;
}

/** Sum opening sqft attributed to the requested wall side. */
function openingsSqftOnSide(
  doorsWindows: BuildingConfig['doorsWindows'],
  side: 'side' | 'end',
): number {
  const pick = (op: DoorWindowEntry, type: OpeningType, nominalW: number, nominalH: number): number =>
    getEffectiveWallSide(op, type) === side ? op.qty * nominalW * nominalH : 0;

  const arr = (entries: DoorWindowEntry[], type: OpeningType): number =>
    entries.reduce((s, d) => {
      if (getEffectiveWallSide(d, type) !== side) return s;
      return s + d.qty * Math.max(0, d.width) * Math.max(0, d.height);
    }, 0);

  return (
    pick(doorsWindows.doors3070, 'doors3070', 3, 7) +
    pick(doorsWindows.doors4070, 'doors4070', 4, 7) +
    pick(doorsWindows.door6070,  'door6070',  6, 7) +
    arr(doorsWindows.rollUpDoors,   'rollUpDoors') +
    arr(doorsWindows.frameOpenings, 'frameOpenings') +
    pick(doorsWindows.window3030, 'window3030', 3, 3) +
    pick(doorsWindows.window4030, 'window4030', 4, 3) +
    pick(doorsWindows.window6030, 'window6030', 6, 3) +
    pick(doorsWindows.window6040, 'window6040', 6, 4)
  );
}

/**
 * Compute insulation cost broken down into roof / side-wall / end-wall.
 *
 * Side walls (always 2 of them, eaveHeight tall):  gross = 2 × length × eaveHeight
 * End walls  (always 2 of them, avg trapezoidal):  gross = 2 × width  × avgEndWallH
 *
 * Each net sqft is clamped to ≥ 0 independently before pricing, so an
 * over-deducted wall does not subtract from its neighbour.
 *
 * Manual-override path (any insulation component qty > 0) returns the simple
 * sum as `total` with no geometry breakdown (sideWall/endWall/roof all 0).
 */
export function computeInsulationBreakdown(config: BuildingConfig): InsulationBreakdown {
  const hasManual = config.components
    .filter((c) => c.category === 'insulation')
    .some((c) => c.qty > 0);

  if (hasManual) {
    return { roof: 0, sideWall: 0, endWall: 0, total: simpleSum(config, ['insulation']) };
  }

  const { dimensions, doorsWindows, insulation, roofType } = config;
  const rValuePrice = getRValuePrice(insulation.rValue);
  const breakdown: InsulationBreakdown = { roof: 0, sideWall: 0, endWall: 0, total: 0 };

  const haveDims = dimensions.width > 0 && dimensions.length > 0;

  if (insulation.roof && haveDims) {
    const slopeFactor = Math.sqrt(1 + (dimensions.roofPitch / 12) ** 2);
    const roofSqft = (dimensions.width / 2) * slopeFactor * 2 * dimensions.length;
    breakdown.roof = roofSqft * rValuePrice;
  }

  if (insulation.wall && haveDims && dimensions.eaveHeight > 0) {
    // Side walls: 2 × length × eaveHeight, minus side-wall openings.
    const sideGross = 2 * dimensions.length * dimensions.eaveHeight;
    const sideOpenings = openingsSqftOnSide(doorsWindows, 'side');
    const sideNet = Math.max(0, sideGross - sideOpenings);
    breakdown.sideWall = sideNet * rValuePrice;

    // End walls: 2 × width × avgEndWallH, minus end-wall openings.
    const avgEndH = avgEndWallHeight(
      dimensions.width,
      dimensions.eaveHeight,
      dimensions.roofPitch,
      roofType,
    );
    const endGross = 2 * dimensions.width * avgEndH;
    const endOpenings = openingsSqftOnSide(doorsWindows, 'end');
    const endNet = Math.max(0, endGross - endOpenings);
    breakdown.endWall = endNet * rValuePrice;
  }

  breakdown.total = breakdown.roof + breakdown.sideWall + breakdown.endWall;
  return breakdown;
}

/**
 * Compute total insulation cost.
 *
 * Override path: if any insulation component has qty > 0, the user has manually
 * entered quantities → use simpleSum (qty × costPerUnit) as stored.
 *
 * Auto-calc path: see `computeInsulationBreakdown` for the per-wall split
 * (Issue #35). Roof formula and wall on/off toggle behavior preserved from
 * Issue #10. End walls now include the gable triangle area on average, so the
 * new total is slightly higher than the old combined-perimeter calc — this is
 * the bug fix from PR #32's audit.
 */
export function computeInsulationCost(config: BuildingConfig): number {
  return computeInsulationBreakdown(config).total;
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
  // Issue #8: sheeting and trim costs use color-based unit prices for panel/trim SKUs.
  const sheetingCost = colorAdjustedSheetingSum(config);
  const roofWallTrimCost = colorAdjustedTrimSum(config);
  const doorsWindowsCost = simpleSum(config, ['doors-windows']);
  const hardwareCost = simpleSum(config, ['standard-hardware']);
  const componentsTotal = purlinsGirtsCost + anglesCost + sheetingCost + roofWallTrimCost + doorsWindowsCost + hardwareCost;
  const componentsWeight = sumWeight(config, ['purlins-girts', 'base-rake-angles', 'roof-wall-sheeting', 'roof-trim', 'wall-trim', 'doors-windows', 'standard-hardware']);

  // Issue #10: insulation cost auto-calculated from geometry (falls back to manual qty override).
  const insulationTotal = computeInsulationCost(config);

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
  const { laborRate, detailing, engineering, loadingHauling, overheadRate, erection, foundation, permits, profitRate, commissionRate } = config.overheads;
  // Issue #14: freight may be auto-calculated (distance × rate) or a flat override.
  const freight = resolveFreight(config.overheads);
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
