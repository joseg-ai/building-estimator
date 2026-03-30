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
  pitch: number;
  drop: number;
  highSide: number;
  lowSide: number;
  rafterLength: number;
  purlins: number;
}

/** Overhang dimensions (ft) */
export interface Overhangs {
  right: number;
  left: number;
  front: number;
  back: number;
}

/** Building options (checkboxes) */
export interface BuildingOptions {
  economicEndFrame: boolean;
  centralPoles: boolean;
  singleSlope: boolean;
  bypassGirts: boolean;
  parapet: boolean;
  parapetWidth: number;
  parapetHeight: number;
}

/** Sheeting selections */
export interface SheetingConfig {
  sideWall: boolean;
  swLinerPanel: boolean;
  swLinerHeight: number;
  endWall: boolean;
  ewLinerPanel: boolean;
  ewLinerHeight: number;
  roof: boolean;
  soffit: boolean;
  swSkirt: boolean;
  swSkirtHeight: number;
  ewSkirt: boolean;
  ewSkirtHeight: number;
}

/** Door/window entry */
export interface DoorWindowEntry {
  qty: number;
  includeFrame: boolean;
  width: number;
  height: number;
}

/** Doors and windows configuration */
export interface DoorsWindowsConfig {
  doors3070: DoorWindowEntry;
  doors4070: DoorWindowEntry;
  door6070: DoorWindowEntry;
  panicHardware: number;
  deadBolt: number;
  rollUpDoors: DoorWindowEntry[];
  frameOpenings: DoorWindowEntry[];
  window3030: DoorWindowEntry;
  window4030: DoorWindowEntry;
  window6030: DoorWindowEntry;
  window6040: DoorWindowEntry;
}

/** Canopy entry (depth, width, height) */
export interface CanopyEntry {
  depth: number;
  width: number;
  height: number;
}

/** Accessories configuration */
export interface AccessoriesConfig {
  canopies: CanopyEntry[];
  hssCanopies: CanopyEntry[];
  masonry: number;
  ridgeVents: number;
  skylights: number;
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
  baySpacing: number;  // number of bays (e.g. 4), NOT feet
  girts: number;       // girts per bay side (user input), e.g. 4
  purlins: number;     // purlins count (user input), e.g. 10
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
  options: BuildingOptions;
  overhangs: Overhangs;
  leanTos: Record<LeanToDirection, LeanTo>;
  sheeting: SheetingConfig;
  doorsWindows: DoorsWindowsConfig;
  accessories: AccessoriesConfig;
  insulation: InsulationConfig;
  components: ComponentItem[];
  overheads: ProjectOverheads;
}

/** Editable overhead and cost parameters */
export interface ProjectOverheads {
  laborRate: number;       // $/lb for labor calculation
  detailing: number;       // flat fee
  engineering: number;     // flat fee
  loadingHauling: number;  // flat fee
  freight: number;         // flat fee
  overheadRate: number;    // percentage (0.02 = 2%)
  erection: number;        // flat fee
  foundation: number;      // flat fee
  permits: number;         // flat fee
  profitRate: number;      // percentage (0.15 = 15%)
  commissionRate: number;  // percentage (0.04 = 4%)
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
  foundation: number;
  permits: number;
  subTotal: number;
  profitRate: number;
  profit: number;
  commissionRate: number;
  commission: number;
  grandTotal: number;
}

/** Create default empty config */
export function createDefaultConfig(): BuildingConfig {
  const emptyLeanTo = (): LeanTo => ({
    enabled: false, length: 0, width: 0, pitch: 0, drop: 0,
    highSide: 0, lowSide: 0, rafterLength: 0, purlins: 0,
  });
  const emptyDoorWindow = (): DoorWindowEntry => ({ qty: 0, includeFrame: false, width: 0, height: 0 });
  const emptyCanopy = (): CanopyEntry => ({ depth: 0, width: 0, height: 0 });
  return {
    projectName: '',
    customerName: '',
    jobLocation: '',
    roofType: 'gable',
    dimensions: { width: 0, length: 0, eaveHeight: 0, roofPitch: 4, baySpacing: 4, girts: 4, purlins: 10 },
    options: {
      economicEndFrame: false, centralPoles: false, singleSlope: false,
      bypassGirts: false, parapet: false, parapetWidth: 0, parapetHeight: 0,
    },
    overhangs: { right: 0, left: 0, front: 0, back: 0 },
    leanTos: {
      right: emptyLeanTo(),
      left: emptyLeanTo(),
      front: emptyLeanTo(),
      back: emptyLeanTo(),
    },
    sheeting: {
      sideWall: true, swLinerPanel: false, swLinerHeight: 0,
      endWall: true, ewLinerPanel: false, ewLinerHeight: 0,
      roof: true, soffit: false,
      swSkirt: false, swSkirtHeight: 0, ewSkirt: false, ewSkirtHeight: 0,
    },
    doorsWindows: {
      doors3070: emptyDoorWindow(), doors4070: emptyDoorWindow(), door6070: emptyDoorWindow(),
      panicHardware: 0, deadBolt: 0,
      rollUpDoors: [emptyDoorWindow(), emptyDoorWindow(), emptyDoorWindow(), emptyDoorWindow()],
      frameOpenings: [emptyDoorWindow(), emptyDoorWindow(), emptyDoorWindow(), emptyDoorWindow()],
      window3030: emptyDoorWindow(), window4030: emptyDoorWindow(),
      window6030: emptyDoorWindow(), window6040: emptyDoorWindow(),
    },
    accessories: {
      canopies: [emptyCanopy(), emptyCanopy(), emptyCanopy(), emptyCanopy()],
      hssCanopies: [emptyCanopy(), emptyCanopy(), emptyCanopy(), emptyCanopy()],
      masonry: 0, ridgeVents: 0, skylights: 0,
    },
    insulation: { roof: false, wall: false, additional: false },
    components: [],
    overheads: {
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
    },
  };
}
