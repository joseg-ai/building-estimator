import type { InsulationConfig } from '../types';

interface Props {
  insulation: InsulationConfig;
}

/** Small SVG showing insulation coverage on a building cross-section */
export default function InsulationDiagram({ insulation }: Props) {
  const { roof, wall } = insulation;

  return (
    <svg viewBox="0 0 120 90" className="w-20 h-14" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Building outline */}
      <polygon points="10,80 10,40 60,15 110,40 110,80" fill="#f0f4ff" stroke="#64748b" strokeWidth={1.5} />

      {/* Roof insulation */}
      {roof && (
        <>
          <line x1={14} y1={41} x2={58} y2={18} stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
          <line x1={62} y1={18} x2={106} y2={41} stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
        </>
      )}

      {/* Wall insulation */}
      {wall && (
        <>
          <line x1={13} y1={44} x2={13} y2={77} stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
          <line x1={107} y1={44} x2={107} y2={77} stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
        </>
      )}

      {/* Label */}
      <text x={60} y={88} textAnchor="middle" className="text-[7px] fill-gray-500">
        {!roof && !wall ? 'None' : [roof && 'Roof', wall && 'Wall'].filter(Boolean).join('+')}
      </text>
    </svg>
  );
}
