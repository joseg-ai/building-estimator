import { useBuildingConfig } from '../context';
import type { LeanToDirection } from '../types';
import LeanToCard from '../components/LeanToCard';
import BuildingDiagram from '../components/BuildingDiagram';

const directions: LeanToDirection[] = ['right', 'left', 'front', 'back'];

export default function DesignPage() {
  const { config, dispatch } = useBuildingConfig();
  const { dimensions, insulation } = config;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Design Configuration</h1>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="text-sm text-red-600 hover:text-red-800 border border-red-200 rounded px-3 py-1"
        >
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: inputs */}
        <div className="space-y-6">
          {/* Project Name */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="font-semibold text-gray-800 mb-3">Project</h2>
            <div className="space-y-2">
              <input type="text" placeholder="Project name" value={config.projectName}
                onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <input type="text" placeholder="Customer name" value={config.customerName}
                onChange={(e) => dispatch({ type: 'SET_CUSTOMER_NAME', payload: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <input type="text" placeholder="Job location" value={config.jobLocation}
                onChange={(e) => dispatch({ type: 'SET_JOB_LOCATION', payload: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </section>

          {/* Dimensions */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="font-semibold text-gray-800 mb-3">Building Dimensions</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Width (ft)</label>
                <input type="number" min={0} step={1}
                  value={dimensions.width || ''}
                  onChange={(e) => dispatch({ type: 'SET_DIMENSIONS', payload: { width: Number(e.target.value) } })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Length (ft)</label>
                <input type="number" min={0} step={1}
                  value={dimensions.length || ''}
                  onChange={(e) => dispatch({ type: 'SET_DIMENSIONS', payload: { length: Number(e.target.value) } })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Eave Height (ft)</label>
                <input type="number" min={0} step={1}
                  value={dimensions.eaveHeight || ''}
                  onChange={(e) => dispatch({ type: 'SET_DIMENSIONS', payload: { eaveHeight: Number(e.target.value) } })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Roof Pitch (x:12)</label>
                <input type="number" min={0} step={0.5}
                  value={dimensions.roofPitch || ''}
                  onChange={(e) => dispatch({ type: 'SET_DIMENSIONS', payload: { roofPitch: Number(e.target.value) } })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bay Spacing (ft)</label>
                <input type="number" min={0} step={1}
                  value={dimensions.baySpacing || ''}
                  onChange={(e) => dispatch({ type: 'SET_DIMENSIONS', payload: { baySpacing: Number(e.target.value) } })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Floor area: <span className="font-semibold text-gray-700">{dimensions.width * dimensions.length} sq ft</span>
              {dimensions.baySpacing > 0 && dimensions.length > 0 && (
                <span className="ml-3">Bays: {Math.round(dimensions.length / dimensions.baySpacing)}</span>
              )}
            </div>
          </section>

          {/* Roof Type */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="font-semibold text-gray-800 mb-3">Roof Type</h2>
            <div className="flex gap-4">
              {(['gable', 'single-slope'] as const).map((rt) => (
                <label key={rt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio" name="roofType"
                    checked={config.roofType === rt}
                    onChange={() => dispatch({ type: 'SET_ROOF_TYPE', payload: rt })}
                    className="accent-blue-600"
                  />
                  <span className="text-sm capitalize">{rt.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Lean-tos */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-3">Lean-To Extensions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {directions.map((d) => (
                <LeanToCard key={d} direction={d} />
              ))}
            </div>
          </section>

          {/* Insulation */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="font-semibold text-gray-800 mb-3">Insulation</h2>
            <div className="space-y-2">
              {([
                { key: 'roof' as const, label: 'Roof Insulation' },
                { key: 'wall' as const, label: 'Wall Insulation' },
                { key: 'additional' as const, label: 'Additional Insulation' },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insulation[key]}
                    onChange={(e) => dispatch({ type: 'SET_INSULATION', payload: { [key]: e.target.checked } })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Status:{' '}
              <span className="font-semibold text-gray-700">
                {!insulation.roof && !insulation.wall && !insulation.additional
                  ? 'No insulation'
                  : [
                      insulation.roof && 'Roof',
                      insulation.wall && 'Wall',
                      insulation.additional && 'Additional',
                    ].filter(Boolean).join(' + ')}
              </span>
            </div>
          </section>
        </div>

        {/* Right column: diagram */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Building Preview (Top View)</h2>
          <BuildingDiagram />
          <div className="text-xs text-gray-400">
            Blue = main building. Green dashed = lean-to extensions. Dimensions update in real time.
          </div>
        </div>
      </div>
    </div>
  );
}
