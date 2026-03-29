/** Direction of a lean-to extension */
export type LeanToDirection = 'right' | 'left' | 'front' | 'back';

/** Roof style variants */
export type RoofType = 'gable' | 'single-slope';

/** Component categories matching Excel sheet sections */
export type ComponentCategory =
  | 'main-framing'
  | 'canopy'
  | 'overhangs'
  | 'leanto-right'
  | 'leanto-left'
  | 'leanto-front'
  | 'leanto-back'
  | 'plates'
  | 'frame-openings'
  | 'purlins-girts'
  | 'base-rake-angles'
  | 'roof-wall-sheeting'
  | 'roof-trim'
  | 'wall-trim'
  | 'doors-windows'
  | 'standard-hardware'
  | 'anchor-bolts'
  | 'bolts'
  | 'cable-bracing'
  | 'fasteners'
  | 'insulation'
  | 'stairs'
  | 'structural-landing'
  | 'structural-columns';

/** Material group matching MAE sheet */
export type MaterialGroup =
  | 'BEAMS'
  | 'COLD FORM'
  | 'FLAT BARS'
  | 'ANGLES'
  | 'EAVE STRUT'
  | 'SHEETING'
  | 'ROOF TRIM'
  | 'WALL TRIM'
  | 'DOOR AND WINDOWS'
  | 'HARDWARE'
  | 'INSULATION'
  | 'BOLTS AND FASTENERS'
  | 'PIPES'
  | 'HSS'
  | 'CHANNELS';

/** A lean-to configuration */
export interface LeanTo {
  enabled: boolean;
  length: number;
  width: number;
}

/** Insulation options */
export interface InsulationConfig {
  roof: boolean;
  wall: boolean;
  additional: boolean;
}

/** Main building dimensions */
export interface BuildingDimensions {
  width: number;
  length: number;
  eaveHeight: number;
  roofPitch: number;
  baySpacing: number;
}

/** Component line item -- matches the real Excel column structure */
export interface ComponentItem {
  id: string;
  category: ComponentCategory;
  description: string;
  qty: number;
  length: number;
  lnFeetToFab: number;
  enabled: boolean;
  group: MaterialGroup | string;
  material: string;
  commLength: number;
  measure: string;
  costPerUnit: number;
  weight: number;
  lnF: number;
}

/** Full building configuration */
export interface BuildingConfig {
  projectName: string;
  customerName: string;
  jobLocation: string;
  roofType: RoofType;
  dimensions: BuildingDimensions;
  leanTos: Record<LeanToDirection, LeanTo>;
  insulation: InsulationConfig;
  components: ComponentItem[];
}

/** Calculated cost breakdown matching Summary sheet structure */
export interface CostBreakdown {
  mainBuildingArea: number;
  leanToAreas: Record<LeanToDirection, number>;
  totalArea: number;
  roofArea: number;
  // Structural Steel
  beamsCost: number;
  canopyCost: number;
  overhangCost: number;
  leanToCost: number;
  platesCost: number;
  framesCost: number;
  structuralTotal: number;
  structuralWeight: number;
  // Components
  purlinsGirtsCost: number;
  anglesCost: number;
  sheetingCost: number;
  roofWallTrimCost: number;
  doorsWindowsCost: number;
  hardwareCost: number;
  componentsTotal: number;
  componentsWeight: number;
  // Insulation
  insulationTotal: number;
  // Fasteners
  anchorBoltsCost: number;
  boltsCost: number;
  bracingCost: number;
  fastenersCost: number;
  fastenersTotal: number;
  // Totals
  directMaterials: number;
  labor: number;
  totalMaterialsLabor: number;
  detailing: number;
  engineering: number;
  loadingHauling: number;
  freight: number;
  overheadCost: number;
  erection: number;
  subTotal: number;
  profitRate: number;
  profit: number;
  commissionRate: number;
  commission: number;
  grandTotal: number;
}

/** Create default empty config */
export function createDefaultConfig(): BuildingConfig {
  const emptyLeanTo = (): LeanTo => ({ enabled: false, length: 0, width: 0 });
  return {
    projectName: '',
    customerName: '',
    jobLocation: '',
    roofType: 'gable',
    dimensions: { width: 0, length: 0, eaveHeight: 0, roofPitch: 4, baySpacing: 25 },
    leanTos: {
      right: emptyLeanTo(),
      left: emptyLeanTo(),
      front: emptyLeanTo(),
      back: emptyLeanTo(),
    },
    insulation: { roof: false, wall: false, additional: false },
    components: [],
  };
}
