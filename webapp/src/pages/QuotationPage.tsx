import { useRef, useState } from 'react';
import { useBuildingConfig } from '../context';
import { calculateCosts, formatUSD } from '../calculator';
import BuildingElevation from '../components/BuildingElevation';
import InsulationDiagram from '../components/InsulationDiagram';
import type { LeanToDirection } from '../types';

const dirLabels: Record<LeanToDirection, string> = { right: 'Right', left: 'Left', front: 'Front', back: 'Back' };

function YesNo({ value }: { value: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
      {value ? 'YES' : 'NO'}
    </span>
  );
}

export default function QuotationPage() {
  const { config, dispatch } = useBuildingConfig();
  const { dimensions, leanTos, insulation } = config;
  const costs = calculateCosts(config);
  const printRef = useRef<HTMLDivElement>(null);

  const activeQuoteId = localStorage.getItem('active_quote_id');
  const quoteLabel = activeQuoteId ? `Q-${activeQuoteId}` : '—';
  // No revision_number in schema yet — Rev 1 placeholder. See inbox note for Rusty.
  const revLabel = 'Rev 1';

  // Local input string for the percentage field so users can type "8.25" naturally
  // (including a trailing dot). We persist the parsed decimal on every valid edit.
  const [taxRateInput, setTaxRateInput] = useState<string>(
    () => (config.salesTaxRate * 100).toFixed(2).replace(/\.?0+$/, '') || '0'
  );
  const [taxRateError, setTaxRateError] = useState<string | null>(null);

  function handleTaxRateChange(raw: string) {
    setTaxRateInput(raw);
    if (raw.trim() === '') {
      setTaxRateError('Enter a tax rate (0–100)');
      return;
    }
    const pct = Number(raw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setTaxRateError('Tax rate must be between 0 and 100');
      return;
    }
    setTaxRateError(null);
    dispatch({ type: 'SET_SALES_TAX', payload: { rate: pct / 100 } });
  }

  function handleTaxIncludedChange(included: boolean) {
    dispatch({ type: 'SET_SALES_TAX', payload: { included } });
  }

  const activeLeanTos = (Object.keys(leanTos) as LeanToDirection[]).filter((d) => leanTos[d].enabled);

  // Component checks
  const hasComp = (desc: string) => config.components.some((c) => c.description.toLowerCase().includes(desc.toLowerCase()) && c.qty > 0);
  const compQty = (desc: string) => config.components.find((c) => c.description.toLowerCase().includes(desc.toLowerCase()))?.qty ?? 0;

  const addlStructures = config.additionalStructures;

  // Compute which additional-structure items are enabled (from the dedicated form OR legacy fallbacks)
  const addlItems: { label: string; spec: string }[] = [];
  if (addlStructures) {
    if (addlStructures.overhangs.enabled) {
      const dimStr = addlStructures.overhangs.dims ? ` — ${addlStructures.overhangs.dims}` : '';
      addlItems.push({ label: `Overhangs (qty ${addlStructures.overhangs.qty})`, spec: dimStr });
    }
    if (addlStructures.leanTos.enabled) {
      addlItems.push({ label: `Lean-to(s) (qty ${addlStructures.leanTos.qty})`, spec: ` — ${addlStructures.leanTos.width}' W × ${addlStructures.leanTos.length}' L` });
    }
    if (addlStructures.parapets.enabled) {
      addlItems.push({ label: 'Parapet', spec: ` — ${addlStructures.parapets.height} ft high` });
    }
    if (addlStructures.canopies.enabled) {
      addlItems.push({ label: `Canopies (qty ${addlStructures.canopies.qty})`, spec: ` — ${addlStructures.canopies.width}' W × ${addlStructures.canopies.depth}' D × ${addlStructures.canopies.height}' H` });
    }
    if (addlStructures.hssCanopies.enabled) {
      addlItems.push({ label: `HSS Canopies (qty ${addlStructures.hssCanopies.qty})`, spec: '' });
    }
  } else {
    // Legacy fallback: derive from leanTos + components
    activeLeanTos.forEach((d) => {
      addlItems.push({ label: `Lean-to ${dirLabels[d]} (${leanTos[d].width}' × ${leanTos[d].length}')`, spec: '' });
    });
    if (hasComp('canopy')) {
      addlItems.push({ label: 'Canopies as shown on plans', spec: '' });
    }
  }

  // compQty used below for accessories rendering

  function handlePrint() {
    const el = printRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Proposal - ${config.projectName || 'Estimate'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 30px 40px; color: #1a1a1a; font-size: 11px; line-height: 1.5; }
        .page { max-width: 750px; margin: 0 auto; }
        h1 { font-size: 18px; }
        h2 { font-size: 13px; margin-top: 16px; border-bottom: 1px solid #ccc; padding-bottom: 3px; color: #1e3a5f; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { padding: 3px 6px; text-align: left; border-bottom: 1px solid #eee; font-size: 11px; }
        th { background: #f5f5f5; font-weight: 600; }
        .header-bar { background: #1e3a5f; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
        .header-bar h1 { color: white; }
        .quote-badge { margin-top: 8px; font-size: 10px; opacity: 0.9; letter-spacing: 0.03em; }
        .quote-badge strong { font-size: 13px; opacity: 1; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; margin-top: 10px; }
        .label { color: #6b7280; font-size: 10px; text-transform: uppercase; }
        .val { font-weight: 600; }
        .check-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f3f4f6; }
        .yes { color: #15803d; font-weight: 700; }
        .no { color: #9ca3af; }
        .total-box { background: #1e3a5f; color: white; padding: 12px 16px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
        .sig-line { border-top: 1px solid #9ca3af; width: 200px; margin-top: 40px; }
        svg { max-width: 400px; display: block; margin: 8px auto; }
        .metrics-box { border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 14px; margin-top: 10px; background: #f9fafb; }
        .metrics-label { color: #6b7280; font-size: 11px; }
        .metrics-num { font-family: 'Courier New', monospace; font-weight: 600; font-size: 11px; }
        .metrics-row { display: flex; justify-content: space-between; padding: 2px 0; }
        .metrics-title { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px; }
        details.terms-section { border: 1px solid #e5e7eb; border-radius: 4px; margin-top: 16px; overflow: hidden; page-break-inside: avoid; }
        details.terms-section summary { display: none; }
        details.terms-section > :not(summary) { display: block; }
        .legal-body { padding: 10px 14px; font-size: 9px; color: #6b7280; line-height: 1.6; text-align: justify; }
        .legal-body p { margin: 3px 0; }
        .legal-title { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.05em; padding: 6px 14px 4px; border-bottom: 1px solid #f3f4f6; }
        @media print { body { margin: 15px 20px; } details.terms-section summary { display: none; } details.terms-section > :not(summary) { display: block !important; } }
      </style></head><body>`);
    w.document.write(el.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.print();
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotation / Proposal</h1>
        <button onClick={handlePrint}
          className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-900 transition-colors">
          Print / PDF
        </button>
      </div>

      {/* Sales tax controls (not printed) */}
      <div className="mb-4 bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="sales-tax-rate" className="block text-[10px] uppercase text-gray-500 font-medium mb-1">
            Sales Tax Rate (%)
          </label>
          <input
            id="sales-tax-rate"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            value={taxRateInput}
            onChange={(e) => handleTaxRateChange(e.target.value)}
            aria-invalid={taxRateError ? true : undefined}
            aria-describedby={taxRateError ? 'sales-tax-rate-error' : undefined}
            className={`w-28 border rounded px-2 py-1 text-sm ${
              taxRateError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {taxRateError && (
            <p id="sales-tax-rate-error" className="text-xs text-red-600 mt-1">{taxRateError}</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-1">
          <input
            type="checkbox"
            checked={config.salesTaxIncluded}
            onChange={(e) => handleTaxIncludedChange(e.target.checked)}
            className="h-4 w-4"
          />
          Include sales tax in total
        </label>
        <div className="ml-auto text-right pb-1">
          <span className="block text-[10px] uppercase text-gray-500 font-medium">Computed Sales Tax</span>
          <span className="text-sm font-semibold text-gray-800">{formatUSD(costs.salesTax)}</span>
        </div>
      </div>

      <div ref={printRef} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* ---- HEADER BAR ---- */}
        <div className="header-bar bg-[#1e3a5f] text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">VSTEEL GROUP, INC.</h1>
            <p className="text-xs opacity-80">DBA: VMBC METAL BUILDINGS</p>
            <p className="text-xs opacity-80">3233 FRICK RD. HOUSTON, TX. 77086</p>
          </div>
          <div className="text-right text-xs">
            <p>OFFICE: 281-999-8810</p>
            <p>FAX: 281-999-8811</p>
            <div className="quote-badge mt-2 text-right">
              <strong className="block text-sm font-bold font-mono">{quoteLabel}</strong>
              <span className="opacity-80">{revLabel}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {/* ---- CLIENT / JOB INFO ---- */}
          <div className="info-grid grid grid-cols-2 gap-x-8 gap-y-1 text-sm border-b border-gray-200 pb-4 mb-4">
            <div>
              <span className="label text-[10px] uppercase text-gray-400">Proposal Submitted To:</span>
              <p className="val font-semibold">{config.customerName || '---'}</p>
            </div>
            <div>
              <span className="label text-[10px] uppercase text-gray-400">Job Name:</span>
              <p className="val font-semibold">{config.projectName || '---'}</p>
            </div>
            <div>
              <span className="label text-[10px] uppercase text-gray-400">Date:</span>
              <p>{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <span className="label text-[10px] uppercase text-gray-400">Job Location:</span>
              <p>{config.jobLocation || '---'}</p>
            </div>
          </div>

          {/* ---- BUILDING ELEVATION DRAWING ---- */}
          <div className="my-4">
            <BuildingElevation config={config} />
          </div>

          {/* ---- SPECIFICATIONS ---- */}
          <h2 className="font-semibold text-[#1e3a5f] text-sm border-b border-gray-300 pb-1 mt-4 mb-2">
            We hereby submit specifications and estimates for:
          </h2>
          <p className="text-sm font-medium mb-3">
            One Metal Building {dimensions.width}W X {dimensions.length}L X {dimensions.eaveHeight}H{' '}
            {dimensions.roofPitch}:12, Roof Pitch, {config.roofType === 'gable' ? 'Gable' : 'Single'} slope
          </p>

          {/* Additional Structures — Section 5 */}
          <h2 className="font-semibold text-[#1e3a5f] text-sm border-b border-gray-300 pb-1 mt-3 mb-2">
            Additional Structures
          </h2>
          <div className="text-sm space-y-0.5">
            {addlItems.length > 0 ? (
              addlItems.map((item, i) => (
                <div key={i} className="check-row flex justify-between border-b border-gray-100 py-0.5">
                  <span>{item.label}{item.spec}</span>
                  <YesNo value={true} />
                </div>
              ))
            ) : (
              <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
                <span className="text-gray-400 italic">None specified.</span>
                <YesNo value={false} />
              </div>
            )}
          </div>

          {/* Components checklist */}
          <h2 className="font-semibold text-[#1e3a5f] text-sm border-b border-gray-300 pb-1 mt-4 mb-2">
            Components
          </h2>
          <div className="text-sm space-y-0.5">
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Roof Panel (Panel PBR 26Ga Lifetime Galvalume 36" x 1 1/4")</span>
              <YesNo value={hasComp('roof panel') || hasComp('ridge cap')} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Side Wall System (Panel PBR 26Ga Lifetime Color 36" x 1 1/4")</span>
              <YesNo value={hasComp('side wall')} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>End Wall System (Panel PBR 26Ga Lifetime Color 36" x 1 1/4")</span>
              <YesNo value={hasComp('end wall')} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Side Wall Liner System (Panel PBU 26Ga Color 36" x 3/4")</span>
              <YesNo value={hasComp('side liner')} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>End Wall Liner System (Panel PBU 26Ga Color 36" x 3/4")</span>
              <YesNo value={hasComp('end liner')} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>All Trim Standard FL Style, Down Spouts & Gutters Gauge: 26</span>
              <YesNo value={hasComp('gutter') || hasComp('trim') || hasComp('downspout')} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>All Structural Machine Bolts & Component Fasteners</span>
              <YesNo value={hasComp('bolt') || hasComp('fastener')} />
            </div>
          </div>

          {/* Insulation with diagram */}
          <div className="flex items-start gap-4 mt-2">
            <div className="flex-1 text-sm space-y-0.5">
              <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
                <span>Roof Insulation (R10 3")</span>
                <YesNo value={insulation.roof} />
              </div>
              <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
                <span>Side Wall Insulation (R10 3")</span>
                <YesNo value={insulation.wall} />
              </div>
              <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
                <span>End Wall Insulation (R10 3")</span>
                <YesNo value={insulation.additional} />
              </div>
            </div>
            <InsulationDiagram insulation={insulation} />
          </div>

          {/* Accessories (doors/windows) */}
          <h2 className="font-semibold text-[#1e3a5f] text-sm border-b border-gray-300 pb-1 mt-4 mb-2">
            Accessories
          </h2>
          <div className="text-sm space-y-0.5">
            {[
              { label: 'Doors 3070 M w/STD Frame 8 1/4', key: 'doors 3070' },
              { label: 'Doors 4070 M w/STD Frame 8 1/4', key: 'doors 4070' },
              { label: 'Door 6070 M w/STD Frame 8 1/4', key: 'door 6070' },
              { label: 'Dead Bolt', key: 'dead bolt' },
              { label: 'Panic Hardware', key: 'panic' },
              { label: 'Roll Up Door', key: 'roll up' },
              { label: 'Window 3030 Self Flashing', key: 'window 3030' },
              { label: 'Window 4030 Self Flashing', key: 'window 4030' },
              { label: 'Window 6030 Self Flashing', key: 'window 6030' },
              { label: 'Window 6040 Self Flashing', key: 'window 6040' },
            ].map(({ label, key }) => {
              const qty = compQty(key);
              return (
                <div key={key} className="check-row flex justify-between border-b border-gray-100 py-0.5">
                  <span>{qty > 0 ? qty : 0} {label}</span>
                  <YesNo value={qty > 0} />
                </div>
              );
            })}
          </div>

          {/* Building Engineering */}
          <h2 className="font-semibold text-[#1e3a5f] text-sm border-b border-gray-300 pb-1 mt-4 mb-2">
            Building Engineering
          </h2>
          <div className="text-sm space-y-0.5">
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Sealed Engineer and COH Approved Fabricator Stamped Drawings</span>
              <YesNo value={true} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Anchor Bolt, Approval & Erection Drawings</span>
              <YesNo value={true} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Wind Load Design {config.windSpeedMph} MPH, Exposure {config.exposureCategory}</span>
              <YesNo value={true} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Building Erection</span>
              <YesNo value={config.overheads.erection > 0} />
            </div>
          </div>

          {/* ---- ITEMIZED PRICING ---- */}
          <h2 className="font-semibold text-[#1e3a5f] text-sm border-b border-gray-300 pb-1 mt-6 mb-2">
            Itemized Pricing
          </h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 font-medium">Building Price</td>
                <td className="py-1.5 text-right font-semibold">{formatUSD(costs.grandTotal)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 pl-4 text-gray-500">Building Erection</td>
                <td className="py-1.5 text-right">{formatUSD(config.overheads.erection)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 pl-4 text-gray-500">Foundation</td>
                <td className="py-1.5 text-right">{formatUSD(config.overheads.foundation)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 pl-4 text-gray-500">Permits</td>
                <td className="py-1.5 text-right">{formatUSD(config.overheads.permits)}</td>
              </tr>
              {costs.salesTaxIncluded && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 font-medium">
                    Sales Tax ({(costs.salesTaxRate * 100).toFixed(2)}%)
                  </td>
                  <td className="py-1.5 text-right font-semibold">{formatUSD(costs.salesTax)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Grand Total */}
          <div className="total-box bg-[#1e3a5f] text-white px-4 py-3 mt-3 flex justify-between items-center rounded text-lg font-bold">
            <span>Total</span>
            <span>{formatUSD(costs.grandTotal)}</span>
          </div>

          {/* Summary Metrics — Issue #11 */}
          {(costs.mainBuildingArea > 0 || costs.structuralWeight > 0) && (
            <div className="metrics-box mt-4 bg-gray-50 border border-gray-200 rounded p-4">
              <p className="metrics-title text-[10px] uppercase text-gray-400 font-semibold tracking-wide mb-2">Cost Metrics</p>
              {costs.mainBuildingArea > 0 && (
                <div className="metrics-row flex justify-between py-0.5">
                  <span className="metrics-label text-sm text-gray-500">Total Cost / sqft</span>
                  <span className="metrics-num font-mono font-semibold text-sm">{formatUSD(costs.grandTotal / costs.mainBuildingArea)}/sqft</span>
                </div>
              )}
              {costs.structuralWeight > 0 && (
                <div className="metrics-row flex justify-between py-0.5">
                  <span className="metrics-label text-sm text-gray-500">Total Cost / lb steel</span>
                  <span className="metrics-num font-mono font-semibold text-sm">${(costs.grandTotal / costs.structuralWeight).toFixed(2)}/lb</span>
                </div>
              )}
              {costs.structuralWeight > 0 && (
                <div className="metrics-row flex justify-between py-0.5">
                  <span className="metrics-label text-sm text-gray-500">Steel Cost / lb</span>
                  <span className="metrics-num font-mono font-semibold text-sm">${(costs.structuralTotal / costs.structuralWeight).toFixed(2)}/lb</span>
                </div>
              )}
            </div>
          )}

          {/* Observations & Colors */}
          <div className="mt-4 text-sm space-y-1 text-gray-600">
            <p><span className="font-medium text-gray-800">Observations:</span> Building Design as Per Customer Specifications</p>
            {!costs.salesTaxIncluded && (
              <p className="text-gray-500">Sales Tax Not Included</p>
            )}
          </div>

          <div className="mt-3 text-sm space-y-0.5">
            <p><span className="font-medium text-gray-800">Colors:</span></p>
            <p className="pl-4 text-gray-600">Roof: {config.roofColor}</p>
            <p className="pl-4 text-gray-600">Walls: {config.wallColor}</p>
            <p className="pl-4 text-gray-600">Trim: {config.trimColor}</p>
          </div>

          {/* Terms & Conditions — Issue #9 */}
          <details className="terms-section mt-6 border border-gray-200 rounded overflow-hidden" style={{ pageBreakInside: 'avoid' }}>
            <summary className="px-4 py-2 bg-gray-50 text-[10px] font-semibold uppercase text-gray-500 cursor-pointer select-none tracking-wide hover:bg-gray-100 list-none flex items-center justify-between">
              <span>Terms &amp; Conditions</span>
              <span className="text-gray-400 text-xs print:hidden">▼</span>
            </summary>
            <div className="legal-body px-4 py-3 text-[10px] text-gray-500 space-y-1.5 leading-relaxed text-justify">
              <p><strong>Pricing Validity:</strong> This quotation is valid for 30 days from the date issued.</p>
              <p><strong>Acceptance:</strong> Acceptance of this quotation constitutes agreement to the terms herein and authorization to proceed with order processing upon receipt of deposit.</p>
              <p><strong>Deposit:</strong> A 30% non-refundable deposit is required to release the order to engineering and production. Balance due net 30 from delivery.</p>
              <p><strong>Scope:</strong> Quotation covers materials and engineering as specified. Site preparation, foundation, erection labor, permits, taxes, freight (unless itemized), and any work not explicitly described are excluded.</p>
              <p><strong>Changes:</strong> Change orders after engineering release will incur an engineering fee plus material cost differential.</p>
              <p><strong>Delivery:</strong> Delivery estimates are approximate and subject to mill availability. Force majeure clauses apply.</p>
              <p><strong>Warranty:</strong> Materials are warranted per manufacturer specifications. Standard structural warranty: 1 year on workmanship; paint per manufacturer (typically 25–40 years on Galvalume/SMP).</p>
              <p><strong>Title &amp; Risk:</strong> Title and risk of loss transfer to Buyer upon delivery to job site or carrier.</p>
              <p><strong>Governing Law:</strong> This agreement is governed by the laws of the state in which the project is located.</p>
            </div>
          </details>

          {/* Footer / signatures */}
          <div className="mt-8 text-xs text-gray-400 border-t border-gray-200 pt-4">
            <p>All prices are subject to change due to fluctuation in material or component price.</p>
            <div className="mt-6 flex gap-16">
              <div>
                <div className="sig-line border-t border-gray-400 w-48 mb-1"></div>
                <p className="text-gray-500">Authorized Signature</p>
              </div>
              <div>
                <div className="sig-line border-t border-gray-400 w-48 mb-1"></div>
                <p className="text-gray-500">Customer Acceptance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
