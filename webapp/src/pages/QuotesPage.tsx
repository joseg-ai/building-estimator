import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiListQuotes, apiDeleteQuote, apiCreateQuote, type QuoteListItem } from '../api';
import { useBuildingConfig } from '../context';
import { calculateCosts, formatUSD } from '../calculator';
import { createDefaultConfig } from '../types';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { config, dispatch } = useBuildingConfig();
  const navigate = useNavigate();

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    setLoading(true);
    try {
      const data = await apiListQuotes();
      setQuotes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }

  async function handleNew() {
    dispatch({ type: 'RESET' });
    try {
      const freshConfig = createDefaultConfig();
      const result = await apiCreateQuote(freshConfig, 0);
      // Store the quote ID so the app knows which quote is active
      localStorage.setItem('active_quote_id', result.id);
      navigate('/design');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
    }
  }

  async function handleOpen(quoteId: string) {
    try {
      const { apiGetQuote } = await import('../api');
      const detail = await apiGetQuote(quoteId);
      dispatch({ type: 'LOAD', payload: detail.config });
      localStorage.setItem('active_quote_id', quoteId);
      navigate('/design');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    }
  }

  async function handleDelete(quoteId: string) {
    if (!confirm('Delete this quote? This cannot be undone.')) return;
    try {
      await apiDeleteQuote(quoteId);
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      // If this was the active quote, clear it
      if (localStorage.getItem('active_quote_id') === quoteId) {
        localStorage.removeItem('active_quote_id');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete quote');
    }
  }

  async function handleSaveCurrent() {
    const activeId = localStorage.getItem('active_quote_id');
    const costs = calculateCosts(config);
    try {
      if (activeId) {
        const { apiUpdateQuote } = await import('../api');
        await apiUpdateQuote(activeId, config, costs.grandTotal);
      } else {
        const result = await apiCreateQuote(config, costs.grandTotal);
        localStorage.setItem('active_quote_id', result.id);
      }
      await loadQuotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Quotes</h1>
          <p className="text-sm text-gray-500 mt-1">Create, open, and manage your building estimates.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSaveCurrent}
            className="border border-blue-600 text-blue-600 text-sm font-medium px-4 py-2 rounded hover:bg-blue-50 transition-colors">
            Save Current
          </button>
          <button onClick={handleNew}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 transition-colors">
            + New Quote
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-500 underline">dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading quotes...</div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No saved quotes yet.</p>
          <button onClick={handleNew}
            className="bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded hover:bg-blue-700">
            Create Your First Quote
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Project</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Total</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Updated</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{q.project_name || '(untitled)'}</td>
                  <td className="py-3 px-4 text-gray-600">{q.customer_name || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{q.job_location || '-'}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatUSD(q.grand_total)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${statusColors[q.status] || 'bg-gray-100 text-gray-600'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {new Date(q.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => handleOpen(q.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">
                        Open
                      </button>
                      <button onClick={() => handleDelete(q.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
