/**
 * BOM Engine — Main Framing
 *
 * Generates a parametric Bill of Materials for the main framing of a gable or
 * single-slope PEMB from BuildingConfig dimensions. Mirrors formulas from the
 * Excel workbook "Main Framing" sheet (extracted_data/Main Framing.txt) and
 * cross-checked against the "Take-off" sheet (extracted_data/Take off.txt).
 *
 * FORMULA SOURCE
 * Reference building: 50W × 100L × 20H ft, 4 bays @ 25 ft, pitch 1:12, gable.
 * All formulas validated against that workbook snapshot. Deviations are flagged
 * with ⚠️ WORKBOOK FLAG and recorded in .squad/agents/livingston/history.md.
 *
 * OVERRIDE PATTERN — documented here for Linus's UI wiring (follow-up):
 *   1. On DesignPage save (or explicit "Recalculate BOM" action):
 *        const bom = generateMainFramingBOM(config);
 *        config.components = mergeWithExisting(bom.items, config.components);
 *   2. User edits in FramingTable update config.components directly (existing behavior).
 *   3. mergeWithExisting() preserves any component where qty > 0 OR weight > 0 (user
 *      has deliberately entered a value). Zero-value components get the BOM default.
 *   4. To hard-reset to engine defaults, pass [] as the existing array.
 *
 * SCOPE OF THIS ENGINE (PR #3):
 *   ✅ Main frame columns (structural BEAMS, custom — weight=0, flagged)
 *   ✅ Main frame rafters (structural BEAMS, custom — weight=0, flagged)
 *   ✅ Wind columns (W 8×35, deterministic weight)
 *   ✅ End frame columns / rafters (COLD FORM Cee, when economicEndFrame=true)
 *   ✅ Central poles (PIPES, when centralPoles=true)
 *   ✅ Base plates, purlin plates, side girt plates, end girt plates (FLAT BARS)
 *   ✅ Single-slope variant (different rafter length; column height asymmetry flagged)
 *   ❌ Canopy framing — depends on canopy config; out of scope for this PR
 *   ❌ Lean-to framing — separate sub-section; out of scope for this PR
 *   ❌ Frame openings — depend on door/window config; handled by FramingPage directly
 */

import type { BuildingConfig, ComponentItem, ComponentCategory, FramingBOMSummary } from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Round up to the next multiple of commLength — how many linear feet to order. */
function calcLnF(lnFtToFab: number, commLength: number): number {
  if (commLength <= 0 || lnFtToFab <= 0) return 0;
  return Math.ceil(lnFtToFab / commLength) * commLength;
}

/**
 * Build a ComponentItem for BOM output. All fields are populated so the result
 * can be dropped into config.components and consumed by calculateCosts() without
 * further transformation.
 */
function makeBOMItem(
  id: string,
  category: ComponentCategory,
  description: string,
  group: string,
  material: string,
  qty: number,
  length: number,
  lnFeetToFab: number,
  commLength: number,
  measure: string,
  costPerUnit: number,
  weight: number,
  lnF: number,
): ComponentItem {
  return {
    id,
    category,
    description,
    qty,
    length,
    lnFeetToFab,
    enabled: qty > 0,
    group,
    material,
    commLength,
    measure,
    costPerUnit,
    weight,
    lnF,
  };
}

