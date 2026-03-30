import { useBuildingConfig } from '../context';
import type { LeanToDirection } from '../types';
import { calculateCosts, formatUSD } from '../calculator';

const dirLabels: Record<LeanToDirection, string> = {
  right: 'Right', left: 'Left', front: 'Front', back: 'Back',
};

function CostRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const cls = bold ? 'font-semibold' : 'text-gray-600';
  return (
    <tr className="border-b border-gray-100">
      <td className={`py-1.5 ${cls}`}>{label}</td>
      <td className={`py-1.5 text-right ${bold ? 'font-semibold' : ''}`}>{formatUSD(value)}</td>
    </tr>
  );
}

export default function SummaryPage() {
  const { config, dispatch } = useBuildingConfig();
  const { dimensions, leanTos, overheads } = config;
  const costs = calculateCosts(config);
  const activeLeanTos = (Object.keys(leanTos) as LeanToDirection[]).filter((d) => leanTos[d].enabled);

  function setOverhead(key: string, value: number) {
    dispatch({ type: 'SET_OVERHEADS', payload: { [key]: value } });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Cost & Weight Summary</h1>
      <p className="text-sm text-gray-500 mb-6">Mirrors the Summary sheet from the workbook.</p>

      {/* Building specs */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Building Specs</h2>
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          <div><dt className="text-gray-500">Width</dt><dd className="font-medium">{dimensions.width} ft</dd></div>
          <div><dt className="text-gray-500">Length</dt><dd className="font-medium">{dimensions.length} ft</dd></div>
          <div><dt className="text-gray-500">Height</dt><dd className="font-medium">{dimensions.eaveHeight} ft</dd></div>
          <div><dt className="text-gray-500">Pitch</dt><dd className="font-medium">{dimensions.roofPitch}:12</dd></div>
          <div><dt className="text-gray-500">Floor Area</dt><dd className="font-medium">{costs.mainBuildingArea.toLocaleString()} sqft</dd></div>
          <div><dt className="text-gray-500">Roof Area</dt><dd className="font-medium">{Math.round(costs.roofArea).toLocaleString()} sqft</dd></div>
        </dl>
        {activeLeanTos.length > 0 && (
          <div className="mt-3 text-sm">
            {activeLeanTos.map((d) => (
              <span key={d} className="mr-4">Lean-to {dirLabels[d]}: {costs.leanToAreas[d].toLocaleString()} sqft</span>
            ))}
          </div>
        )}
      </section>

      {/* Structural Steel */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-2">Structural Steel</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200"><th className="text-left py-1.5 text-gray-500">Item</th><th className="text-right py-1.5 text-gray-500">Cost</th></tr></thead>
          <tbody>
            <CostRow label="Beams" value={costs.beamsCost} />
            <CostRow label="Canopies & Parapets" value={costs.canopyCost} />
            <CostRow label="Overhangs" value={costs.overhangCost} />
            <CostRow label="Lean-to" value={costs.leanToCost} />
            <CostRow label="Plates" value={costs.platesCost} />
            <CostRow label="Frames" value={costs.framesCost} />
            <CostRow label="Total Structural" value={costs.structuralTotal} bold />
          </tbody>
        </table>
      </section>

      {/* Components */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-2">Components</h2>
        <table className="w-full text-sm">
          <tbody>
            <CostRow label="Purlins & Girts" value={costs.purlinsGirtsCost} />
            <CostRow label="Angles" value={costs.anglesCost} />
            <CostRow label="Roof & Wall Sheeting" value={costs.sheetingCost} />
            <CostRow label="Wall & Roof Trim" value={costs.roofWallTrimCost} />
            <CostRow label="Doors & Windows" value={costs.doorsWindowsCost} />
            <CostRow label="Standard Hardware" value={costs.hardwareCost} />
            <CostRow label="Total Components" value={costs.componentsTotal} bold />
          </tbody>
        </table>
      </section>

      {/* Insulation + Fasteners */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <table className="w-full text-sm">
          <tbody>
            <CostRow label="Insulation" value={costs.insulationTotal} />
            <CostRow label="Anchor Bolts" value={costs.anchorBoltsCost} />
            <CostRow label="Bolts" value={costs.boltsCost} />
            <CostRow label="Cable Bracing" value={costs.bracingCost} />
            <CostRow label="Fasteners" value={costs.fastenersCost} />
            <CostRow label="Total Fasteners & Bolts" value={costs.fastenersTotal} bold />
          </tbody>
        </table>
      </section>

      {/* Editable Overheads */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Overhead & Cost Parameters</h2>
        <p className="text-xs text-gray-400 mb-3">Edit these values to adjust the final pricing. Changes update the totals below in real time.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          {([
            { key: 'laborRate', label: 'Labor Rate ($/lb)', step: 0.01 },
            { key: 'detailing', label: 'Detailing ($)', step: 100 },
            { key: 'engineering', label: 'Engineering ($)', step: 100 },
            { key: 'loadingHauling', label: 'Loading & Hauling ($)', step: 100 },
            { key: 'freight', label: 'Freight ($)', step: 100 },
            { key: 'erection', label: 'Building Erection ($)', step: 100 },
            { key: 'foundation', label: 'Foundation ($)', step: 100 },
            { key: 'permits', label: 'Permits ($)', step: 100 },
            { key: 'overheadRate', label: 'Overhead Rate (%)', step: 0.01, isPercent: true },
            { key: 'profitRate', label: 'Profit Rate (%)', step: 0.01, isPercent: true },
            { key: 'commissionRate', label: 'Sales Commission (%)', step: 0.01, isPercent: true },
          ] as { key: keyof typeof overheads; label: string; step: number; isPercent?: boolean }[]).map(({ key, label, step, isPercent }) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                type="number" min={0} step={step}
                value={isPercent ? (overheads[key] * 100) : overheads[key]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setOverhead(key, isPercent ? v / 100 : v);
                }}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Grand Total section */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-semibold text-gray-800 mb-2">Grand Total</h2>
        <table className="w-full text-sm">
          <tbody>
            <CostRow label="Direct Materials" value={costs.directMaterials} bold />
            <CostRow label={`Labor (${overheads.laborRate} $/lb)`} value={costs.labor} />
            <CostRow label="Total (Materials + Labor)" value={costs.totalMaterialsLabor} bold />
            <CostRow label="Detailing" value={costs.detailing} />
            <CostRow label="Engineering" value={costs.engineering} />
            <CostRow label="Loading & Hauling" value={costs.loadingHauling} />
            <CostRow label="Freight" value={costs.freight} />
            <CostRow label={`Overhead (${(overheads.overheadRate * 100).toFixed(1)}%)`} value={costs.overheadCost} />
            <CostRow label="Building Erection" value={costs.erection} />
            <CostRow label="Foundation" value={costs.foundation} />
            <CostRow label="Permits" value={costs.permits} />
            <CostRow label="Sub Total" value={costs.subTotal} bold />
            <CostRow label={`Profit (${(overheads.profitRate * 100).toFixed(0)}%)`} value={costs.profit} />
            <CostRow label={`Sales Commission (${(overheads.commissionRate * 100).toFixed(0)}%)`} value={costs.commission} />
          </tbody>
        </table>
        <div className="mt-3 pt-3 border-t-2 border-gray-800 flex justify-between text-lg font-bold">
          <span>Grand Total</span>
          <span className="text-blue-700">{formatUSD(costs.grandTotal)}</span>
        </div>
      </section>
    </div>
  );
}
