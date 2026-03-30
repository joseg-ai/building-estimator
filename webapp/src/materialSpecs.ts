/** Material specs lookup -- mirrors "Beams specs" sheet from the workbook */

export interface MaterialSpec {
  designation: string;
  group: string;
  weightPerFt: number;  // lbs per linear foot
  depth?: number;
  width?: number;
}

/** W-shape beams from the Beams specs sheet */
export const beamSpecs: MaterialSpec[] = [
  { designation: 'W 27 x 178', group: 'BEAMS', weightPerFt: 178 },
  { designation: 'W 27 x 161', group: 'BEAMS', weightPerFt: 161 },
  { designation: 'W 27 x 146', group: 'BEAMS', weightPerFt: 146 },
  { designation: 'W 27 x 114', group: 'BEAMS', weightPerFt: 114 },
  { designation: 'W 27 x 102', group: 'BEAMS', weightPerFt: 102 },
  { designation: 'W 27 x 94', group: 'BEAMS', weightPerFt: 94 },
  { designation: 'W 27 x 84', group: 'BEAMS', weightPerFt: 84 },
  { designation: 'W 24 x 162', group: 'BEAMS', weightPerFt: 162 },
  { designation: 'W 24 x 146', group: 'BEAMS', weightPerFt: 146 },
  { designation: 'W 24 x 131', group: 'BEAMS', weightPerFt: 131 },
  { designation: 'W 24 x 117', group: 'BEAMS', weightPerFt: 117 },
  { designation: 'W 24 x 104', group: 'BEAMS', weightPerFt: 104 },
  { designation: 'W 24 x 94', group: 'BEAMS', weightPerFt: 94 },
  { designation: 'W 24 x 84', group: 'BEAMS', weightPerFt: 84 },
  { designation: 'W 24 x 76', group: 'BEAMS', weightPerFt: 76 },
  { designation: 'W 24 x 68', group: 'BEAMS', weightPerFt: 68 },
  { designation: 'W 24 x 62', group: 'BEAMS', weightPerFt: 62 },
  { designation: 'W 24 x 55', group: 'BEAMS', weightPerFt: 55 },
  { designation: 'W 21 x 147', group: 'BEAMS', weightPerFt: 147 },
  { designation: 'W 21 x 132', group: 'BEAMS', weightPerFt: 132 },
  { designation: 'W 21 x 122', group: 'BEAMS', weightPerFt: 122 },
  { designation: 'W 21 x 111', group: 'BEAMS', weightPerFt: 111 },
  { designation: 'W 21 x 101', group: 'BEAMS', weightPerFt: 101 },
  { designation: 'W 21 x 93', group: 'BEAMS', weightPerFt: 93 },
  { designation: 'W 21 x 83', group: 'BEAMS', weightPerFt: 83 },
  { designation: 'W 21 x 73', group: 'BEAMS', weightPerFt: 73 },
  { designation: 'W 21 x 68', group: 'BEAMS', weightPerFt: 68 },
  { designation: 'W 21 x 62', group: 'BEAMS', weightPerFt: 62 },
  { designation: 'W 21 x 57', group: 'BEAMS', weightPerFt: 57 },
  { designation: 'W 21 x 50', group: 'BEAMS', weightPerFt: 50 },
  { designation: 'W 21 x 44', group: 'BEAMS', weightPerFt: 44 },
  { designation: 'W 18 x 119', group: 'BEAMS', weightPerFt: 119 },
  { designation: 'W 18 x 106', group: 'BEAMS', weightPerFt: 106 },
  { designation: 'W 18 x 97', group: 'BEAMS', weightPerFt: 97 },
  { designation: 'W 18 x 86', group: 'BEAMS', weightPerFt: 86 },
  { designation: 'W 18 x 76', group: 'BEAMS', weightPerFt: 76 },
  { designation: 'W 18 x 71', group: 'BEAMS', weightPerFt: 71 },
  { designation: 'W 18 x 65', group: 'BEAMS', weightPerFt: 65 },
  { designation: 'W 18 x 60', group: 'BEAMS', weightPerFt: 60 },
  { designation: 'W 18 x 55', group: 'BEAMS', weightPerFt: 55 },
  { designation: 'W 18 x 50', group: 'BEAMS', weightPerFt: 50 },
  { designation: 'W 18 x 46', group: 'BEAMS', weightPerFt: 46 },
  { designation: 'W 18 x 40', group: 'BEAMS', weightPerFt: 40 },
  { designation: 'W 18 x 35', group: 'BEAMS', weightPerFt: 35 },
  { designation: 'W 16 x 100', group: 'BEAMS', weightPerFt: 100 },
  { designation: 'W 16 x 89', group: 'BEAMS', weightPerFt: 89 },
  { designation: 'W 16 x 77', group: 'BEAMS', weightPerFt: 77 },
  { designation: 'W 16 x 67', group: 'BEAMS', weightPerFt: 67 },
  { designation: 'W 16 x 57', group: 'BEAMS', weightPerFt: 57 },
  { designation: 'W 16 x 50', group: 'BEAMS', weightPerFt: 50 },
  { designation: 'W 16 x 45', group: 'BEAMS', weightPerFt: 45 },
  { designation: 'W 16 x 40', group: 'BEAMS', weightPerFt: 40 },
  { designation: 'W 16 x 36', group: 'BEAMS', weightPerFt: 36 },
  { designation: 'W 16 x 31', group: 'BEAMS', weightPerFt: 31 },
  { designation: 'W 16 x 26', group: 'BEAMS', weightPerFt: 26 },
  { designation: 'W 14 x 132', group: 'BEAMS', weightPerFt: 132 },
  { designation: 'W 14 x 120', group: 'BEAMS', weightPerFt: 120 },
  { designation: 'W 14 x 109', group: 'BEAMS', weightPerFt: 109 },
  { designation: 'W 14 x 99', group: 'BEAMS', weightPerFt: 99 },
  { designation: 'W 14 x 90', group: 'BEAMS', weightPerFt: 90 },
  { designation: 'W 14 x 82', group: 'BEAMS', weightPerFt: 82 },
  { designation: 'W 14 x 74', group: 'BEAMS', weightPerFt: 74 },
  { designation: 'W 14 x 68', group: 'BEAMS', weightPerFt: 68 },
  { designation: 'W 14 x 61', group: 'BEAMS', weightPerFt: 61 },
  { designation: 'W 14 x 53', group: 'BEAMS', weightPerFt: 53 },
  { designation: 'W 14 x 48', group: 'BEAMS', weightPerFt: 48 },
  { designation: 'W 14 x 43', group: 'BEAMS', weightPerFt: 43 },
  { designation: 'W 14 x 38', group: 'BEAMS', weightPerFt: 38 },
  { designation: 'W 14 x 34', group: 'BEAMS', weightPerFt: 34 },
  { designation: 'W 14 x 30', group: 'BEAMS', weightPerFt: 30 },
  { designation: 'W 14 x 26', group: 'BEAMS', weightPerFt: 26 },
  { designation: 'W 14 x 22', group: 'BEAMS', weightPerFt: 22 },
  { designation: 'W 12 x 136', group: 'BEAMS', weightPerFt: 136 },
  { designation: 'W 12 x 120', group: 'BEAMS', weightPerFt: 120 },
  { designation: 'W 12 x 106', group: 'BEAMS', weightPerFt: 106 },
  { designation: 'W 12 x 96', group: 'BEAMS', weightPerFt: 96 },
  { designation: 'W 12 x 87', group: 'BEAMS', weightPerFt: 87 },
  { designation: 'W 12 x 79', group: 'BEAMS', weightPerFt: 79 },
  { designation: 'W 12 x 72', group: 'BEAMS', weightPerFt: 72 },
  { designation: 'W 12 x 65', group: 'BEAMS', weightPerFt: 65 },
  { designation: 'W 12 x 58', group: 'BEAMS', weightPerFt: 58 },
  { designation: 'W 12 x 53', group: 'BEAMS', weightPerFt: 53 },
  { designation: 'W 12 x 50', group: 'BEAMS', weightPerFt: 50 },
  { designation: 'W 12 x 45', group: 'BEAMS', weightPerFt: 45 },
  { designation: 'W 12 x 40', group: 'BEAMS', weightPerFt: 40 },
  { designation: 'W 12 x 35', group: 'BEAMS', weightPerFt: 35 },
  { designation: 'W 12 x 30', group: 'BEAMS', weightPerFt: 30 },
  { designation: 'W 12 x 26', group: 'BEAMS', weightPerFt: 26 },
  { designation: 'W 12 x 22', group: 'BEAMS', weightPerFt: 22 },
  { designation: 'W 12 x 19', group: 'BEAMS', weightPerFt: 19 },
  { designation: 'W 12 x 16', group: 'BEAMS', weightPerFt: 16 },
  { designation: 'W 12 x 14', group: 'BEAMS', weightPerFt: 14 },
  { designation: 'W 10 x 112', group: 'BEAMS', weightPerFt: 112 },
  { designation: 'W 10 x 100', group: 'BEAMS', weightPerFt: 100 },
  { designation: 'W 10 x 88', group: 'BEAMS', weightPerFt: 88 },
  { designation: 'W 10 x 77', group: 'BEAMS', weightPerFt: 77 },
  { designation: 'W 10 x 68', group: 'BEAMS', weightPerFt: 68 },
  { designation: 'W 10 x 60', group: 'BEAMS', weightPerFt: 60 },
  { designation: 'W 10 x 54', group: 'BEAMS', weightPerFt: 54 },
  { designation: 'W 10 x 49', group: 'BEAMS', weightPerFt: 49 },
  { designation: 'W 10 x 45', group: 'BEAMS', weightPerFt: 45 },
  { designation: 'W 10 x 39', group: 'BEAMS', weightPerFt: 39 },
  { designation: 'W 10 x 33', group: 'BEAMS', weightPerFt: 33 },
  { designation: 'W 10 x 30', group: 'BEAMS', weightPerFt: 30 },
  { designation: 'W 10 x 26', group: 'BEAMS', weightPerFt: 26 },
  { designation: 'W 10 x 22', group: 'BEAMS', weightPerFt: 22 },
  { designation: 'W 10 x 19', group: 'BEAMS', weightPerFt: 19 },
  { designation: 'W 10 x 17', group: 'BEAMS', weightPerFt: 17 },
  { designation: 'W 10 x 15', group: 'BEAMS', weightPerFt: 15 },
  { designation: 'W 10 x 12', group: 'BEAMS', weightPerFt: 12 },
  { designation: 'W 8 x 67', group: 'BEAMS', weightPerFt: 67 },
  { designation: 'W 8 x 58', group: 'BEAMS', weightPerFt: 58 },
  { designation: 'W 8 x 48', group: 'BEAMS', weightPerFt: 48 },
  { designation: 'W 8 x 40', group: 'BEAMS', weightPerFt: 40 },
  { designation: 'W 8 x 35', group: 'BEAMS', weightPerFt: 35 },
  { designation: 'W 8 x 31', group: 'BEAMS', weightPerFt: 31 },
  { designation: 'W 8 x 28', group: 'BEAMS', weightPerFt: 28 },
  { designation: 'W 8 x 24', group: 'BEAMS', weightPerFt: 24 },
  { designation: 'W 8 x 21', group: 'BEAMS', weightPerFt: 21 },
  { designation: 'W 8 x 18', group: 'BEAMS', weightPerFt: 18 },
  { designation: 'W 8 x 15', group: 'BEAMS', weightPerFt: 15 },
  { designation: 'W 8 x 13', group: 'BEAMS', weightPerFt: 13 },
  { designation: 'W 8 x 10', group: 'BEAMS', weightPerFt: 10 },
  { designation: 'W 6 x 25', group: 'BEAMS', weightPerFt: 25 },
  { designation: 'W 6 x 20', group: 'BEAMS', weightPerFt: 20 },
  { designation: 'W 6 x 16', group: 'BEAMS', weightPerFt: 16 },
  { designation: 'W 6 x 15', group: 'BEAMS', weightPerFt: 15 },
  { designation: 'W 6 x 12', group: 'BEAMS', weightPerFt: 12 },
  { designation: 'W 6 x 9', group: 'BEAMS', weightPerFt: 9 },
  { designation: 'W 5 x 19', group: 'BEAMS', weightPerFt: 19 },
  { designation: 'W 5 x 16', group: 'BEAMS', weightPerFt: 16 },
  { designation: 'W 4 x 13', group: 'BEAMS', weightPerFt: 13 },
  // "Ninguno" = custom/main frames where weight is entered manually
  { designation: 'Ninguno', group: 'BEAMS', weightPerFt: 0 },
];

