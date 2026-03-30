import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../authContext';
import { useBuildingConfig } from '../context';
import { calculateCosts, formatUSD } from '../calculator';
import { apiCreateQuote, apiUpdateQuote } from '../api';

const mainLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/quotes', label: 'My Quotes', end: false },
  { to: '/pricelist', label: 'Price List', end: false },
];

const quoteLinks = [
  { to: '/design', label: 'Design' },
  { to: '/framing', label: 'Main Framing' },
  { to: '/components', label: 'Components' },
  { to: '/insulation', label: 'Insulation' },
  { to: '/fasteners', label: 'Fasteners & Bolts' },
  { to: '/structural', label: 'Stairs & Structural' },
  { to: '/summary', label: 'Summary' },
  { to: '/quotation', label: 'Quotation' },
];

const quotePaths = new Set(quoteLinks.map((l) => l.to));

export default function Layout() {
  const { user, logout } = useAuth();
  const { config } = useBuildingConfig();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // A quote is "active" if the user has a project loaded (created/opened from My Quotes)
  const hasActiveQuote = !!localStorage.getItem('active_quote_id');
  // Show quote sub-nav if a quote is active OR the user is on a quote page already
  const onQuotePage = quotePaths.has(location.pathname);
  const showQuoteNav = hasActiveQuote || onQuotePage;

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    try {
      const costs = calculateCosts(config);
      const activeId = localStorage.getItem('active_quote_id');
      if (activeId) {
        await apiUpdateQuote(activeId, config, costs.grandTotal);
      } else {
        const result = await apiCreateQuote(config, costs.grandTotal);
        localStorage.setItem('active_quote_id', result.id);
      }
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Save failed');
      setTimeout(() => setSaveMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <nav className="w-56 bg-gray-900 text-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold text-white">Building Estimator</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Main navigation */}
          <ul className="py-2">
            {mainLinks.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end}
                  className={({ isActive }) =>
                    `block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-700 text-white font-semibold' : ''}`
                  }>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Quote sub-navigation (only when a quote is active) */}
          {showQuoteNav && (
            <div className="border-t border-gray-700">
              <div className="px-4 py-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Current Quote</p>
                {config.projectName && (
                  <p className="text-xs text-blue-400 truncate mt-0.5">{config.projectName}</p>
                )}
              </div>
              <ul className="pb-2">
                {quoteLinks.map((l) => (
                  <li key={l.to}>
                    <NavLink to={l.to}
                      className={({ isActive }) =>
                        `block px-4 pl-6 py-1.5 text-sm hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-700 text-white font-semibold' : 'text-gray-400'}`
                      }>
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* User info and logout */}
        <div className="p-3 border-t border-gray-700">
          {user && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 truncate">{user.displayName}</span>
              <button onClick={logout}
                className="text-xs text-gray-500 hover:text-white transition-colors">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Save bar -- visible on all quote editing pages */}
        {showQuoteNav && (
          <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between shrink-0">
            <div className="text-sm text-gray-500">
              {config.projectName ? (
                <span>Editing: <span className="font-medium text-gray-800">{config.projectName}</span></span>
              ) : (
                <span className="text-gray-400">Unsaved quote</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {saveMsg && (
                <span className={`text-xs font-medium ${saveMsg === 'Saved' ? 'text-green-600' : 'text-red-500'}`}>
                  {saveMsg}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Quote'}
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
