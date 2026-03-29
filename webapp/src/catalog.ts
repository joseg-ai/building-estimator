import type { ComponentItem, ComponentCategory } from './types';

/** Template for a catalog row (qty defaults to 0) */
type CatalogEntry = Omit<ComponentItem, 'qty'>;

function e(
  id: string,
  category: ComponentCategory,
  description: string,
  group: string,
  material: string,
  commLength: number,
  measure: string,
  costPerUnit: number,
  defaultLength = 0,
): CatalogEntry {
  return {
    id, category, description,
    length: defaultLength, lnFeetToFab: 0, enabled: false,
    group, material, commLength, measure, costPerUnit,
    weight: 0, lnF: 0,
  };
}

// ---- MAIN FRAMING (from "Main Framing" sheet rows 8-14) ----
export const mainFramingCatalog: CatalogEntry[] = [
  e('MF-01', 'main-framing', 'Main Frames', 'BEAMS', 'Ninguno', 1, 'NA', 0.85),
  e('MF-02', 'main-framing', 'End Frame Columns', 'COLD FORM', 'Cee 8 x 3 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85),
  e('MF-03', 'main-framing', 'Main Frame Rafters', 'BEAMS', 'W x 18 x 65', 50, 'Pound/ft', 0.85),
  e('MF-04', 'main-framing', 'End Frame Rafters', 'COLD FORM', 'Cee 8 x 3 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85),
  e('MF-05', 'main-framing', 'Wind Columns', 'BEAMS', 'W x 8 x 35', 20, 'Pound/ft', 0.85),
  e('MF-06', 'main-framing', 'Central Poles', 'PIPES', 'Pipe 5" Diam 40S std', 20, 'Pound/ft', 0.85),
];

// ---- CANOPY (rows 17-30) ----
export const canopyCatalog: CatalogEntry[] = [
  e('CN-01', 'canopy', 'Parapet Cold Form Channels', 'COLD FORM', 'Cee 8 x 2 1/2 x 12 Red Ox', 24, 'Ln Ft', 0.85, 100),
  e('CN-02', 'canopy', 'Canopy 1 Column', 'BEAMS', 'W x 8 x 10', 20, 'Pound/ft', 0.85),
  e('CN-03', 'canopy', 'Canopy 1 Rafter', 'BEAMS', 'W x 8 x 10', 20, 'Pound/ft', 0.85),
  e('CN-04', 'canopy', 'HSS Canopy 1', 'HSS', 'HSS 2-1/2 X 2-1/2 X 1/4GA', 20, 'Pound/ft', 1.003),
  e('CN-05', 'canopy', 'HSS Canopy 2', 'HSS', 'HSS 2-1/2 X 2-1/2 X 1/4GA', 20, 'Pound/ft', 1.003),
  e('CN-06', 'canopy', 'HSS Canopy 3', 'HSS', 'HSS 2 X 2 X 12GA', 20, 'Pound/ft', 1.003),
];

// ---- PLATES (rows 60-64) ----
export const platesCatalog: CatalogEntry[] = [
  e('PL-01', 'plates', 'Base Plates', 'FLAT BARS', 'Flat Bar 1/2 x 8', 20, 'Pound/ft', 0.8245),
  e('PL-02', 'plates', 'Purlin Plates', 'FLAT BARS', 'Flat Bar 3/16 x 6', 20, 'Pound/ft', 0.8245),
  e('PL-03', 'plates', 'Side Girt Plates', 'FLAT BARS', 'Flat Bar 3/16 x 6', 20, 'Pound/ft', 0.8245),
  e('PL-04', 'plates', 'End Girt Plates', 'FLAT BARS', 'Flat Bar 3/16 x 6', 20, 'Pound/ft', 0.8245),
];

// ---- FRAME OPENINGS (rows 67-79) ----
export const frameOpeningsCatalog: CatalogEntry[] = [
  e('FO-01', 'frame-openings', 'Frame Openings 3070', 'COLD FORM', 'Cee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85, 17),
  e('FO-02', 'frame-openings', 'Frame Openings 4070', 'COLD FORM', 'Cee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85, 18),
  e('FO-03', 'frame-openings', 'Frame Openings 6070', 'COLD FORM', 'Cee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85, 18),
  e('FO-04', 'frame-openings', 'Frame Openings Roll Up Door', 'COLD FORM', 'Cee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85),
  e('FO-05', 'frame-openings', 'Frame Openings 3030', 'COLD FORM', 'Cee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85, 12),
  e('FO-06', 'frame-openings', 'Frame Openings 4030', 'COLD FORM', 'Cee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85, 14),
  e('FO-07', 'frame-openings', 'Frame Openings 6030', 'COLD FORM', 'Cee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85, 18),
  e('FO-08', 'frame-openings', 'Frame Openings 6040', 'COLD FORM', 'Cee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 0.85, 20),
];

// ---- PURLINS AND GIRTS (from Components sheet rows 8-19) ----
export const purlinsGirtsCatalog: CatalogEntry[] = [
  e('PG-01', 'purlins-girts', 'Side Wall Girts', 'COLD FORM', 'Zee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 3.6295),
  e('PG-02', 'purlins-girts', 'End Wall Girts', 'COLD FORM', 'Zee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 3.6295),
  e('PG-03', 'purlins-girts', 'End Wall Skirt Girts (Side)', 'COLD FORM', 'Zee 8 x 2 1/2 x 12 Red Ox', 24, 'Ln Ft', 3.6295),
  e('PG-04', 'purlins-girts', 'End Wall Skirt Girts (End)', 'COLD FORM', 'Zee 8 x 2 1/2 x 12 Red Ox', 24, 'Ln Ft', 3.6295),
  e('PG-05', 'purlins-girts', 'Roof Purlins', 'COLD FORM', 'Zee 8 x 2 1/2 x 14 Red Ox', 24, 'Ln Ft', 3.6295),
  e('PG-06', 'purlins-girts', 'Overhang Purlins', 'COLD FORM', 'Zee 12 x 3 1/2 x 14 Red Ox', 24, 'Ln Ft', 5.8828),
  e('PG-07', 'purlins-girts', 'Canopy Purlins', 'COLD FORM', 'Zee 8 x 2 1/2 x 16 Red Ox', 24, 'Ln Ft', 3.6785),
  e('PG-08', 'purlins-girts', 'Lean-to Purlins', 'COLD FORM', 'Zee 8 x 2 1/2 x 16 Red Ox', 24, 'Ln Ft', 3.6785),
  e('PG-09', 'purlins-girts', 'Lean-to Eave Strut', 'EAVE STRUT', '8 x 5 x 5 14GA Red Ox', 24, 'Ln ft', 6.6373),
  e('PG-10', 'purlins-girts', 'Eave Strut', 'EAVE STRUT', '8 x 5 x 2 3/4 12GA Red Ox', 20, 'Ln ft', 6.6373),
];

// ---- BASE / RAKE ANGLES (Components rows 22-24) ----
export const baseRakeAnglesCatalog: CatalogEntry[] = [
  e('BA-01', 'base-rake-angles', 'Base Angle', 'ANGLES', 'Base/Rake angle 2 x 4 14GA Red Ox', 24, 'Ln ft', 1.4057),
  e('BA-02', 'base-rake-angles', 'Rake Angle', 'ANGLES', 'Base/Rake angle 2 x 4 14GA Red Ox', 24, 'Ln ft', 1.4057),
];

// ---- ROOF & WALL SHEETING (Components rows 27-39) ----
export const sheetingCatalog: CatalogEntry[] = [
  e('SH-01', 'roof-wall-sheeting', 'Ridge Caps', 'SHEETING', 'Ridge Cap (Peek Sheets) With Accessories', 24, 'Ln Ft', 4.257),
  e('SH-02', 'roof-wall-sheeting', 'Roof Panels', 'SHEETING', 'Panel PBR 26Ga Lifetime Galvalume 36" x 1 1/4"', 24, 'Ln Ft', 3.2071),
  e('SH-03', 'roof-wall-sheeting', 'Side Walls', 'SHEETING', 'Panel PBR 26Ga Lifetime Color 36" x 1 1/4"', 24, 'Ln Ft', 3.9827),
  e('SH-04', 'roof-wall-sheeting', 'Side Liner Panel', 'SHEETING', 'Panel PBU 26Ga Color 36" x 3/4"', 24, 'Ln Ft', 3.9827),
  e('SH-05', 'roof-wall-sheeting', 'End Walls', 'SHEETING', 'Panel PBR 26Ga Lifetime Color 36" x 1 1/4"', 24, 'Ln Ft', 3.9827),
  e('SH-06', 'roof-wall-sheeting', 'End Liner Panel', 'SHEETING', 'Panel PBU 26Ga Color 36" x 3/4"', 24, 'Ln Ft', 3.9827),
  e('SH-07', 'roof-wall-sheeting', 'Lean-to Roof', 'SHEETING', 'Panel PBR 26Ga Lifetime Color 36" x 1 1/4"', 24, 'Ln Ft', 3.9827),
  e('SH-08', 'roof-wall-sheeting', 'Canopy Roof', 'SHEETING', 'Panel PBR 26Ga Lifetime Color 36" x 1 1/4"', 24, 'Ln Ft', 3.9827),
  e('SH-09', 'roof-wall-sheeting', 'Lean-to Soffit', 'SHEETING', 'Soffit 24Ga Color 12" x 1"', 24, 'Ln Ft', 11.073),
  e('SH-10', 'roof-wall-sheeting', 'Canopy Soffit', 'SHEETING', 'Soffit 24Ga Color 12" x 1"', 24, 'Ln Ft', 11.073),
];

// ---- ROOF TRIM (Components rows 42-54) ----
export const roofTrimCatalog: CatalogEntry[] = [
  e('RT-01', 'roof-trim', 'Peak Box', 'ROOF TRIM', 'Peak Box', 0, 'pc', 30.14),
  e('RT-02', 'roof-trim', 'Rake Trim', 'ROOF TRIM', 'Sculptured Rake Trim', 10, 'Ln Ft', 4.1361),
  e('RT-03', 'roof-trim', 'Rake End Cap', 'ROOF TRIM', 'Rake End Cap', 0, 'pc', 5.8663),
  e('RT-04', 'roof-trim', 'Eave Gutter', 'ROOF TRIM', 'Eave Gutter', 10, 'Ln Ft', 4.6432),
  e('RT-05', 'roof-trim', 'Gutter End Cap', 'ROOF TRIM', 'Gutter Endcap', 0, 'pc', 6.034),
  e('RT-06', 'roof-trim', 'Gutter Strap', 'ROOF TRIM', 'Gutter Strap', 0, 'pc', 10.5839),
  e('RT-07', 'roof-trim', 'Box Panel Cap Trim', 'ROOF TRIM', 'Box Panel Cap Trim', 0, 'pc', 18.5677),
  e('RT-08', 'roof-trim', 'Parapet High Side Eave', 'ROOF TRIM', 'Parapet High Side Eave', 0, 'Ln Ft', 4.6432),
];

// ---- WALL TRIM (Components rows 56-67) ----
export const wallTrimCatalog: CatalogEntry[] = [
  e('WT-01', 'wall-trim', 'Outside Corner Trim', 'WALL TRIM', 'Outside Corner Trim', 10, 'Ln Ft', 3.457),
  e('WT-02', 'wall-trim', 'Jamb Trim', 'WALL TRIM', 'Jamb Trim', 10, 'Ln Ft', 3.457),
  e('WT-03', 'wall-trim', 'Head Trim', 'WALL TRIM', 'Head Trim', 10, 'Ln Ft', 3.457),
  e('WT-04', 'wall-trim', 'Drip Trim', 'WALL TRIM', 'Drip Trim', 20, 'Ln Ft', 1.6436),
  e('WT-05', 'wall-trim', 'Masonry Trim', 'WALL TRIM', 'Masonry Trim', 20, 'Ln Ft', 1.6436),
  e('WT-06', 'wall-trim', 'Downspout Straight', 'WALL TRIM', 'Downspout Straight', 10, 'Ln Ft', 8.8169),
  e('WT-07', 'wall-trim', 'Downspout Elbow', 'WALL TRIM', 'Downspout Elbow', 0, 'pc', 3.194),
  e('WT-08', 'wall-trim', 'Downspout Strap', 'WALL TRIM', 'Downspout Strap', 0, 'pc', 19.5858),
  e('WT-09', 'wall-trim', 'Inside Corner Trim / Liner', 'WALL TRIM', 'Inside Corner Trim / Liner', 10, 'Ln Ft', 3.1255),
];

// ---- DOORS AND WINDOWS (Components rows 71-84) ----
export const doorsWindowsCatalog: CatalogEntry[] = [
  e('DW-01', 'doors-windows', 'Doors 3070', 'DOOR AND WINDOWS', 'Doors 3070', 10, 'pc', 850),
  e('DW-02', 'doors-windows', 'Doors 4070', 'DOOR AND WINDOWS', 'Doors 4070', 10, 'pc', 950),
  e('DW-03', 'doors-windows', 'Door 6070', 'DOOR AND WINDOWS', 'Door 6070', 10, 'pc', 1200),
  e('DW-04', 'doors-windows', 'Panic Hardware', 'DOOR AND WINDOWS', 'Panic Hardware', 10, 'pc', 350),
  e('DW-05', 'doors-windows', 'Dead Bolt', 'DOOR AND WINDOWS', 'Dead Bolt', 10, 'pc', 45),
  e('DW-06', 'doors-windows', 'Roll Up Door', 'DOOR AND WINDOWS', 'Roll up Door', 10, 'pc', 2400),
  e('DW-07', 'doors-windows', 'Window 3030', 'DOOR AND WINDOWS', 'Window 3030', 10, 'pc', 185),
  e('DW-08', 'doors-windows', 'Window 4030', 'DOOR AND WINDOWS', 'Window 4030', 10, 'pc', 220),
  e('DW-09', 'doors-windows', 'Window 6030', 'DOOR AND WINDOWS', 'Window 6030', 10, 'pc', 310),
  e('DW-10', 'doors-windows', 'Window 6040', 'DOOR AND WINDOWS', 'Window 6040', 10, 'pc', 380),
];

// ---- STANDARD HARDWARE (Components rows 87-98) ----
export const hardwareCatalog: CatalogEntry[] = [
  e('HW-01', 'standard-hardware', 'Tri Bead Tap Sealant', 'HARDWARE', 'Tri Bead Tap Sealant', 0, 'pc', 82.1112),
  e('HW-02', 'standard-hardware', 'Polyurethane Tube Sealant', 'HARDWARE', 'Polyurethane Tube Sealant', 0, 'pc', 16.4929),
  e('HW-03', 'standard-hardware', 'Outside Closure For R/U Panel', 'HARDWARE', 'Outside Closure For R/U Panel', 0, 'pc', 1.3032),
  e('HW-04', 'standard-hardware', 'Inside Closure For R/U Panel', 'HARDWARE', 'Inside Closure For R/U Panel', 0, 'pc', 1.3032),
  e('HW-05', 'standard-hardware', 'Low Floating Eave Plate', 'HARDWARE', 'Low Floating Eave Plate', 0, 'pc', 25.6404),
  e('HW-06', 'standard-hardware', 'Low Floating Rake Support', 'HARDWARE', 'Low Floating Rake Support', 0, 'pc', 72.026),
  e('HW-07', 'standard-hardware', 'Backup Plate', 'HARDWARE', 'Backup Plate', 0, 'pc', 14.4848),
  e('HW-08', 'standard-hardware', 'Sliding Clip', 'HARDWARE', 'Sliding Clip', 0, 'pc', 3.785),
  e('HW-09', 'standard-hardware', 'Sheeting Angle', 'HARDWARE', 'Sheeting Angle', 0, 'pc', 3.7849),
];

// ---- FASTENERS AND BOLTS (from Fasteners sheet) ----
export const anchorBoltsCatalog: CatalogEntry[] = [
  e('AB-01', 'anchor-bolts', 'Anchor Bolts 3/4"', 'BOLTS AND FASTENERS', 'Anchor Bolts 3/4"', 0, 'pc', 12),
];

export const boltsCatalog: CatalogEntry[] = [
  e('BT-01', 'bolts', 'Bolts Purlins/Girts', 'BOLTS AND FASTENERS', 'Bolt 1/2 Machine bolt with nut 1"', 0, 'pc', 1.375),
  e('BT-02', 'bolts', 'Bolts Zee', 'BOLTS AND FASTENERS', 'Bolt 5/8 Bolt with nut 1 3/4"', 0, 'pc', 1.485),
  e('BT-03', 'bolts', 'Bolts Columns/Rafters', 'BOLTS AND FASTENERS', 'Bolt 3/4 Bolt with nut 1 3/4"', 0, 'pc', 1.705),
];

export const cableBracingCatalog: CatalogEntry[] = [
  e('CB-01', 'cable-bracing', '3/8" Strand', 'BOLTS AND FASTENERS', '3/8" Strand', 0, 'LnFt', 0.9867),
  e('CB-02', 'cable-bracing', 'Eyebolt with Flat washer and nut', 'BOLTS AND FASTENERS', '3/4" Brace Kit', 0, 'pc', 84.3806),
];

export const fastenerItemsCatalog: CatalogEntry[] = [
  e('FS-01', 'fasteners', 'Fasteners', 'BOLTS AND FASTENERS', 'Fasteners', 0, 'pc', 0.165),
];

// ---- INSULATION (from Insulation sheet) ----
export const insulationCatalog: CatalogEntry[] = [
  e('IN-01', 'insulation', 'Roof Insulation', 'INSULATION', 'R10 3"', 20, 'LnFt', 3.4956),
  e('IN-02', 'insulation', 'Side Wall Insulation', 'INSULATION', 'R10 3"', 20, 'LnFt', 3.4956),
  e('IN-03', 'insulation', 'End Wall Insulation', 'INSULATION', 'R10 3"', 20, 'LnFt', 3.4956),
];

// ---- STRUCTURAL (from Structural sheet) ----
export const stairsCatalog: CatalogEntry[] = [
  e('ST-01', 'stairs', 'Stringer', 'CHANNELS', 'C 12 X 20.7', 20, 'Pound/ft', 0.85),
  e('ST-02', 'stairs', 'Tread Support', 'ANGLES', 'L 1 1/4 x 1 1/4 x 1/4', 20, 'Pound/ft', 0.8245),
  e('ST-03', 'stairs', 'Form Stringer (4ft)', 'FLAT BARS', 'Flat Bar 1/4 x 3', 20, 'Pound/ft', 0.8245),
  e('ST-04', 'stairs', 'Form Stringer (8ft)', 'FLAT BARS', 'Flat Bar 1/4 x 3', 20, 'Pound/ft', 0.8245),
  e('ST-05', 'stairs', 'Treads Step Steel', 'HARDWARE', 'Step Steel 11"x1"Lip', 5, 'LnFt', 18.216),
  e('ST-06', 'stairs', 'Guard Rail', 'PIPES', 'Pipe 1 1/2" Diam 40S std', 20, 'Pound/ft', 1.003),
  e('ST-07', 'stairs', 'Guard Rail Supports', 'PIPES', 'Pipe 1 1/2" Diam 40S std', 20, 'Pound/ft', 1.003),
  e('ST-08', 'stairs', 'Hand Rail', 'PIPES', 'Pipe 1 1/2" Diam 40S std', 20, 'Pound/ft', 1.003),
  e('ST-09', 'stairs', 'Brackets', 'HARDWARE', 'Brackets for handrail', 0, 'pc', 20.24),
];

/** All catalogs grouped for easy iteration */
export const allCatalogs = {
  'main-framing': { title: 'Main Framing', items: mainFramingCatalog },
  'canopy': { title: 'Canopy & Parapets', items: canopyCatalog },
  'plates': { title: 'Plates', items: platesCatalog },
  'frame-openings': { title: 'Frame Openings', items: frameOpeningsCatalog },
  'purlins-girts': { title: 'Purlins & Girts', items: purlinsGirtsCatalog },
  'base-rake-angles': { title: 'Base / Rake Angles', items: baseRakeAnglesCatalog },
  'roof-wall-sheeting': { title: 'Roof & Wall Sheeting', items: sheetingCatalog },
  'roof-trim': { title: 'Roof Trim', items: roofTrimCatalog },
  'wall-trim': { title: 'Wall Trim', items: wallTrimCatalog },
  'doors-windows': { title: 'Doors & Windows', items: doorsWindowsCatalog },
  'standard-hardware': { title: 'Standard Hardware', items: hardwareCatalog },
  'anchor-bolts': { title: 'Anchor Bolts', items: anchorBoltsCatalog },
  'bolts': { title: 'Bolts', items: boltsCatalog },
  'cable-bracing': { title: 'Cable Bracing', items: cableBracingCatalog },
  'fasteners': { title: 'Fasteners', items: fastenerItemsCatalog },
  'insulation': { title: 'Insulation', items: insulationCatalog },
  'stairs': { title: 'Stairs & Structural', items: stairsCatalog },
} as const;