/** Cold form Cee and Zee sections */
export const coldFormSpecs: MaterialSpec[] = [
  { designation: 'Cee 8 x 2 1/2 x 12 Red Ox', group: 'COLD FORM', weightPerFt: 4.37 },
  { designation: 'Cee 8 x 2 1/2 x 14 Red Ox', group: 'COLD FORM', weightPerFt: 3.54 },
  { designation: 'Cee 8 x 2 1/2 x 16 Red Ox', group: 'COLD FORM', weightPerFt: 2.91 },
  { designation: 'Cee 8 x 3 1/2 x 12 Red Ox', group: 'COLD FORM', weightPerFt: 5.13 },
  { designation: 'Cee 8 x 3 1/2 x 14 Red Ox', group: 'COLD FORM', weightPerFt: 4.17 },
  { designation: 'Zee 8 x 2 1/2 x 12 Red Ox', group: 'COLD FORM', weightPerFt: 4.37 },
  { designation: 'Zee 8 x 2 1/2 x 14 Red Ox', group: 'COLD FORM', weightPerFt: 3.27 },
  { designation: 'Zee 8 x 2 1/2 x 16 Red Ox', group: 'COLD FORM', weightPerFt: 2.91 },
  { designation: 'Zee 12 x 3 1/2 x 14 Red Ox', group: 'COLD FORM', weightPerFt: 5.88 },
];

