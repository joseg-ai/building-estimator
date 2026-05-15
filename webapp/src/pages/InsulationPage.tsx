import { useBuildingConfig } from '../context';
import ComponentTable from '../components/ComponentTable';
import { insulationCatalog } from '../catalog';
import { R_VALUE_OPTIONS, rValuePriceTable } from '../priceList';
import type { RValue } from '../priceList';

export default function InsulationPage() {
  const { config, dispatch } = useBuildingConfig();
  const { insulation } = config;

  const rValue = insulation.rValue ?? 'R-13';
  const rEntry = rValuePriceTable.find((r) => r.rValue === rValue);

  const status = !insulation.roof && !insulation.wall && !insulation.additional
    ? 'No insulation selected'
    : [
        insulation.roof && 'Roof',
        insulation.wall && 'Wall',
        insulation.additional && 'Additional',
      ].filter(Boolean).join(' + ');

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Insulation</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Design Selection</h2>
        <p className="text-sm text-gray-600">
          Status: <span className="font-semibold">{status}</span>
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {([
            { key: 'roof' as const, label: 'Roof' },
            { key: 'wall' as const, label: 'Wall' },
            { key: 'additional' as const, label: 'Additional' },
          ]).map(({ key, label }) => (
            <div key={key} className={`text-center py-2 rounded text-sm font-medium ${
              insulation[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>
              {label}: {insulation[key] ? 'Yes' : 'No'}
            </div>
          ))}
        </div>

        {/* R-value selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">R-Value</label>
          <div className="flex flex-wrap gap-2">
            {R_VALUE_OPTIONS.map((rv) => {
              const entry = rValuePriceTable.find((r) => r.rValue === rv);
              return (
                <button
                  key={rv}
                  onClick={() => dispatch({ type: 'SET_INSULATION', payload: { rValue: rv as RValue } })}
                  className={`px-3 py-1.5 rounded border text-sm font-medium transition-colors ${
                    rValue === rv
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {rv}
                  {entry && (
                    <span className="ml-1 text-xs opacity-75">
                      ({entry.thicknessIn}" · ${entry.pricePerSqft.toFixed(2)}/sqft)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {rEntry && (
            <p className="mt-1.5 text-xs text-gray-500">
              {rValue} · {rEntry.thicknessIn}" faced fiberglass blanket · ${rEntry.pricePerSqft.toFixed(2)}/sqft
              {' '}— cost is auto-calculated from building geometry unless overridden below.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <p className="text-sm text-gray-500 mb-4">
          Manual override: enter linear feet to force a specific quantity. Leave at 0 to use
          the auto-calculated area (roof = slope-adjusted surface; wall = perimeter × height
          minus openings).
        </p>
        <ComponentTable category="insulation" catalog={insulationCatalog} title="Insulation Materials (Manual Override)" />
      </div>
    </div>
  );
}
