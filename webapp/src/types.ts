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
  /**
   * Issue #35: which wall side this opening lives on, for insulation deduction.
   * Optional so configs from older localStorage continue to type-check; when
   * absent, `getEffectiveWallSide()` applies the PEMB default for the slot
   * (walk doors + windows → 'side', roll-up doors + frame openings → 'end').
   */
  wallSide?: 'side' | 'end';
}

/** Issue #35: identifier for each opening slot in DoorsWindowsConfig.
 *  Drives the default wall-side assignment when an opening has no `wallSide`. */
export type OpeningType =
  | 'doors3070'
  | 'doors4070'
  | 'door6070'
  | 'rollUpDoors'
  | 'frameOpenings'
  | 'window3030'
  | 'window4030'
  | 'window6030'
  | 'window6040';

/**
 * Issue #35: PEMB defaults for opening → wall-side mapping.
 *   - Side walls: walk doors (3070, 4070, 6070), all windows.
 *   - End walls:  roll-up doors, frame openings.
 * Rationale: typical PEMB layout puts truck/roll-up access at gable ends and
 * people doors + windows along side walls. Documented in
 * `.squad/decisions/inbox/livingston-issue35-insulation-split.md`.
 */
export const OPENING_DEFAULT_WALL_SIDE: Record<OpeningType, 'side' | 'end'> = {
  doors3070: 'side',
  doors4070: 'side',
  door6070: 'side',
  rollUpDoors: 'end',
  frameOpenings: 'end',
  window3030: 'side',
  window4030: 'side',
  window6030: 'side',
  window6040: 'side',
};

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
  /**
   * R-value for auto-calculated insulation (Issue #10).
   * Drives the $/sqft rate from rValuePriceTable.
   * Ignored when manual component overrides are present (any insulation component qty > 0).
   */
  rValue?: 'R-13' | 'R-19' | 'R-25' | 'R-30';
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

/** ASCE 7 wind exposure categories */
export type ExposureCategory = 'B' | 'C' | 'D';

/** Full building configuration */
export interface BuildingConfig {
  projectName: string;
  customerName: string;
  /** FK to customers.id — null/undefined for ad-hoc (no master record) */
  customerId?: number | null;
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
  /** Design wind speed in mph (ASCE 7). Valid range: 80–200. */
  windSpeedMph: number;
  /** ASCE 7 exposure category (terrain roughness). */
  exposureCategory: ExposureCategory;
  /** Roof live load in psf (ASCE 7 Lr). Non-negative. */
  roofLiveLoadPsf: number;
  /** Ground snow load in psf (ASCE 7 pg). Non-negative. */
  snowLoadPsf: number;
  /** Roof panel color / finish (e.g. "Galvalume", "Polar White"). */
  roofColor: string;
  /** Wall panel color / finish. */
  wallColor: string;
  /** Trim color / finish. */
  trimColor: string;
  /** Sales tax rate as a decimal (e.g. 0.0825 = 8.25%). Texas default. */
  salesTaxRate: number;
  /** When true, computed sales tax is added to the grand total. When false,
   *  tax is shown as $0 / "not included" and is omitted from the grand total. */
  salesTaxIncluded: boolean;
  /** Issue #20: Additional Structures Checklist (Section 5 per PEMB anatomy). */
  additionalStructures?: AdditionalStructures;
}

/** Editable overhead and cost parameters */
export interface ProjectOverheads {
  laborRate: number;       // $/lb for labor calculation
  detailing: number;       // flat fee
  engineering: number;     // flat fee
  loadingHauling: number;  // flat fee
  freight: number;         // flat fee — used as manual override when freightAutoCalc === false
  /** Travel distance to job site (km). Drives auto-calc freight = distance × rate.
   *  Workbook ref: Summary.txt row 78 col 10 (e.g. 200 km). */
  freightDistance?: number;
  /** Per-kilometer freight rate ($/km). Workbook default: 4.6 $/km (issue #14). */
  freightRate?: number;
  /** When true, freight is auto-calculated as freightDistance × freightRate and
   *  the flat `freight` field is ignored. When false (or undefined for legacy
   *  configs), the flat `freight` field is used as-is. New configs default to true. */
  freightAutoCalc?: boolean;
  overheadRate: number;    // percentage (0.02 = 2%)
  erection: number;        // flat fee
  foundation: number;      // flat fee
  permits: number;         // flat fee
  profitRate: number;      // percentage (0.15 = 15%)
  commissionRate: number;  // percentage (0.04 = 4%)
}

/**
 * Auto-generated main framing Bill of Materials, returned by generateMainFramingBOM().
 *
 * OVERRIDE PATTERN — how engine defaults and user edits coexist:
 *   1. Call generateMainFramingBOM(config) → get engine-calculated ComponentItem defaults.
 *   2. Pass those items + config.components to mergeWithExisting() to produce the
 *      final component list, respecting any user-entered values from FramingPage.
 *   3. Linus wires a "Recalculate BOM" button that re-runs steps 1–2 and writes
 *      the result back to config.components.
 *   4. User edits in FramingTable after that point are stored in config.components
 *      as usual — they win on the next merge (any non-zero qty/weight is treated
 *      as an intentional user override).
 */
