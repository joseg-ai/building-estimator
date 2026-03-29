import { useBuildingConfig } from '../context';
import ComponentTable from '../components/ComponentTable';
import { insulationCatalog } from '../catalog';

export default function InsulationPage() {
  const { config } = useBuildingConfig();
  const { insulation } = config;

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
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <p className="text-sm text-gray-500 mb-4">
          Insulation materials: R10 3" rolls. Enter linear feet to cover.
        </p>
        <ComponentTable category="insulation" catalog={insulationCatalog} title="Insulation Materials" />
      </div>
    </div>
  );
}