// ---------------------------------------------------------------------------
// Wind column count by building width
//
// Standard PEMB endwall bracing: 2 wind columns per endwall for W ≥ 40 ft
// (one each side of center), 1 per endwall for narrower buildings, 0 for very
// narrow. Source: workbook reference building (W=50 → 4 wind columns total).
// ---------------------------------------------------------------------------
function windColumnCount(width: number): number {
  if (width >= 40) return 4; // 2 per endwall × 2 endwalls
  if (width >= 20) return 2; // 1 per endwall × 2 endwalls
  return 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate the main framing BOM from BuildingConfig dimensions.
 *
 * Returns engine-calculated ComponentItem defaults for each main framing row.
 * Items use the same IDs as the catalog ('MF-01', 'PL-01', …) so they merge
 * cleanly with user edits via mergeWithExisting().
 *
 * Weight for custom plate girder frames (MF-01 columns, MF-03 rafters) is 0.
 * Those IDs are listed in summary.engineerInputRequired — the UI should flag
 * them so the estimator knows to fill in the engineer-supplied weight.
 */
export function generateMainFramingBOM(config: BuildingConfig): FramingBOMSummary {
  const { dimensions, options, roofType } = config;
  const {
    width: W,
    eaveHeight: H,
    roofPitch: p,
    baySpacing: nBays,
    girts,
    purlins,
  } = dimensions;

  const isGable = roofType !== 'single-slope';

  // Frame count — one frame line per bay boundary
  const nFrames = nBays + 1;

  // Slope geometry
  const slopeFactor = Math.sqrt(1 + (p / 12) ** 2);
  // For gable: half-rafter sloped length from column-top to ridge
  const rafterLengthPerSide = (W / 2) * slopeFactor;
  // For single-slope: rafter spans full width at an angle
  const rafterLengthFull = W * slopeFactor;

  // Wind columns
  const windColumnsQty = windColumnCount(W);
  const windColumnsPerEndwall = windColumnsQty / 2;
  // Columns present at each endwall (2 main-frame + wind columns)
  const columnsPerEndwall = 2 + windColumnsPerEndwall;

  // Standard $/lb rates from the workbook
  const BEAMS_COST = 0.85;
  const FLAT_BAR_COST = 0.8245;
  const COLD_FORM_COST = 0.85;

  const items: ComponentItem[] = [];
  const engineerInputRequired: string[] = [];

  // ------------------------------------------------------------------
  // Main Frame Columns  (id: 'MF-01')
  //
  // Workbook row 9: Qty = 2×nFrames, Length = eaveHeight, LnFtToFab = Qty×H.
  // Material = 'Ninguno' (custom tapered plate girder); weight = 0.
  //
  // ⚠️ WORKBOOK FLAG: weight/cost must be supplied by the structural engineer
  // for each specific building. The engine cannot auto-calculate custom frame weight.
  // ------------------------------------------------------------------
  const colQty = 2 * nFrames;
  const colLength = H;
  const colLnFtToFab = colQty * colLength;
  items.push(makeBOMItem(
    'MF-01', 'main-framing', 'Main Frames', 'BEAMS', 'Ninguno',
    colQty, colLength, colLnFtToFab,
    /* commLength */ 1, 'NA', BEAMS_COST,
    /* weight */ 0, /* lnF */ 0,
  ));
  engineerInputRequired.push('MF-01');

  // ------------------------------------------------------------------
  // Main Frame Rafters  (id: 'MF-03')
  //
  // Workbook row 11: Qty = nFrames, Length = W (full width — commercial bar
  // ordering length). LnFtToFab = total actual sloped fab length:
  //   Gable:        nFrames × 2 half-rafters × rafterLengthPerSide
  //   Single-slope: nFrames × 1 rafter      × rafterLengthFull
  // Material = 'Ninguno' (custom); weight = 0.
  //
  // ⚠️ WORKBOOK FLAG: same as columns — engineer input required.
  // ⚠️ SINGLE-SLOPE FLAG: column heights differ (low side = H, high side =
  //   H + W×p/12). This engine uses H for both — flag for engineer review.
  // ------------------------------------------------------------------
  const rafterQty = nFrames;
  const rafterCommLength = W; // ordering length per frame set
  const rafterLnFtToFab = isGable
    ? nFrames * 2 * rafterLengthPerSide
    : nFrames * rafterLengthFull;
  items.push(makeBOMItem(
    'MF-03', 'main-framing', 'Main Frame Rafters', 'BEAMS', 'Ninguno',
    rafterQty, rafterCommLength, rafterLnFtToFab,
    /* commLength */ rafterCommLength, 'NA', BEAMS_COST,
    /* weight */ 0, /* lnF */ 0,
  ));
  engineerInputRequired.push('MF-03');

  // ------------------------------------------------------------------
  // Wind Columns  (id: 'MF-05')
  //
  // Workbook row 13: W 8×35 (35 lb/ft). Qty = windColumnsQty (4 for W≥40).
  // Weight is deterministic; rounded up to commercial 20 ft bar lengths.
  // ------------------------------------------------------------------
  if (windColumnsQty > 0) {
    const wcLength = H;
    const wcLnFtToFab = windColumnsQty * wcLength;
    const wcWeightPerFt = 35; // W 8 x 35: 35 lb/ft
    const wcLnF = calcLnF(wcLnFtToFab, 20);
    const wcWeight = wcLnF * wcWeightPerFt;
    items.push(makeBOMItem(
      'MF-05', 'main-framing', 'Wind Columns', 'BEAMS', 'W 8 x 35',
      windColumnsQty, wcLength, wcLnFtToFab,
      wcLnF, 'Pound/ft', BEAMS_COST, wcWeight, wcLnF,
    ));
  }

  // ------------------------------------------------------------------
  // End Frame Columns  (id: 'MF-02')  — only when economicEndFrame = true
  //
  // Cold-formed Cee sections; 2 per endwall × 2 endwalls = 4 total.
  // ------------------------------------------------------------------
  if (options.economicEndFrame) {
    const efcQty = 4; // 2 per endwall × 2 endwalls
    const efcLength = H;
    const efcLnFtToFab = efcQty * efcLength;
    const efcLnF = calcLnF(efcLnFtToFab, 24);
    const efcWeightPerFt = 4.17; // Cee 8 x 3 1/2 x 14 Red Ox: 4.17 lb/ft
    items.push(makeBOMItem(
      'MF-02', 'main-framing', 'End Frame Columns', 'COLD FORM',
      'Cee 8 x 3 1/2 x 14 Red Ox',
      efcQty, efcLength, efcLnFtToFab,
      efcLnF, 'Ln Ft', COLD_FORM_COST, efcLnF * efcWeightPerFt, efcLnF,
    ));

    // End Frame Rafters  (id: 'MF-04')
    const efrQty = 2; // 1 per endwall × 2 endwalls
    const efrLnFtToFab = isGable
      ? efrQty * 2 * rafterLengthPerSide
      : efrQty * rafterLengthFull;
    const efrLnF = calcLnF(efrLnFtToFab, 24);
    const efrWeightPerFt = 4.17;
    items.push(makeBOMItem(
      'MF-04', 'main-framing', 'End Frame Rafters', 'COLD FORM',
      'Cee 8 x 3 1/2 x 14 Red Ox',
      efrQty, W, efrLnFtToFab,
      efrLnF, 'Ln Ft', COLD_FORM_COST, efrLnF * efrWeightPerFt, efrLnF,
    ));
  }

  // ------------------------------------------------------------------
  // Central Poles  (id: 'MF-06')  — only when centralPoles = true
  //
  // Pipe 5" Diam 40S std (14.62 lb/ft). One pole per interior bay midpoint.
  // ------------------------------------------------------------------
  if (options.centralPoles) {
    const cpQty = Math.max(1, nBays - 1);
    const cpLength = H;
    const cpLnFtToFab = cpQty * cpLength;
    const cpLnF = calcLnF(cpLnFtToFab, 20);
    const cpWeightPerFt = 14.62; // Pipe 5" Diam 40S std
    items.push(makeBOMItem(
      'MF-06', 'main-framing', 'Central Poles', 'PIPES',
      'Pipe 5" Diam 40S std',
      cpQty, cpLength, cpLnFtToFab,
      cpLnF, 'Pound/ft', BEAMS_COST, cpLnF * cpWeightPerFt, cpLnF,
    ));
  }

  // ------------------------------------------------------------------
  // Base Plates  (id: 'PL-01')
  //
  // Workbook row 61: Flat Bar 1/2 x 8 (13.6 lb/ft), CommLength=20 ft.
  // Qty formula verified against 50×100×20 reference building:
  //   2 × (3×nFrames + windColumnsQty) = 2 × (15+4) = 38 ✓
  // Plate length = 18.25" = 1.5208 ft (standard anchor-bolt-group length).
  // Weight uses commercial bar quantity (rounded-up lnF), not lnFtToFab.
  // ------------------------------------------------------------------
  const bpQty = 2 * (3 * nFrames + windColumnsQty);
  const bpLength = 1.5208; // 18.25" / 12
  const bpLnFtToFab = bpQty * bpLength;
  const bpLnF = calcLnF(bpLnFtToFab, 20);
  const bpWeightPerFt = 13.6; // Flat Bar 1/2 x 8
  items.push(makeBOMItem(
    'PL-01', 'plates', 'Base Plates', 'FLAT BARS', 'Flat Bar 1/2 x 8',
    bpQty, bpLength, bpLnFtToFab,
    bpLnF, 'Pound/ft', FLAT_BAR_COST, bpLnF * bpWeightPerFt, bpLnF,
  ));

  // ------------------------------------------------------------------
  // Purlin Plates  (id: 'PL-02')
  //
  // Workbook row 62: Flat Bar 3/16 x 6 (3.83 lb/ft).
  // Qty = purlinsPerSide × nFrames. Verified: 10 × 5 = 50 ✓
  // Plate length = 8.25" = 0.6875 ft (standard saddle-plate height).
  // ------------------------------------------------------------------
  const ppQty = purlins * nFrames;
  const ppLength = 0.6875; // 8.25" / 12
  const ppLnFtToFab = ppQty * ppLength;
  const ppLnF = calcLnF(ppLnFtToFab, 20);
  const ppWeightPerFt = 3.83; // Flat Bar 3/16 x 6
  items.push(makeBOMItem(
    'PL-02', 'plates', 'Purlin Plates', 'FLAT BARS', 'Flat Bar 3/16 x 6',
    ppQty, ppLength, ppLnFtToFab,
    ppLnF, 'Pound/ft', FLAT_BAR_COST, ppLnF * ppWeightPerFt, ppLnF,
  ));

  // ------------------------------------------------------------------
  // Side Girt Plates  (id: 'PL-03')
  //
  // Workbook row 63: Flat Bar 3/16 x 6 (3.83 lb/ft).
  // Qty = girts × 4 × nFrames.
  //   ×4 = 2 sidewalls × 2 clips per column face (bypass girt configuration).
  // Verified: 4 × 4 × 5 = 80 ✓
  // Plate length = 9" = 0.75 ft.
  // ------------------------------------------------------------------
  const sgpQty = girts * 4 * nFrames;
  const sgpLength = 0.75; // 9" / 12
  const sgpLnFtToFab = sgpQty * sgpLength;
  const sgpLnF = calcLnF(sgpLnFtToFab, 20);
  const sgpWeightPerFt = 3.83;
  items.push(makeBOMItem(
    'PL-03', 'plates', 'Side Girt Plates', 'FLAT BARS', 'Flat Bar 3/16 x 6',
    sgpQty, sgpLength, sgpLnFtToFab,
    sgpLnF, 'Pound/ft', FLAT_BAR_COST, sgpLnF * sgpWeightPerFt, sgpLnF,
  ));

  // ------------------------------------------------------------------
  // End Girt Plates  (id: 'PL-04')
  //
  // Workbook row 64: Flat Bar 3/16 x 6 (3.83 lb/ft).
  // Qty = girts × columnsPerEndwall × 2 endwalls.
  //   columnsPerEndwall = 2 main-frame columns + windColumnsPerEndwall.
  // Verified: 4 × 4 × 2 = 32 ✓ (reference: 2+2=4 cols/endwall, 2 endwalls)
  // Plate length = 9" = 0.75 ft.
  // ------------------------------------------------------------------
  const egpQty = girts * columnsPerEndwall * 2;
  const egpLength = 0.75;
  const egpLnFtToFab = egpQty * egpLength;
  const egpLnF = calcLnF(egpLnFtToFab, 20);
  const egpWeightPerFt = 3.83;
  items.push(makeBOMItem(
    'PL-04', 'plates', 'End Girt Plates', 'FLAT BARS', 'Flat Bar 3/16 x 6',
    egpQty, egpLength, egpLnFtToFab,
    egpLnF, 'Pound/ft', FLAT_BAR_COST, egpLnF * egpWeightPerFt, egpLnF,
  ));

  // ------------------------------------------------------------------
  // Rollup summaries
  // ------------------------------------------------------------------
  const IN_HOUSE_FAB = new Set(['BEAMS', 'CHANNELS', 'FLAT BARS', 'ANGLES', 'PIPES', 'HSS']);
  const structuralWeightLbs = items
    .filter((it) => IN_HOUSE_FAB.has((it.group ?? '').toUpperCase()))
    .reduce((sum, it) => sum + it.weight, 0);

  const coldFormedLengthFt = items
    .filter((it) => (it.group ?? '').toUpperCase() === 'COLD FORM')
    .reduce((sum, it) => sum + it.lnF, 0);

  return { items, structuralWeightLbs, coldFormedLengthFt, engineerInputRequired };
}

// ---------------------------------------------------------------------------
// SECONDARY FRAMING
// ---------------------------------------------------------------------------

/**
 * Compute secondary framing BOM: purlins (roof), girts (walls), eave struts.
 *
 * Formula source: Components.txt rows 9–20 (reference building 50W × 100L × 20H,
 * gable, pitch 1:12, girts=4/side, purlins=10).
 *
 * ⚠️ WORKBOOK NOTE: Components.txt shows purlin Length=130 for L=100 building,
 * implying 15 ft front/back gable overhangs. This engine uses L (no overhangs)
 * as the default. See .squad/decisions/inbox/livingston-issue4-component-qty.md.
 */
export function computeSecondaryFraming(config: BuildingConfig): ComponentItem[] {
  const { dimensions } = config;
  const { width: W, length: L, girts, purlins } = dimensions;

  // Zee 8 x 2 1/2 x 14 Red Ox: price and weight verified from Components.txt rows 9/10/13
  const ZEE_COST = 3.6295;   // $/LnFt
  const ZEE_WEIGHT = 3.269;  // lb/LnFt  (2667.83 lbs / 816 lnF from workbook row 9)

  // Eave Strut 8 x 5 x 2 3/4 12GA Red Ox: Components.txt row 19
  const EAVE_COST = 6.6373;   // $/LnFt
  const EAVE_WEIGHT = 6.037;  // lb/LnFt  (1207.42 lbs / 200 lnF from workbook row 19)

  const items: ComponentItem[] = [];

  // Side Wall Girts: girts (rows per sidewall) × 2 sidewalls, each running full length L
  // Workbook: Qty=8 (=4×2), Length=100, LnFtToFab=800 for reference 50×100 building ✓
  const swgQty = girts * 2;
  const swgLnFtToFab = swgQty * L;
  const swgLnF = calcLnF(swgLnFtToFab, 24);
  items.push(makeBOMItem(
    'SF-01', 'purlins-girts', 'Side Wall Girts', 'COLD FORM',
    'Zee 8 x 2 1/2 x 14 Red Ox',
    swgQty, L, swgLnFtToFab,
    24, 'Ln Ft', ZEE_COST, swgLnF * ZEE_WEIGHT, swgLnF,
  ));

  // End Wall Girts: girts × 2 endwalls, each spanning width W
  // Workbook: Qty=8, Length=50 (=W), LnFtToFab=400 for reference building ✓
  const ewgQty = girts * 2;
  const ewgLnFtToFab = ewgQty * W;
  const ewgLnF = calcLnF(ewgLnFtToFab, 24);
  items.push(makeBOMItem(
    'SF-02', 'purlins-girts', 'End Wall Girts', 'COLD FORM',
    'Zee 8 x 2 1/2 x 14 Red Ox',
    ewgQty, W, ewgLnFtToFab,
    24, 'Ln Ft', ZEE_COST, ewgLnF * ZEE_WEIGHT, ewgLnF,
  ));

  // Roof Purlins: purlin rows × building length L
  // Workbook: Qty=10, Length=130 (see workbook note above), LnFtToFab=1300
  // Engine uses L=100 → LnFtToFab=1000. Overhang delta flagged in decisions inbox.
  const rpQty = purlins;
  const rpLnFtToFab = rpQty * L;
  const rpLnF = calcLnF(rpLnFtToFab, 24);
  items.push(makeBOMItem(
    'SF-03', 'purlins-girts', 'Roof Purlins', 'COLD FORM',
    'Zee 8 x 2 1/2 x 14 Red Ox',
    rpQty, L, rpLnFtToFab,
    24, 'Ln Ft', ZEE_COST, rpLnF * ZEE_WEIGHT, rpLnF,
  ));

  // Eave Struts: 2 (one per sidewall), each running full length L
  // Workbook: Qty=2, Length=100, LnFtToFab=200 ✓
  const esQty = 2;
  const esLnFtToFab = esQty * L;
  const esLnF = calcLnF(esLnFtToFab, 20);
  items.push(makeBOMItem(
    'SF-04', 'purlins-girts', 'Eave Strut', 'EAVE STRUT',
    '8 x 5 x 2 3/4 12GA Red Ox',
    esQty, L, esLnFtToFab,
    20, 'Ln ft', EAVE_COST, esLnF * EAVE_WEIGHT, esLnF,
  ));

  return items;
}

// ---------------------------------------------------------------------------
// SHEETING
// ---------------------------------------------------------------------------

/**
 * Compute roof and wall sheeting BOM.
 *
 * PBR panel coverage = 36" = 3 ft wide. Panels are ordered as cut-to-length
 * linear feet (no in-house fabrication labor).
 *
 * Formula source: Components.txt rows 28–35.
 * Reference building: 50W × 100L × 20H, gable, pitch 1:12.
 *
 * ROOF PANEL NOTE: The workbook computes a single "ROOF" line where:
 *   qty  = L/3 (panel runs across the building length)
 *   length = W × slopeFactor (full sloped width, gable: from eave to eave)
 * This yields the total linear footage ordered across both slopes combined.
 */
export function computeSheeting(config: BuildingConfig): ComponentItem[] {
  const { dimensions, roofType } = config;
  const { width: W, length: L, eaveHeight: H, roofPitch: p } = dimensions;

  const isGable = roofType !== 'single-slope';
  const PANEL_WIDTH = 3; // 36" PBR panel coverage = 3 ft

  // Slope geometry
  const slopeFactor = Math.sqrt(1 + (p / 12) ** 2);

  // Ridge height (open question answer: default = eaveHeight + width×pitch/12 for single-slope)
  const ridgeHeight = isGable
    ? H + (W / 2) * (p / 12)
    : H + W * (p / 12);

  // Average end wall height for sheeting (triangle + rectangle for gable)
  // Verified: (20+22.083)/2 = 21.04 ≈ Components.txt row 33 length=21.045 ✓
  const avgEndWallH = (H + ridgeHeight) / 2;

  // Sloped rafter lengths
  const rafterLengthFull = W * slopeFactor; // gable: eave-to-eave; single-slope: eave-to-eave

  // Pricing from Components.txt
  const ROOF_COST = 3.2071;     // $/LnFt — PBR 26Ga Galvalume (workbook row 29)
  const ROOF_WEIGHT = 2.624;    // lb/LnFt  (4408.49/1680 from workbook row 29)
  const WALL_COST = 3.9827;     // $/LnFt — PBR 26Ga Color (workbook rows 30/33)
  const WALL_WEIGHT = 2.707;    // lb/LnFt  (3639.28/1344 from workbook row 30)
  const RIDGE_CAP_COST = 4.257; // $/LnFt (workbook row 28)
  const RIDGE_CAP_WEIGHT = 1.14; // lb/LnFt  (136.8/120 from workbook row 28)

  const items: ComponentItem[] = [];

  // Ridge Cap: runs the full building length L (gable only)
  // Workbook: LnFtToFab=100 (=L), qty=33.33=L/3 rows × 3 ft each (same as panel runs)
  // We represent as qty=1 run of length=L for cleanliness; ordered lnF same either way.
  if (isGable) {
    const rcLnFtToFab = L;
    const rcLnF = calcLnF(rcLnFtToFab, 24);
    items.push(makeBOMItem(
      'SH-01', 'roof-wall-sheeting', 'Ridge Cap', 'SHEETING',
      'Ridge Cap (Peek Sheets) With Accessories',
      1, L, rcLnFtToFab, 24, 'Ln Ft', RIDGE_CAP_COST, rcLnF * RIDGE_CAP_WEIGHT, rcLnF,
    ));
  }

  // Roof Panels: qty = L / PANEL_WIDTH panel runs, each spanning full sloped width
  // Workbook: qty=33.33=100/3, length=50.18=50×slopeFactor ✓
  const roofPanelQty = L / PANEL_WIDTH;
  const roofLnFtToFab = roofPanelQty * rafterLengthFull;
  const roofLnF = calcLnF(roofLnFtToFab, 24);
  items.push(makeBOMItem(
    'SH-02', 'roof-wall-sheeting', 'Roof Panels', 'SHEETING',
    'Panel PBR 26Ga Lifetime Galvalume 36" x 1 1/4"',
    roofPanelQty, rafterLengthFull, roofLnFtToFab,
    24, 'Ln Ft', ROOF_COST, roofLnF * ROOF_WEIGHT, roofLnF,
  ));

  // Side Wall Panels: 2 sidewalls × (L/PANEL_WIDTH) panel runs each, each H ft tall
  // Workbook: qty=66.67=2×100/3, length=20 (=H) ✓
  const swPanelQty = 2 * L / PANEL_WIDTH;
  const swLnFtToFab = swPanelQty * H;
  const swLnF = calcLnF(swLnFtToFab, 24);
  items.push(makeBOMItem(
    'SH-03', 'roof-wall-sheeting', 'Side Wall Panels', 'SHEETING',
    'Panel PBR 26Ga Lifetime Color 36" x 1 1/4"',
    swPanelQty, H, swLnFtToFab,
    24, 'Ln Ft', WALL_COST, swLnF * WALL_WEIGHT, swLnF,
  ));

  // End Wall Panels: 2 endwalls × (W/PANEL_WIDTH) panel runs each, each avgEndWallH ft tall
  // Workbook: qty=33.33=2×50/3, length=21.045≈avgEndWallH ✓
  const ewPanelQty = 2 * W / PANEL_WIDTH;
  const ewLnFtToFab = ewPanelQty * avgEndWallH;
  const ewLnF = calcLnF(ewLnFtToFab, 24);
  items.push(makeBOMItem(
    'SH-04', 'roof-wall-sheeting', 'End Wall Panels', 'SHEETING',
    'Panel PBR 26Ga Lifetime Color 36" x 1 1/4"',
    ewPanelQty, avgEndWallH, ewLnFtToFab,
    24, 'Ln Ft', WALL_COST, ewLnF * WALL_WEIGHT, ewLnF,
  ));

  return items;
}

// ---------------------------------------------------------------------------
// TRIM
// ---------------------------------------------------------------------------

/**
 * Compute trim BOM: base angle, rake angle, rake trim, peak box, eave gutter,
 * outside corner trim.
 *
 * Formula source: Components.txt rows 22–24 (rake/base angles) and 42–67 (roof/wall trim).
 * Reference building: 50W × 100L × 20H, gable, pitch 1:12.
 */
export function computeTrim(config: BuildingConfig): ComponentItem[] {
  const { dimensions, roofType } = config;
  const { width: W, length: L, eaveHeight: H, roofPitch: p } = dimensions;

  const isGable = roofType !== 'single-slope';
  const slopeFactor = Math.sqrt(1 + (p / 12) ** 2);

  // Sloped rafter length: per slope (gable) or full width (single-slope)
  const rafterLengthPerSlope = (W / 2) * slopeFactor; // gable: half-width sloped
  const rafterLengthFull = W * slopeFactor;            // single-slope: full-width sloped

  // Pricing from Components.txt
  const ANGLE_COST = 1.4057;       // $/LnFt — Base/Rake angle 2x4 14GA Red Ox (row 23)
  const ANGLE_WEIGHT = 1.393;      // lb/LnFt  (434.55/312 from workbook row 23)
  const RAKE_TRIM_COST = 4.136;    // $/LnFt — Sculptured rake Trim (row 44)
  const RAKE_TRIM_WEIGHT = 1.155;  // lb/LnFt  (127.05/110 from workbook row 44)
  const EAVE_GUTTER_COST = 4.6432; // $/LnFt (row 49)
  const EAVE_GUTTER_WEIGHT = 1.331; // lb/LnFt  (266.26/200 from workbook row 49)
  const CORNER_TRIM_COST = 3.457;   // $/LnFt (row 57)
  const CORNER_TRIM_WEIGHT = 0.96;  // lb/LnFt  (38.4/40 from workbook row 57)
  const PEAK_BOX_COST = 30.14;      // $/pc (row 43)
  const RAKE_END_CAP_COST = 5.866;  // $/pc (row 45)

  const items: ComponentItem[] = [];

  // Base Angle: runs the full perimeter of the building at the base of wall panels
  // Workbook: qty=1, length=300=2×(100+50), LnFtToFab=300 ✓
  const perimeter = 2 * (L + W);
  const baLnF = calcLnF(perimeter, 24);
  items.push(makeBOMItem(
    'TR-01', 'base-rake-angles', 'Base Angle', 'ANGLES',
    'Base/Rake angle 2 x 4 14GA Red Ox',
    1, perimeter, perimeter, 24, 'Ln ft', ANGLE_COST, baLnF * ANGLE_WEIGHT, baLnF,
  ));

  // Rake Angle: at each sloped gable edge
  // Gable: 4 rake edges (2 per endwall) × rafterLengthPerSlope each
  // Single-slope: 2 rake edges × rafterLengthFull each
  // Workbook: qty=2, length=50.18, LnFtToFab=100.36 (same as 4×25.09) ✓
  const rakeQty = isGable ? 4 : 2;
  const rakeLength = isGable ? rafterLengthPerSlope : rafterLengthFull;
  const raLnFtToFab = rakeQty * rakeLength;
  const raLnF = calcLnF(raLnFtToFab, 24);
  items.push(makeBOMItem(
    'TR-02', 'base-rake-angles', 'Rake Angle', 'ANGLES',
    'Base/Rake angle 2 x 4 14GA Red Ox',
    rakeQty, rakeLength, raLnFtToFab, 24, 'Ln ft', ANGLE_COST, raLnF * ANGLE_WEIGHT, raLnF,
  ));

  // Rake Trim (sculptured): same extents as rake angle, different material/commLength
  // Workbook: qty=4, length=25.09, LnFtToFab=100.36, CommLength=10 ✓
  const rtLnFtToFab = rakeQty * rakeLength;
  const rtLnF = calcLnF(rtLnFtToFab, 10);
  items.push(makeBOMItem(
    'TR-03', 'roof-trim', 'Rake Trim', 'ROOF TRIM',
    'Sculptured rake Trim',
    rakeQty, rakeLength, rtLnFtToFab, 10, 'Ln Ft', RAKE_TRIM_COST, rtLnF * RAKE_TRIM_WEIGHT, rtLnF,
  ));

  // Peak Box: 1 per gable end (gable only)
  // Workbook: qty=2, unit $/pc ✓
  if (isGable) {
    items.push(makeBOMItem(
      'TR-04', 'roof-trim', 'Peak Box', 'ROOF TRIM',
      'Peak Box',
      2, 0, 0, 0, 'pc', PEAK_BOX_COST, 0, 0,
    ));

    // Rake End Cap: 2 caps per rake edge (top + bottom) × 4 rake edges
    // Workbook: qty=8 ✓
    items.push(makeBOMItem(
      'TR-05', 'roof-trim', 'Rake End Cap', 'ROOF TRIM',
      'Rake End cap',
      rakeQty * 2, 0, 0, 0, 'pc', RAKE_END_CAP_COST, 0, 0,
    ));
  }

  // Eave Gutter: 2 gutters (one per sidewall), each running full building length L
  // Workbook: qty=2, length=100, LnFtToFab=200, CommLength=10 ✓
  const egLnFtToFab = 2 * L;
  const egLnF = calcLnF(egLnFtToFab, 10);
  items.push(makeBOMItem(
    'TR-06', 'roof-trim', 'Eave Gutter', 'ROOF TRIM',
    'Eave gutter',
    2, L, egLnFtToFab, 10, 'Ln Ft', EAVE_GUTTER_COST, egLnF * EAVE_GUTTER_WEIGHT, egLnF,
  ));

  // Outside Corner Trim: 4 building corners, each H ft tall
  // Workbook: qty=4, length=20 (=H), LnFtToFab=80, CommLength=10 ✓
  const ctLnFtToFab = 4 * H;
  const ctLnF = calcLnF(ctLnFtToFab, 10);
  items.push(makeBOMItem(
    'TR-07', 'wall-trim', 'Outside Corner Trim', 'WALL TRIM',
    'Outside Corner Trim',
    4, H, ctLnFtToFab, 10, 'Ln Ft', CORNER_TRIM_COST, ctLnF * CORNER_TRIM_WEIGHT, ctLnF,
  ));

  return items;
}

// ---------------------------------------------------------------------------
// FASTENERS & HARDWARE
// ---------------------------------------------------------------------------

/**
 * Compute fasteners and standard hardware BOM.
 *
 * Formula source: Components.txt rows 87–98 (Standard Hardware).
 * Reference building: 50W × 100L × 20H, gable, pitch 1:12.
 *
 * ASSUMPTION LOG (see .squad/decisions/inbox/livingston-issue4-component-qty.md):
 *   - Fasteners (screws): 0.71/sqft of total sheeted area   (workbook: 7858.9 / ~11,122 sqft)
 *   - Tri Bead Tape Sealant: 1 roll per 25 ft of building length  (workbook: 4 for L=100)
 *   - Polyurethane Tube Sealant: 1 tube per 2960 sqft of sheeted area (workbook: 3.76 for ~11,122 sqft)
 *   - Outside/Inside Closure: 1 per 13 lnft of roof panel LnFtToFab  (workbook: 129 / 1672.67 ≈ 0.077)
 *   - Low Floating Eave Plate: 1 per 4 ft of building length          (workbook: 25 for L=100)
 *   - Low Floating Rake Support: (W/2 × slopeFactor) / 5 per slope   (workbook: 5.018 for W=50,p=1)
 *   - Backup Plate: 1 per foot of building length                     (workbook: 100 for L=100)
 *   - Sheeting Angle: 1 per foot of perimeter                        (workbook: 300 for P=300)
 */
export function computeFasteners(config: BuildingConfig): ComponentItem[] {
  const { dimensions, roofType } = config;
  const { width: W, length: L, eaveHeight: H, roofPitch: p } = dimensions;

  const isGable = roofType !== 'single-slope';
  const slopeFactor = Math.sqrt(1 + (p / 12) ** 2);
  const ridgeHeight = isGable ? H + (W / 2) * (p / 12) : H + W * (p / 12);
  const avgEndWallH = (H + ridgeHeight) / 2;
  const perimeter = 2 * (L + W);

  // Total sheeted area — basis for fastener and sealant counts
  const roofArea = L * W * slopeFactor;       // total sloped roof area (both slopes for gable)
  const sideWallArea = 2 * L * H;
  const endWallArea = 2 * W * avgEndWallH;
  const totalArea = roofArea + sideWallArea + endWallArea;

  // Roof panel LnFtToFab — basis for closure strip count
  const roofLnFtToFab = (L / 3) * (W * slopeFactor);

  // Pricing from Components.txt / Fasteners and Bolts.txt
  const FASTENER_COST = 0.165;      // $/pc (row 27 of Fasteners and Bolts.txt)
  const TAPE_COST = 82.111;         // $/roll — Tri Bead Tap Sealant (row 88)
  const TUBE_COST = 16.493;         // $/tube — Polyurethane Tube Sealant (row 89)
  const CLOSURE_COST = 1.303;       // $/pc — Outside/Inside Closure (rows 90/92)
  const EAVE_PLATE_COST = 25.640;   // $/pc (row 94)
  const RAKE_SUPPORT_COST = 72.026; // $/pc (row 95)
  const BACKUP_PLATE_COST = 14.485; // $/pc (row 96)
  const SHEETING_ANGLE_COST = 3.785; // $/pc (row 98)

  const FASTENER_FACTOR = 0.71;   // screws/sqft — derived from workbook (7858.9/11122)

  const items: ComponentItem[] = [];

  // Fasteners (sheet metal screws): 0.71 per sqft of all sheeted surfaces
  const fastenerQty = Math.round(totalArea * FASTENER_FACTOR);
  items.push(makeBOMItem(
    'FN-01', 'fasteners', 'Fasteners', 'BOLTS AND FASTENERS',
    'Fasteners',
    fastenerQty, 0, 0, 0, 'pc', FASTENER_COST, 0, 0,
  ));

  // Tri Bead Tape Sealant: 1 roll per 25 ft of building length
  const tapeQty = Math.ceil(L / 25);
  items.push(makeBOMItem(
    'FN-02', 'standard-hardware', 'Tri Bead Tape Sealant', 'HARDWARE',
    'Tri Bead Tap Sealant',
    tapeQty, 0, 0, 0, 'pc', TAPE_COST, 0, 0,
  ));

  // Polyurethane Tube Sealant: 1 tube per 2960 sqft of sheeted area
  const tubeQty = Math.ceil(totalArea / 2960);
  items.push(makeBOMItem(
    'FN-03', 'standard-hardware', 'Polyurethane Tube Sealant', 'HARDWARE',
    'Polyurethane Tube Sealant',
    tubeQty, 0, 0, 0, 'pc', TUBE_COST, 0, 0,
  ));

  // Outside Closure For R/U Panel: 1 per ~13 lnft of roof panel LnFtToFab
  const closureQty = Math.ceil(roofLnFtToFab / 13);
  items.push(makeBOMItem(
    'FN-04', 'standard-hardware', 'Outside Closure For R/U Panel', 'HARDWARE',
    'Outside Closure For R/U Panel',
    closureQty, 0, 0, 0, 'pc', CLOSURE_COST, 0, 0,
  ));

  // Inside Closure For R/U Panel: same count as outside
  items.push(makeBOMItem(
    'FN-05', 'standard-hardware', 'Inside Closure For R/U Panel', 'HARDWARE',
    'Inside Closure For R/U Panel',
    closureQty, 0, 0, 0, 'pc', CLOSURE_COST, 0, 0,
  ));

  // Low Floating Eave Plate: 1 per 4 ft of building length
  const eavePlateQty = Math.ceil(L / 4);
  items.push(makeBOMItem(
    'FN-06', 'standard-hardware', 'Low Floating Eave Plate', 'HARDWARE',
    'Low Floating Eave Plate',
    eavePlateQty, 0, 0, 0, 'pc', EAVE_PLATE_COST, 0, 0,
  ));

  // Low Floating Rake Support: (half-rafter sloped length / 5) supports per slope
  // Workbook: 5.018 = (50/2 × 1.00347) / 5 for reference building ✓
  const rakeSupportQty = (W / 2) * slopeFactor / 5;
  items.push(makeBOMItem(
    'FN-07', 'standard-hardware', 'Low Floating Rake Support', 'HARDWARE',
    'Low Floating Rake Support',
    rakeSupportQty, 0, 0, 0, 'pc', RAKE_SUPPORT_COST, 0, 0,
  ));

  // Backup Plate: 1 per foot of building length
  // Workbook: 100 plates for L=100 ✓
  items.push(makeBOMItem(
    'FN-08', 'standard-hardware', 'Backup Plate', 'HARDWARE',
    'Backup Plate',
    L, 0, 0, 0, 'pc', BACKUP_PLATE_COST, 0, 0,
  ));

  // Sheeting Angle: 1 per foot of perimeter
  // Workbook: 300 for P=2×(100+50)=300 ✓
  items.push(makeBOMItem(
    'FN-09', 'standard-hardware', 'Sheeting Angle', 'HARDWARE',
    'Sheeting Angle',
    perimeter, 0, 0, 0, 'pc', SHEETING_ANGLE_COST, 0, 0,
  ));

  return items;
}

// ---------------------------------------------------------------------------
// FULL BOM AGGREGATOR
// ---------------------------------------------------------------------------

/**
 * Compute the complete parametric BOM for a building configuration.
 *
 * Calls all individual calculators and returns a merged list suitable for
 * display in the QuotationPage or for writing back to config.components.
 *
 * UI WIRING NOTE for Linus (see .squad/decisions/inbox/linus-auto-bom-display.md):
 *   Call computeFullBom(config) after every DesignPage save or when the user
 *   clicks "Recalculate BOM". The returned items array replaces (or merges with)
 *   config.components using mergeWithExisting().
 */
export function computeFullBom(config: BuildingConfig): {
  items: ComponentItem[];
  mainFramingSummary: FramingBOMSummary;
} {
  const mainFramingSummary = generateMainFramingBOM(config);
  const items: ComponentItem[] = [
    ...mainFramingSummary.items,
    ...computeSecondaryFraming(config),
    ...computeSheeting(config),
    ...computeTrim(config),
    ...computeFasteners(config),
  ];
  return { items, mainFramingSummary };
}

// ---------------------------------------------------------------------------
// mergeWithExisting
// ---------------------------------------------------------------------------

/**
 * Merge engine BOM defaults with user-entered overrides from config.components.
 *
 * Merge rule:
 *   - If an existing component shares an ID with a BOM item AND has qty > 0
 *     OR weight > 0, it is treated as a deliberate user override → kept as-is.
 *   - Otherwise the BOM-generated default replaces it.
 *   - User-added components whose ID does not appear in the BOM are preserved
 *     at the end of the list (custom items Linus might have added from the UI).
 *
 * To force a full reset to engine defaults, pass [] for existing.
 */
export function mergeWithExisting(
  bomItems: ComponentItem[],
  existing: ComponentItem[],
): ComponentItem[] {
  const bomMap = new Map(bomItems.map((c) => [c.id, c]));
  const existingMap = new Map(existing.map((c) => [c.id, c]));

  const merged: ComponentItem[] = [];

  // BOM items in order, with user overrides applied where present
  for (const bomItem of bomItems) {
    const existingItem = existingMap.get(bomItem.id);
    if (existingItem && (existingItem.qty > 0 || existingItem.weight > 0)) {
      merged.push(existingItem);
    } else {
      merged.push(bomItem);
    }
  }

  // Preserve user-added items not generated by the BOM
  for (const existingItem of existing) {
    if (!bomMap.has(existingItem.id)) {
      merged.push(existingItem);
    }
  }

  return merged;
}
