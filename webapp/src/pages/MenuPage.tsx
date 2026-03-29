import { Link } from 'react-router-dom';
import { useBuildingConfig } from '../context';

const sections = [
  { to: '/design', label: 'Design', description: 'Building dimensions, lean-tos, insulation, customer info', icon: '📐' },
  { to: '/pricelist', label: 'Price List', description: 'Centralized supplier pricing for all materials', icon: '📋' },
  { to: '/framing', label: 'Main Framing', description: 'Frames, columns, rafters, canopies, plates', icon: '🏗️' },
  { to: '/components', label: 'Components', description: 'Purlins, girts, sheeting, trim, doors, hardware', icon: '🔩' },
  { to: '/insulation', label: 'Insulation', description: 'Roof, wall, and end wall insulation', icon: '🧱' },
  { to: '/fasteners', label: 'Fasteners & Bolts', description: 'Anchor bolts, bracing, fasteners', icon: '⚙️' },
  { to: '/structural', label: 'Stairs & Structural', description: 'Stairs, landings, guard rails, columns', icon: '🪜' },
  { to: '/summary', label: 'Summary', description: 'Cost and weight breakdown', icon: '📊' },
  { to: '/quotation', label: 'Quotation', description: 'Printable quotation document', icon: '💰' },
];

export default function MenuPage() {
  const { config } = useBuildingConfig();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Building Estimator</h1>
        <p className="text-gray-500 mt-1">Pre-Engineered Metal Building (PEMB) estimation tool</p>
        {config.projectName && (
          <p className="mt-2 text-sm text-blue-600 font-medium">Project: {config.projectName}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="block border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all bg-white"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <h2 className="font-semibold text-gray-900">{s.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
