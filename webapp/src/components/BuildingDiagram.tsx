import { useBuildingConfig } from '../context';
import type { LeanToDirection } from '../types';

/** SVG diagram showing the building footprint from above with active lean-tos */
export default function BuildingDiagram() {
  const { config } = useBuildingConfig();
  const { dimensions, leanTos } = config;

  // SVG viewport
  const svgW = 500;
  const svgH = 400;

  // Main building rect (centered)
  const mainW = 200;
  const mainH = 140;
  const mainX = (svgW - mainW) / 2;
  const mainY = (svgH - mainH) / 2;

  // Lean-to thickness
  const ltDepth = 40;

  const leanToRects: Record<LeanToDirection, { x: number; y: number; w: number; h: number }> = {
    right: { x: mainX + mainW, y: mainY, w: ltDepth, h: mainH },
    left:  { x: mainX - ltDepth, y: mainY, w: ltDepth, h: mainH },
    front: { x: mainX, y: mainY - ltDepth, w: mainW, h: ltDepth },
    back:  { x: mainX, y: mainY + mainH, w: mainW, h: ltDepth },
  };

  const dirLabel: Record<LeanToDirection, string> = {
    right: 'R', left: 'L', front: 'F', back: 'B',
  };

  const hasAnyDims = dimensions.width > 0 || dimensions.length > 0;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-lg border border-gray-300 rounded bg-white">
      {/* Main building */}
      <rect
        x={mainX} y={mainY} width={mainW} height={mainH}
        fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={2}
      />
      <text x={mainX + mainW / 2} y={mainY + mainH / 2} textAnchor="middle" dominantBaseline="central"
            className="text-sm font-semibold fill-blue-700">
        {hasAnyDims ? `${dimensions.width}' x ${dimensions.length}'` : 'Main Building'}
      </text>

      {/* Dimension labels */}
      {hasAnyDims && (
        <>
          {/* Width label (top) */}
          <text x={mainX + mainW / 2} y={mainY - ltDepth - 10} textAnchor="middle"
                className="text-xs fill-gray-500">
            Width: {dimensions.width} ft
          </text>
          {/* Length label (right) */}
          <text x={mainX + mainW + ltDepth + 10} y={mainY + mainH / 2}
                textAnchor="start" dominantBaseline="central"
                className="text-xs fill-gray-500">
            Length: {dimensions.length} ft
          </text>
        </>
      )}

      {/* Lean-tos */}
      {(Object.keys(leanTos) as LeanToDirection[]).map((dir) => {
        const lt = leanTos[dir];
        if (!lt.enabled) return null;
        const r = leanToRects[dir];
        return (
          <g key={dir}>
            <rect
              x={r.x} y={r.y} width={r.w} height={r.h}
              fill="#10b981" fillOpacity={0.2} stroke="#10b981" strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <text
              x={r.x + r.w / 2} y={r.y + r.h / 2}
              textAnchor="middle" dominantBaseline="central"
              className="text-xs font-medium fill-emerald-700"
            >
              {dirLabel[dir]} {lt.width > 0 && lt.length > 0 ? `${lt.width}'x${lt.length}'` : ''}
            </text>
          </g>
        );
      })}

      {/* Compass */}
      <text x={svgW - 20} y={20} textAnchor="middle" className="text-xs fill-gray-400">N</text>
      <line x1={svgW - 20} y1={24} x2={svgW - 20} y2={40} stroke="#9ca3af" strokeWidth={1} markerEnd="" />
    </svg>
  );
}
