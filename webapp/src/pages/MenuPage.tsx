import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext';
import { useBuildingConfig } from '../context';
import { apiCreateQuote } from '../api';
import { createDefaultConfig } from '../types';
import { calculateCosts, formatUSD } from '../calculator';

export default function MenuPage() {
  const { user } = useAuth();
  const { config, dispatch } = useBuildingConfig();
  const navigate = useNavigate();
  const hasActiveQuote = !!localStorage.getItem('active_quote_id');
  const costs = hasActiveQuote ? calculateCosts(config) : null;

  async function handleNewQuote() {
    dispatch({ type: 'RESET' });
    try {
      const freshConfig = createDefaultConfig();
      const result = await apiCreateQuote(freshConfig, 0);
      localStorage.setItem('active_quote_id', result.id);
      navigate('/design');
    } catch {
      navigate('/design');
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{user ? `, ${user.displayName}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">Pre-Engineered Metal Building (PEMB) estimation tool</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button onClick={handleNewQuote}
          className="border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all bg-white text-left">
          <div className="text-2xl mb-2">+</div>
          <h2 className="font-semibold text-gray-900">New Quote</h2>
          <p className="text-sm text-gray-500 mt-1">Start a fresh building estimate</p>
        </button>
        <Link to="/quotes"
          className="block border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all bg-white">
          <div className="text-2xl mb-2">📁</div>
          <h2 className="font-semibold text-gray-900">My Quotes</h2>
          <p className="text-sm text-gray-500 mt-1">View and manage saved quotes</p>
        </Link>
        <Link to="/pricelist"
          className="block border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all bg-white">
          <div className="text-2xl mb-2">📋</div>
          <h2 className="font-semibold text-gray-900">Price List</h2>
          <p className="text-sm text-gray-500 mt-1">Manage supplier pricing</p>
        </Link>
      </div>

      {/* Active Quote Summary */}
      {hasActiveQuote && config.projectName && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Active Quote</h2>
            <Link to="/design" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Continue Editing
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Project</p>
              <p className="font-medium">{config.projectName || '(untitled)'}</p>
            </div>
            <div>
              <p className="text-gray-500">Customer</p>
              <p className="font-medium">{config.customerName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Building</p>
              <p className="font-medium">
                {config.dimensions.width > 0
                  ? `${config.dimensions.width}' x ${config.dimensions.length}' x ${config.dimensions.eaveHeight}'`
                  : '-'}
              </p>
            </div>
            {costs && (
              <div>
                <p className="text-gray-500">Grand Total</p>
                <p className="font-semibold text-blue-700">{formatUSD(costs.grandTotal)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
