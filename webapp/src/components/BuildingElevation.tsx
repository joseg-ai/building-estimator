import type { BuildingConfig, LeanToDirection } from '../types';

interface Props {
  config: BuildingConfig;
}

const LEAN_TO_DIRS: LeanToDirection[] = ['right', 'left', 'front', 'back'];

/** SVG front elevation drawing of the building for the quotation */
export default function BuildingElevation({ config }: Props) {
  const { dimensions, roofType, leanTos } = config;
  const { width, eaveHeight, roofPitch } = dimensions;

  if (width <= 0 || eaveHeight <= 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded">
        Enter building dimensions to see the elevation drawing.
      </div>
    );
  }

  // SVG dimensions
  const svgW = 520;
  const svgH = 300;
  const pad = 50;
  const groundY = svgH - 40;

  // Scale: fit building into the drawing area
  const peakRise = roofType === 'gable' ? (width / 2) * (roofPitch / 12) : width * (roofPitch / 12);
  const totalHeight = eaveHeight + peakRise;
  const scaleX = (svgW - pad * 2) / (width * 1.4); // extra room for lean-tos
  const scaleY = (groundY - pad) / (totalHeight * 1.15);
  const scale = Math.min(scaleX, scaleY);

  const bldgW = width * scale;
  const bldgH = eaveHeight * scale;
  const peakH = peakRise * scale;

  // Center the building
  const startX = (svgW - bldgW) / 2;
  const eaveY = groundY - bldgH;
  const peakY = eaveY - peakH;

  // Main building outline
  let roofPath: string;
  if (roofType === 'gable') {
    const midX = startX + bldgW / 2;
    roofPath = `M ${startX} ${eaveY} L ${midX} ${peakY} L ${startX + bldgW} ${eaveY}`;
  } else {
    // Single slope: high side left, low side right
    roofPath = `M ${startX} ${peakY} L ${startX + bldgW} ${eaveY}`;
  }

  const wallPath = `M ${startX} ${groundY} L ${startX} ${eaveY} M ${startX + bldgW} ${eaveY} L ${startX + bldgW} ${groundY}`;

  // Lean-to shapes (simplified side view)
  const activeLeanTos = LEAN_TO_DIRS.filter((d) => leanTos[d].enabled);
  const ltElements: React.ReactNode[] = [];
  for (const dir of activeLeanTos) {
    const lt = leanTos[dir];
    const ltW = lt.width * scale;
    const ltH = bldgH * 0.6; // lean-to is shorter
    const ltTopY = groundY - ltH;

    if (dir === 'right') {
      const x = startX + bldgW;
      ltElements.push(
        <g key={dir}>
          <rect x={x} y={ltTopY} width={ltW} height={ltH}
            fill="#10b981" fillOpacity={0.1} stroke="#10b981" strokeWidth={1} strokeDasharray="4 2" />
          <line x1={x} y1={eaveY} x2={x + ltW} y2={ltTopY} stroke="#10b981" strokeWidth={1} strokeDasharray="4 2" />
          <text x={x + ltW / 2} y={groundY + 14} textAnchor="middle" className="text-[9px] fill-emerald-600">
            LT-R {lt.width}'
          </text>
        </g>
      );
    } else if (dir === 'left') {
      const x = startX - ltW;
      ltElements.push(
        <g key={dir}>
          <rect x={x} y={ltTopY} width={ltW} height={ltH}
            fill="#10b981" fillOpacity={0.1} stroke="#10b981" strokeWidth={1} strokeDasharray="4 2" />
          <line x1={x} y1={ltTopY} x2={startX} y2={eaveY} stroke="#10b981" strokeWidth={1} strokeDasharray="4 2" />
          <text x={x + ltW / 2} y={groundY + 14} textAnchor="middle" className="text-[9px] fill-emerald-600">
            LT-L {lt.width}'
          </text>
        </g>
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-xl" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Ground line */}
      <line x1={pad / 2} y1={groundY} x2={svgW - pad / 2} y2={groundY} stroke="#9ca3af" strokeWidth={1.5} />

      {/* Main building walls */}
      <path d={wallPath} fill="none" stroke="#1e3a5f" strokeWidth={2} />

      {/* Roof */}
      <path d={roofPath} fill="none" stroke="#1e3a5f" strokeWidth={2.5} />

      {/* Fill walls */}
      {roofType === 'gable' ? (
        <polygon
          points={`${startX},${groundY} ${startX},${eaveY} ${startX + bldgW / 2},${peakY} ${startX + bldgW},${eaveY} ${startX + bldgW},${groundY}`}
          fill="#dbeafe" fillOpacity={0.4} stroke="none"
        />
      ) : (
        <polygon
          points={`${startX},${groundY} ${startX},${peakY} ${startX + bldgW},${eaveY} ${startX + bldgW},${groundY}`}
          fill="#dbeafe" fillOpacity={0.4} stroke="none"
        />
      )}

      {/* Lean-tos */}
      {ltElements}

      {/* Dimension: width */}
      <line x1={startX} y1={groundY + 22} x2={startX + bldgW} y2={groundY + 22} stroke="#374151" strokeWidth={0.75} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={startX + bldgW / 2} y={groundY + 34} textAnchor="middle" className="text-[10px] fill-gray-700 font-semibold">
        {width}' Width
      </text>

      {/* Dimension: eave height */}
      <line x1={startX - 14} y1={groundY} x2={startX - 14} y2={eaveY} stroke="#374151" strokeWidth={0.75} />
      <text x={startX - 18} y={eaveY + bldgH / 2 + 3} textAnchor="end" className="text-[9px] fill-gray-700">
        {eaveHeight}' Eave
      </text>

      {/* Dimension: peak height */}
      {peakH > 5 && (
        <>
          <line x1={startX - 14} y1={eaveY} x2={startX - 14} y2={peakY} stroke="#6b7280" strokeWidth={0.5} strokeDasharray="2 2" />
          <text x={startX - 18} y={peakY + peakH / 2 + 3} textAnchor="end" className="text-[8px] fill-gray-500">
            {(eaveHeight + peakRise).toFixed(1)}' Peak
          </text>
        </>
      )}

      {/* Pitch label */}
      {roofType === 'gable' ? (
        <text x={startX + bldgW / 2} y={peakY - 8} textAnchor="middle" className="text-[9px] fill-gray-600">
          {roofPitch}:12 Pitch
        </text>
      ) : (
        <text x={startX + bldgW / 2} y={peakY - 8} textAnchor="middle" className="text-[9px] fill-gray-600">
          {roofPitch}:12 Single Slope
        </text>
      )}

      {/* Roof type label */}
      <text x={startX + bldgW / 2} y={eaveY + bldgH / 2} textAnchor="middle" className="text-[11px] fill-blue-800 font-semibold">
        {config.projectName || 'PEMB'}
      </text>

      {/* Arrow marker definition */}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 Z" fill="#374151" />
        </marker>
      </defs>
    </svg>
  );
}
