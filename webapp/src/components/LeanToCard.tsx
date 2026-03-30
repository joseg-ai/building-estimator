import { useBuildingConfig } from '../context';
import type { LeanToDirection } from '../types';

interface Props {
  direction: LeanToDirection;
}

const labels: Record<LeanToDirection, string> = {
  right: 'Lean-To Right',
  left: 'Lean-To Left',
  front: 'Lean-To Front',
  back: 'Lean-To Back',
};

export default function LeanToCard({ direction }: Props) {
  const { config, dispatch } = useBuildingConfig();
  const lt = config.leanTos[direction];

  return (
    <div className={`border rounded-lg p-4 transition-colors ${lt.enabled ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      <label className="flex items-center gap-2 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={lt.enabled}
          onChange={(e) =>
            dispatch({ type: 'SET_LEANTO', payload: { direction, data: { enabled: e.target.checked } } })
          }
          className="w-4 h-4 accent-emerald-600"
        />
        <span className="font-medium text-sm">{labels[direction]}</span>
      </label>

      {lt.enabled && (
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'length' as const, label: 'Length (ft)' },
            { key: 'width' as const, label: 'Width (ft)' },
            { key: 'pitch' as const, label: 'Pitch (x:12)' },
            { key: 'drop' as const, label: 'Drop (ft)' },
          ]).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
              <input type="number" min={0} step={key === 'pitch' ? 0.5 : 1}
                value={lt[key] || ''}
                onChange={(e) =>
                  dispatch({ type: 'SET_LEANTO', payload: { direction, data: { [key]: Number(e.target.value) } } })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">High Side</label>
            <div className="text-sm font-medium text-gray-700 py-1">{lt.highSide || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Low Side</label>
            <div className="text-sm font-medium text-gray-700 py-1">{lt.lowSide || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Rafter Length</label>
            <div className="text-sm font-medium text-gray-700 py-1">{lt.rafterLength || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Purlins</label>
            <input type="number" min={0} step={1}
              value={lt.purlins || ''}
              onChange={(e) =>
                dispatch({ type: 'SET_LEANTO', payload: { direction, data: { purlins: Number(e.target.value) } } })
              }
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
          </div>
          <div className="col-span-2 text-xs text-gray-500">
            Area: <span className="font-semibold text-gray-700">{lt.length * lt.width} sq ft</span>
          </div>
        </div>
      )}
    </div>
  );
}
