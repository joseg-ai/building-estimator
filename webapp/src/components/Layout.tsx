import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Menu' },
  { to: '/design', label: 'Design' },
  { to: '/pricelist', label: 'Price List' },
  { to: '/framing', label: 'Main Framing' },
  { to: '/components', label: 'Components' },
  { to: '/insulation', label: 'Insulation' },
  { to: '/fasteners', label: 'Fasteners & Bolts' },
  { to: '/structural', label: 'Stairs & Structural' },
  { to: '/summary', label: 'Summary' },
  { to: '/quotation', label: 'Quotation' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <nav className="w-56 bg-gray-900 text-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold text-white">Building Estimator</h1>
        </div>
        <ul className="flex-1 py-2">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                    isActive ? 'bg-gray-700 text-white font-semibold' : ''
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="p-3 text-xs text-gray-500 border-t border-gray-700">
          PEMB Estimator v1.0
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
