/**
 * Server-side PDF generation for PEMB quotations.
 * Uses pdfkit (lightweight, no headless browser needed).
 * Sections follow pemb-quotation-anatomy SKILL.md order.
 */
'use strict';

const PDFDocument = require('pdfkit');

const BRAND_BLUE = '#1e3a5f';
const LIGHT_GRAY = '#f5f5f5';
const MID_GRAY = '#888888';
const TEXT_COLOR = '#1a1a1a';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function fmt(n) {
  return USD.format(n ?? 0);
}

function yn(val) {
  return val ? 'YES' : 'NO';
}

/**
 * Build and pipe a PDF for the given quote row (full DB row with config_json).
 * @param {object} row  - Full DB row from quotes table
 * @param {object} res  - Express response to pipe into
 */
function generateQuotePDF(row, res) {
  const config = JSON.parse(row.config_json);
  const { dimensions = {}, options = {}, sheeting = {}, insulation = {},
    doorsWindows = {}, overheads = {}, additionalStructures } = config;

  const rev = row.revision ?? 0;
  const filename = `Q-${row.id}-r${rev}.pdf`;
  const quoteLabel = row.quote_number ? `${row.quote_number} / Rev. ${rev}` : `${row.id} / Rev. ${rev}`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'LETTER', margin: 50, info: {
    Title: `Quotation ${quoteLabel}`,
    Author: 'Building Estimator',
  }});

  doc.pipe(res);

  // ── helpers ───────────────────────────────────────────────────────────────

  function sectionTitle(text) {
    doc.moveDown(0.6)
      .font('Helvetica-Bold').fontSize(9).fillColor(BRAND_BLUE)
      .text(text.toUpperCase())
      .moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(BRAND_BLUE).lineWidth(0.5).stroke()
      .fillColor(TEXT_COLOR).moveDown(0.3);
  }

  function checkRow(label, value) {
    const y = doc.y;
    doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR)
      .text(label, doc.x, y, { width: 380, continued: false });
    const tag = value ? 'YES' : 'NO';
    const tagX = doc.page.width - doc.page.margins.right - 30;
    doc.font('Helvetica-Bold').fontSize(8)
      .fillColor(value ? '#15803d' : MID_GRAY)
      .text(tag, tagX, y, { width: 30, align: 'right' });
    doc.fillColor(TEXT_COLOR);
    doc.moveDown(0.15);
  }

  function tableRow(label, value, bold = false) {
    const y = doc.y;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
      .fillColor(TEXT_COLOR).text(label, doc.x, y, { width: 350, continued: false });
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
      .fillColor(TEXT_COLOR)
      .text(value, doc.page.margins.left, y, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'right' });
    doc.moveDown(0.4);
  }

  function infoGrid(pairs) {
    const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 20) / 2;
    for (let i = 0; i < pairs.length; i += 2) {
      const y = doc.y;
      const left = pairs[i];
      const right = pairs[i + 1];
      if (left) {
        doc.font('Helvetica').fontSize(7).fillColor(MID_GRAY)
          .text(left[0].toUpperCase(), doc.page.margins.left, y, { width: colW });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_COLOR)
          .text(left[1] || '—', doc.page.margins.left, doc.y, { width: colW });
      }
      if (right) {
        const rowY = y;
        doc.font('Helvetica').fontSize(7).fillColor(MID_GRAY)
          .text(right[0].toUpperCase(), doc.page.margins.left + colW + 20, rowY, { width: colW });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_COLOR)
          .text(right[1] || '—', doc.page.margins.left + colW + 20, doc.y, { width: colW });
      }
      doc.moveDown(0.5);
    }
  }

  // ── SECTION 1: Company Header ─────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND_BLUE)
    .text('BUILDING ESTIMATOR', { align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor(MID_GRAY)
    .text('Pre-Engineered Metal Buildings', { align: 'center' });
  doc.moveDown(0.3)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor(BRAND_BLUE).lineWidth(1).stroke()
    .moveDown(0.5);

  // ── SECTION 2+3: Client / Job Block + Quote # ─────────────────────────────
  sectionTitle('Proposal Information');
  infoGrid([
    ['Proposal Submitted To:', config.customerName || '—'],
    ['Job Name:', config.projectName || '—'],
    ['Date:', new Date().toLocaleDateString('en-US')],
    ['Job Location:', config.jobLocation || '—'],
    ['Quote Number:', row.quote_number || '—'],
    ['Revision:', `Rev. ${rev}`],
    ['Quote Valid Until:', row.valid_until || '—'],
    null,
  ]);

  // ── SECTION 4: Building Description ──────────────────────────────────────
  sectionTitle('Building Specifications');
  const roofSlope = config.roofType === 'single-slope' ? 'Single Slope' : 'Gable Slope';
  doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_COLOR)
    .text(
      `One Metal Building ${dimensions.width || 0}W × ${dimensions.length || 0}L × ` +
      `${dimensions.eaveHeight || 0}H, ${dimensions.roofPitch || 4}:12 Roof Pitch, ${roofSlope}`
    )
    .moveDown(0.5);

  // ── SECTION 5: Additional Structures ────────────────────────────────────
  sectionTitle('Additional Structures');

  const addlItems = [];
  if (additionalStructures) {
    if (additionalStructures.overhangs?.enabled) {
      const ds = additionalStructures.overhangs.dims ? ` — ${additionalStructures.overhangs.dims}` : '';
      addlItems.push(`Overhangs (qty ${additionalStructures.overhangs.qty})${ds}`);
    }
    if (additionalStructures.leanTos?.enabled) {
      addlItems.push(`Lean-to(s) (qty ${additionalStructures.leanTos.qty}) — ${additionalStructures.leanTos.width}' W × ${additionalStructures.leanTos.length}' L`);
    }
    if (additionalStructures.parapets?.enabled) {
      addlItems.push(`Parapet — ${additionalStructures.parapets.height} ft high`);
    }
    if (additionalStructures.canopies?.enabled) {
      addlItems.push(`Canopies (qty ${additionalStructures.canopies.qty}) — ${additionalStructures.canopies.width}' W × ${additionalStructures.canopies.depth}' D × ${additionalStructures.canopies.height}' H`);
    }
    if (additionalStructures.hssCanopies?.enabled) {
      addlItems.push(`HSS Canopies (qty ${additionalStructures.hssCanopies.qty})`);
    }
  } else {
    // legacy fallback: scan leanTos in config
    const dirs = ['right', 'left', 'front', 'back'];
    for (const d of dirs) {
      const lt = config.leanTos?.[d];
      if (lt?.enabled) addlItems.push(`Lean-to ${d} (${lt.width}' × ${lt.length}')`);
    }
    if (config.accessories?.canopies?.some(c => c.width > 0)) {
      addlItems.push('Canopies as shown on plans');
    }
  }

  if (addlItems.length === 0) {
    checkRow('None specified', false);
  } else {
    for (const item of addlItems) checkRow(item, true);
  }

  // ── SECTION 6: Components Checklist ──────────────────────────────────────
  sectionTitle('Components');

  const hasComp = (desc) => (config.components || []).some(
    c => c.description?.toLowerCase().includes(desc.toLowerCase()) && c.qty > 0
  );

  checkRow('Roof Panel (PBR 26Ga Lifetime Galvalume 36" × 1¼")', sheeting.roof ?? hasComp('roof panel'));
  checkRow('Side Wall System (PBR 26Ga Lifetime Color 36" × 1¼")', sheeting.sideWall ?? hasComp('side wall'));
  checkRow('End Wall System (PBR 26Ga Lifetime Color 36" × 1¼")', sheeting.endWall ?? hasComp('end wall'));
  checkRow('Side Wall Liner System (PBU 26Ga Color 36" × ¾")', sheeting.swLinerPanel ?? hasComp('side liner'));
  checkRow('End Wall Liner System (PBU 26Ga Color 36" × ¾")', sheeting.ewLinerPanel ?? hasComp('end liner'));
  checkRow('All Trim Standard FL Style, Down Spouts & Gutters (26 Ga)', hasComp('gutter') || hasComp('trim') || hasComp('downspout'));
  checkRow('All Structural Machine Bolts & Component Fasteners', hasComp('bolt') || hasComp('fastener'));
  checkRow('Roof Insulation (R10 3")', insulation.roof);
  checkRow('Side Wall Insulation (R10 3")', insulation.wall);
  checkRow('End Wall Insulation (R10 3")', insulation.additional);

  // ── SECTION 7: Accessories ────────────────────────────────────────────────
  sectionTitle('Accessories');

  const compQty = (desc) =>
    (config.components || []).find(c => c.description?.toLowerCase().includes(desc.toLowerCase()))?.qty ?? 0;

  const dw = doorsWindows;
  const acc3070 = dw.doors3070?.qty ?? compQty('doors 3070');
  const acc4070 = dw.doors4070?.qty ?? compQty('doors 4070');
  const acc6070 = dw.door6070?.qty  ?? compQty('door 6070');
  checkRow(`${acc3070} — Doors 3070 M w/STD Frame 8¼`, acc3070 > 0);
  checkRow(`${acc4070} — Doors 4070 M w/STD Frame 8¼`, acc4070 > 0);
  checkRow(`${acc6070} — Door 6070 M w/STD Frame 8¼`, acc6070 > 0);
  checkRow(`${dw.deadBolt ?? 0} — Dead Bolt(s)`, (dw.deadBolt ?? 0) > 0);
  checkRow(`${dw.panicHardware ?? 0} — Panic Hardware`, (dw.panicHardware ?? 0) > 0);

  const rollUps = (dw.rollUpDoors || []).filter(r => r.qty > 0);
  if (rollUps.length > 0) {
    for (const r of rollUps) {
      checkRow(`${r.qty} — Roll Up Door ${r.width}' × ${r.height}'`, true);
    }
  } else {
    checkRow('0 — Roll Up Door(s)', false);
  }

  const fos = (dw.frameOpenings || []).filter(f => f.qty > 0);
  if (fos.length > 0) {
    for (const f of fos) {
      checkRow(`${f.qty} — Frame Opening ${f.width}' × ${f.height}'`, true);
    }
  } else {
    checkRow('Frame Opening(s)', false);
  }

  const windows = [
    ['window3030', 'Window 3030 Self Flashing'],
    ['window4030', 'Window 4030 Self Flashing'],
    ['window6030', 'Window 6030 Self Flashing'],
    ['window6040', 'Window 6040 Self Flashing'],
  ];
  for (const [key, label] of windows) {
    const qty = dw[key]?.qty ?? 0;
    checkRow(`${qty} — ${label}`, qty > 0);
  }

  // ── SECTION 8: Building Engineering ──────────────────────────────────────
  sectionTitle('Building Engineering');
  checkRow('Sealed Engineer & Jurisdiction-Approved Fabricator Stamped Drawings', true);
  checkRow('Anchor Bolt, Approval & Erection Drawings', true);
  checkRow(`Wind Load Design ${row.wind_speed_mph ?? config.windSpeedMph ?? 115} MPH, Exposure Category ${row.exposure_category ?? config.exposureCategory ?? 'C'}`, true);
  checkRow(`Engineering Design — Roof Live Load ${row.roof_live_load_psf ?? config.roofLiveLoadPsf ?? 20} psf, Snow ${row.snow_load_psf ?? config.snowLoadPsf ?? 0} psf`, true);
  checkRow('Building Erection', (overheads.erection ?? 0) > 0);
  checkRow('Heavy Equipment by Fabricator', false);

  // ── SECTION 9: Itemized Pricing ───────────────────────────────────────────
  sectionTitle('Itemized Pricing');

  const grandTotal = row.grand_total ?? 0;
  const erection = overheads.erection ?? 0;
  const foundation = overheads.foundation ?? 0;
  const permits = overheads.permits ?? 0;
  const buildingPrice = grandTotal - erection - foundation - permits;

  // Table header
  doc.rect(doc.page.margins.left, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 14)
    .fill(BRAND_BLUE);
  const headerY = doc.y + 3;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff')
    .text('Item', doc.page.margins.left + 4, headerY, { width: 350 });
  doc.text('Amount', doc.page.margins.left + 4, headerY,
    { width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 8, align: 'right' });
  doc.moveDown(0.2);
  doc.fillColor(TEXT_COLOR);

  tableRow('Building Price', fmt(buildingPrice));
  tableRow('Building Erection', fmt(erection));
  tableRow('Foundation', fmt(foundation));
  tableRow('Permits', fmt(permits));

  if (config.salesTaxIncluded) {
    const taxRate = config.salesTaxRate ?? 0;
    const taxAmt = grandTotal * taxRate / (1 + taxRate); // approximate, display only
    tableRow(`Sales Tax (${(taxRate * 100).toFixed(2)}%)`, fmt(taxAmt));
  }

  // Total bar
  doc.rect(doc.page.margins.left, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 20)
    .fill(BRAND_BLUE);
  const totY = doc.y + 5;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
    .text('TOTAL', doc.page.margins.left + 4, totY, { width: 350 });
  doc.text(fmt(grandTotal), doc.page.margins.left + 4, totY,
    { width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 8, align: 'right' });
  doc.moveDown(1.2);
  doc.fillColor(TEXT_COLOR);

  // ── SECTION 10: Observations ─────────────────────────────────────────────
  doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR)
    .text('Observations: Building Design as Per Customer Specifications')
    .moveDown(0.2);
  if (!config.salesTaxIncluded) {
    doc.font('Helvetica').fontSize(8).fillColor(MID_GRAY)
      .text('Sales Tax Not Included')
      .moveDown(0.2);
  }

  // ── SECTION 11: Colors ────────────────────────────────────────────────────
  sectionTitle('Colors');
  const roofColor = row.roof_color || config.roofColor || '—';
  const wallColor = row.wall_color || config.wallColor || '—';
  const trimColor = row.trim_color || config.trimColor || '—';
  doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR)
    .text(`Roof: ${roofColor}`)
    .text(`Walls: ${wallColor}`)
    .text(`Trim: ${trimColor}`)
    .moveDown(0.5);

  // ── SECTION 12: Legal / Commercial Language ───────────────────────────────
  sectionTitle('Terms & Conditions');
  doc.font('Helvetica').fontSize(7).fillColor(MID_GRAY)
    .text(
      'Pricing Validity: This quotation is valid for 30 days from the date issued. ' +
      'All prices are subject to change due to fluctuation in material or component prices.',
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    ).moveDown(0.3)
    .text(
      'Acceptance: Acceptance of this quotation constitutes agreement to the terms herein and ' +
      'authorization to proceed with order processing upon receipt of deposit.',
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    ).moveDown(0.3)
    .text(
      'Payment Terms: 50% deposit with signed contract, 40% on delivery, 10% on completion.',
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    ).moveDown(0.3)
    .text(
      'Exclusions: Concrete/foundation, electrical, plumbing, HVAC, painting, and permits are ' +
      'excluded unless explicitly itemized above.',
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    ).moveDown(0.3)
    .text(
      'Scope: Fabricated metal building package only. Erection ' +
      ((overheads.erection ?? 0) > 0 ? 'is included as itemized above.' : 'is NOT included.'),
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    ).moveDown(0.3)
    .text(
      'Delivery: Estimated delivery is approximately 8–12 weeks from receipt of signed contract, ' +
      'deposit, and approved anchor bolt drawings.',
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    ).moveDown(0.3)
    .text(
      'Warranty: Materials warranted per manufacturer specifications. 1-year workmanship warranty. ' +
      'Paint per manufacturer (typically 25–40 years on Galvalume/SMP).',
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    );

  // ── SECTION 13: Signature Block ───────────────────────────────────────────
  sectionTitle('Authorized Signatures');
  const sigY = doc.y + 20;
  const leftX = doc.page.margins.left;
  const rightX = doc.page.margins.left + 260;
  const sigLineLen = 200;

  // Authorized signature
  doc.moveTo(leftX, sigY).lineTo(leftX + sigLineLen, sigY)
    .strokeColor('#aaaaaa').lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(7).fillColor(MID_GRAY)
    .text('Authorized Signature / Title / Date', leftX, sigY + 3, { width: sigLineLen });

  // Customer acceptance
  doc.moveTo(rightX, sigY).lineTo(rightX + sigLineLen, sigY)
    .strokeColor('#aaaaaa').lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(7).fillColor(MID_GRAY)
    .text('Customer Acceptance / Date', rightX, sigY + 3, { width: sigLineLen });

  doc.end();
}

module.exports = { generateQuotePDF };