/** Pipes */
export const pipeSpecs: MaterialSpec[] = [
  { designation: 'Pipe 5" Diam 40S std', group: 'PIPES', weightPerFt: 14.62 },
  { designation: 'Pipe 4" Diam 40S std', group: 'PIPES', weightPerFt: 10.79 },
  { designation: 'Pipe 3" Diam 40S std', group: 'PIPES', weightPerFt: 7.58 },
  { designation: 'Pipe 2" Diam 40S std', group: 'PIPES', weightPerFt: 3.65 },
  { designation: 'Pipe 1 1/2" Diam 40S std', group: 'PIPES', weightPerFt: 2.72 },
];

/** HSS (Hollow Structural Sections) */
export const hssSpecs: MaterialSpec[] = [
  { designation: 'HSS 4 X 4 X 3/16GA', group: 'HSS', weightPerFt: 9.42 },
  { designation: 'HSS 3 X 3 X 3/16GA', group: 'HSS', weightPerFt: 6.87 },
  { designation: 'HSS 2-1/2 X 2-1/2 X 1/4GA', group: 'HSS', weightPerFt: 7.11 },
  { designation: 'HSS 2 X 2 X 12GA', group: 'HSS', weightPerFt: 3.05 },
];

/** Flat bars */
export const flatBarSpecs: MaterialSpec[] = [
  { designation: 'Flat Bar 1/2 x 8', group: 'FLAT BARS', weightPerFt: 13.6 },
  { designation: 'Flat Bar 1/4 x 3', group: 'FLAT BARS', weightPerFt: 2.55 },
  { designation: 'Flat Bar 1/4 x 5', group: 'FLAT BARS', weightPerFt: 4.25 },
  { designation: 'Flat Bar 1/4 x 6', group: 'FLAT BARS', weightPerFt: 5.1 },
  { designation: 'Flat Bar 1/4 x 8', group: 'FLAT BARS', weightPerFt: 6.8 },
  { designation: 'Flat Bar 3/16 x 3', group: 'FLAT BARS', weightPerFt: 1.91 },
  { designation: 'Flat Bar 3/16 x 6', group: 'FLAT BARS', weightPerFt: 3.83 },
  { designation: 'Flat Bar 3/16 x 7', group: 'FLAT BARS', weightPerFt: 4.46 },
  { designation: 'Flat Bar 3/8 x 6', group: 'FLAT BARS', weightPerFt: 7.65 },
];

