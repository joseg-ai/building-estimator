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
