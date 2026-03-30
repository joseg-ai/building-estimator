import { useRef } from 'react';
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
  const { config } = useBuildingConfig();
  const { dimensions, leanTos, insulation } = config;
  const costs = calculateCosts(config);
  const printRef = useRef<HTMLDivElement>(null);

  const activeLeanTos = (Object.keys(leanTos) as LeanToDirection[]).filter((d) => leanTos[d].enabled);

  // Component checks
  const hasComp = (desc: string) => config.components.some((c) => c.description.toLowerCase().includes(desc.toLowerCase()) && c.qty > 0);
  const compQty = (desc: string) => config.components.find((c) => c.description.toLowerCase().includes(desc.toLowerCase()))?.qty ?? 0;

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
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; margin-top: 10px; }
        .label { color: #6b7280; font-size: 10px; text-transform: uppercase; }
        .val { font-weight: 600; }
        .check-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f3f4f6; }
        .yes { color: #15803d; font-weight: 700; }
        .no { color: #9ca3af; }
        .total-box { background: #1e3a5f; color: white; padding: 12px 16px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
        .sig-line { border-top: 1px solid #9ca3af; width: 200px; margin-top: 40px; }
        svg { max-width: 400px; display: block; margin: 8px auto; }
        @media print { body { margin: 15px 20px; } }
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

          {/* Additional Structures */}
          <h2 className="font-semibold text-[#1e3a5f] text-sm border-b border-gray-300 pb-1 mt-3 mb-2">
            Additional Structures
          </h2>
          <div className="text-sm space-y-0.5">
            {activeLeanTos.length > 0 ? (
              activeLeanTos.map((d) => (
                <div key={d} className="check-row flex justify-between border-b border-gray-100 py-0.5">
                  <span>Lean-to {dirLabels[d]} ({leanTos[d].width}' x {leanTos[d].length}')</span>
                  <YesNo value={true} />
                </div>
              ))
            ) : (
              <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
                <span>0 Lean-to as shown on plans</span>
                <YesNo value={false} />
              </div>
            )}
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Overhangs as shown on plans</span>
              <YesNo value={false} />
            </div>
            <div className="check-row flex justify-between border-b border-gray-100 py-0.5">
              <span>Canopies as shown on plans</span>
              <YesNo value={hasComp('canopy')} />
            </div>
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
              <span>Wind Load Design 140 MPH</span>
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
            </tbody>
          </table>

          {/* Grand Total */}
          <div className="total-box bg-[#1e3a5f] text-white px-4 py-3 mt-3 flex justify-between items-center rounded text-lg font-bold">
            <span>Total</span>
            <span>{formatUSD(costs.grandTotal)}</span>
          </div>

          {/* Observations & Colors */}
          <div className="mt-4 text-sm space-y-1 text-gray-600">
            <p><span className="font-medium text-gray-800">Observations:</span> Building Design as Per Customer Specifications</p>
            <p className="text-gray-500">Sales Tax Not Included</p>
          </div>

          <div className="mt-3 text-sm space-y-0.5">
            <p><span className="font-medium text-gray-800">Colors:</span></p>
            <p className="pl-4 text-gray-600">Roof: Galvalume</p>
            <p className="pl-4 text-gray-600">Walls: Color by Customer</p>
            <p className="pl-4 text-gray-600">Trim: Color by Customer</p>
          </div>

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