export interface FramingBOMSummary {
  /** Engine-generated ComponentItem defaults. IDs match the catalog ('MF-01', 'PL-01', etc.). */
  items: ComponentItem[];
  /** Total weight (lbs) of in-house-fabricated structural members with deterministic weight.
   *  Note: main frame columns and rafters are custom plate girders — they report weight=0
   *  until an engineer fills them in. Those IDs are listed in engineerInputRequired. */
  structuralWeightLbs: number;
  /** Total commercial linear feet of cold-formed (COLD FORM group) members in this BOM. */
  coldFormedLengthFt: number;
  /** Catalog IDs of items whose weight cannot be auto-computed (custom plate girders).
   *  Flag these in the UI or during QA so the estimator knows to fill them in. */
  engineerInputRequired: string[];
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
  /** Weight of in-house-fabricated steel only (BEAMS/CHANNELS/FLAT BARS/ANGLES/PIPES/HSS).
   *  This is the base for the fabrication labor charge — cold-formed members are
   *  excluded because they ship cut-to-length from the supplier. */
  laborBaseWeight: number;
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
  /** Sales tax rate as a decimal carried through for display. */
  salesTaxRate: number;
  /** Whether sales tax was added to grand total (mirrors BuildingConfig.salesTaxIncluded). */
  salesTaxIncluded: boolean;
  /** Sales tax base = Materials + Labor + Freight + Overhead + Erection + Foundation
   *  + Permits + Contingency + Profit + Commission. (Per issue #13.) */
  salesTaxBase: number;
  /** Computed sales tax = salesTaxBase × salesTaxRate. Always populated; only added
   *  to grandTotal when salesTaxIncluded === true. */
  salesTax: number;
  /** Total commercial linear feet of cold-formed (COLD FORM group, Ln Ft priced) members
   *  across all structural categories in config.components. Useful for QuotationPage. */
  coldFormedLengthFt: number;
  grandTotal: number;
}

/** Issue #20: Additional Structures Checklist — Section 5 of PEMB quotation anatomy.
 *  All dimensions in imperial feet. */
export interface AdditionalStructures {
  overhangs: { enabled: boolean; qty: number; dims: string };
  leanTos: { enabled: boolean; qty: number; width: number; length: number };
  parapets: { enabled: boolean; height: number };
  canopies: { enabled: boolean; qty: number; width: number; depth: number; height: number };
  hssCanopies: { enabled: boolean; qty: number };
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
      // Issue #35: freshly-created openings carry the documented PEMB default
      // wallSide. Field stays optional on the type so older localStorage
      // configs without it still load via getEffectiveWallSide() fallback.
      doors3070: { ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.doors3070 },
      doors4070: { ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.doors4070 },
      door6070:  { ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.door6070 },
      panicHardware: 0, deadBolt: 0,
      rollUpDoors:    Array.from({ length: 4 }, () => ({ ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.rollUpDoors })),
      frameOpenings:  Array.from({ length: 4 }, () => ({ ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.frameOpenings })),
      window3030: { ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.window3030 },
      window4030: { ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.window4030 },
      window6030: { ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.window6030 },
      window6040: { ...emptyDoorWindow(), wallSide: OPENING_DEFAULT_WALL_SIDE.window6040 },
    },
    accessories: {
      canopies: [emptyCanopy(), emptyCanopy(), emptyCanopy(), emptyCanopy()],
      hssCanopies: [emptyCanopy(), emptyCanopy(), emptyCanopy(), emptyCanopy()],
      masonry: 0, ridgeVents: 0, skylights: 0,
    },
    insulation: { roof: false, wall: false, additional: false, rValue: 'R-13' },
    components: [],
    overheads: {
      laborRate: 0.75,
      detailing: 5000,
      engineering: 1500,
      loadingHauling: 0,
      freight: 0,
      freightDistance: 0,
      freightRate: 4.6,
      freightAutoCalc: true,
      overheadRate: 0.02,
      erection: 0,
      foundation: 0,
      permits: 0,
      profitRate: 0.15,
      commissionRate: 0.04,
    },
    windSpeedMph: 140,
    exposureCategory: 'C',
    roofLiveLoadPsf: 20,
    snowLoadPsf: 0,
    roofColor: 'Galvalume',
    wallColor: 'Polar White',
    trimColor: 'Polar White',
    salesTaxRate: 0.0825,
    salesTaxIncluded: false,
    additionalStructures: {
      overhangs: { enabled: false, qty: 0, dims: '' },
      leanTos: { enabled: false, qty: 0, width: 0, length: 0 },
      parapets: { enabled: false, height: 0 },
      canopies: { enabled: false, qty: 0, width: 0, depth: 0, height: 0 },
      hssCanopies: { enabled: false, qty: 0 },
    },
  };
}
