import type { BuildingConfig, CostBreakdown, LeanToDirection, ComponentCategory } from './types';

const LEAN_TO_DIRECTIONS: LeanToDirection[] = ['right', 'left', 'front', 'back'];

/** Sum the direct cost (qty * lnFeetToFab * costPerUnit or qty * costPerUnit) for components in given categories */
function sumCategories(config: BuildingConfig, categories: ComponentCategory[]): number {
  return config.components
    .filter((c) => categories.includes(c.category))
    .reduce((sum, c) => sum + c.qty * c.costPerUnit * (c.lnFeetToFab > 0 ? c.lnFeetToFab / c.qty || 1 : 1), 0);
}

/** Simple sum: qty * costPerUnit for components matching categories */
function simpleSum(config: BuildingConfig, categories: ComponentCategory[]): number {
  return config.components
    .filter((c) => categories.includes(c.category))
    .reduce((sum, c) => sum + c.qty * c.costPerUnit, 0);
}

/** Sum weight for components matching categories */
function sumWeight(config: BuildingConfig, categories: ComponentCategory[]): number {
  return config.components
    .filter((c) => categories.includes(c.category))
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

  // Structural Steel
  const beamsCost = simpleSum(config, ['main-framing']);
  const canopyCost = simpleSum(config, ['canopy']);
  const overhangCost = simpleSum(config, ['overhangs']);
  const leanToCost = simpleSum(config, ['leanto-right', 'leanto-left', 'leanto-front', 'leanto-back']);
  const platesCost = simpleSum(config, ['plates']);
  const framesCost = simpleSum(config, ['frame-openings']);
  const structuralTotal = beamsCost + canopyCost + overhangCost + leanToCost + platesCost + framesCost;
  const structuralWeight = sumWeight(config, ['main-framing', 'canopy', 'overhangs', 'leanto-right', 'leanto-left', 'leanto-front', 'leanto-back', 'plates', 'frame-openings']);

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
  const laborRate = 0.75;
  const labor = (structuralWeight + componentsWeight) * laborRate;
  const totalMaterialsLabor = directMaterials + labor;
  const detailing = 5000;
  const engineering = 1500;
  const loadingHauling = 0;
  const freight = 0;
  const overheadRate = 0.02;
  const overheadCost = totalMaterialsLabor * overheadRate;
  const erection = 0;

  const subTotal = totalMaterialsLabor + detailing + engineering + loadingHauling + freight + overheadCost + erection;
  const profitRate = 0.15;
  const profit = subTotal * profitRate;
  const commissionRate = 0.04;
  const commission = subTotal * commissionRate;
  const grandTotal = subTotal + profit + commission;

  return {
    mainBuildingArea,
    leanToAreas,
    totalArea,
    roofArea,
    beamsCost, canopyCost, overhangCost, leanToCost, platesCost, framesCost,
    structuralTotal, structuralWeight,
    purlinsGirtsCost, anglesCost, sheetingCost, roofWallTrimCost, doorsWindowsCost, hardwareCost,
    componentsTotal, componentsWeight,
    insulationTotal,
    anchorBoltsCost, boltsCost, bracingCost, fastenersCost, fastenersTotal,
    directMaterials, labor, totalMaterialsLabor,
    detailing, engineering, loadingHauling, freight, overheadCost, erection,
    subTotal, profitRate, profit, commissionRate, commission, grandTotal,
  };
}

/** Format a number as USD currency */
export function formatUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