/** Channels */
export const channelSpecs: MaterialSpec[] = [
  { designation: 'C 12 X 20.7', group: 'CHANNELS', weightPerFt: 20.7 },
  { designation: 'C 9 X 13.4', group: 'CHANNELS', weightPerFt: 13.4 },
];

/** Angles */
export const angleSpecs: MaterialSpec[] = [
  { designation: 'L 1 1/4 x 1 1/4 x 1/4', group: 'ANGLES', weightPerFt: 1.92 },
  { designation: 'L 3 x 3 x 1/4', group: 'ANGLES', weightPerFt: 4.9 },
  { designation: 'Base/Rake angle 2 x 4 14GA Red Ox', group: 'ANGLES', weightPerFt: 1.45 },
];

/** All specs combined, indexed by group */
export const allMaterialSpecs: MaterialSpec[] = [
  ...beamSpecs,
  ...coldFormSpecs,
  ...pipeSpecs,
  ...hssSpecs,
  ...flatBarSpecs,
  ...channelSpecs,
  ...angleSpecs,
];

/** Get specs for a specific group */
export function getSpecsByGroup(group: string): MaterialSpec[] {
  return allMaterialSpecs.filter((s) => s.group === group);
}

/** Look up a material by designation */
export function lookupMaterial(designation: string): MaterialSpec | undefined {
  return allMaterialSpecs.find((s) => s.designation === designation);
}
