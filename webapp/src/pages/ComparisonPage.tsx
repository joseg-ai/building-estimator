import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  apiListQuotes,
  apiGetQuote,
  apiListVendors,
  apiListVendorPrices,
  apiCreatePriceListVersion,
  apiActivatePriceListVersion,
  apiUpdateQuote,
  type QuoteListItem,
  type QuoteDetail,
  type Vendor,
  type VendorPrice,
} from '../api';
import { useBuildingConfig } from '../context';
import { calculateCosts, formatUSD } from '../calculator';
import type { ComponentItem, ComponentCategory } from '../types';

// Structural categories per Livingston's spec
const STRUCTURAL_CATEGORIES: ComponentCategory[] = ['main-framing', 'canopy', 'plates', 'frame-openings'];

function effectivePrice(component: ComponentItem, vendorPrices: VendorPrice[]): number {
  const override = vendorPrices.find((p) => p.itemKey === component.id);
  if (override) return override.unitPrice;
  // fallback to component's current costPerUnit (from active price list)
  return component.costPerUnit;
}

function isVendorOverride(component: ComponentItem, vendorPrices: VendorPrice[]): boolean {
  return vendorPrices.some((p) => p.itemKey === component.id);
}

export default function ComparisonPage() {
  const { quoteId } = useParams<{ quoteId?: string }>();
  const navigate = useNavigate();
  const { config, priceList } = useBuildingConfig();

  // Quote
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [quoteList, setQuoteList] = useState<QuoteListItem[]>([]);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Vendors
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
  const [vendorPricesMap, setVendorPricesMap] = useState<Record<number, VendorPrice[]>>({});
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [addingVendor, setAddingVendor] = useState(false);

  // Pick vendor
  const [pickingVendorId, setPickingVendorId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState('');

  useEffect(() => {
    void loadVendors();
    if (quoteId) {
      void loadQuote(quoteId);
    } else {
      void loadQuoteList();
    }
  }, [quoteId]);

  async function loadVendors() {
    setVendorsLoading(true);
    try {
      const vendors = await apiListVendors();
      setAllVendors(vendors);
    } catch {
      // ignore; user can retry
    } finally {
      setVendorsLoading(false);
    }
  }

  async function loadQuote(id: string) {
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const detail = await apiGetQuote(id);
      setQuote(detail);
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : 'Failed to load quote');
    } finally {
      setQuoteLoading(false);
    }
  }

  async function loadQuoteList() {
    try {
      const list = await apiListQuotes();
      setQuoteList(list);
    } catch {
      // ignore
    }
  }

  const loadVendorPrices = useCallback(async (vendorIds: number[]) => {
    const missing = vendorIds.filter((id) => !(id in vendorPricesMap));
    if (!missing.length) return;
    const results = await Promise.allSettled(
      missing.map((id) => apiListVendorPrices(id).then((prices) => ({ id, prices })))
    );
    setVendorPricesMap((prev) => {
      const next = { ...prev };
      for (const r of results) {
        if (r.status === 'fulfilled') next[r.value.id] = r.value.prices;
      }
      return next;
    });
  }, [vendorPricesMap]);

  useEffect(() => {
    if (selectedVendorIds.length) {
      void loadVendorPrices(selectedVendorIds);
    }
  }, [selectedVendorIds, loadVendorPrices]);

  function addVendor(id: number) {
    if (selectedVendorIds.includes(id)) return;
    const next = [...selectedVendorIds, id];
    setSelectedVendorIds(next);
    setAddingVendor(false);
  }

  function removeVendor(id: number) {
    const next = selectedVendorIds.filter((v) => v !== id);
    setSelectedVendorIds(next);
  }

  const activeConfig = quote?.config ?? config;
  const structuralComponents = activeConfig.components.filter(
    (c) => STRUCTURAL_CATEGORIES.includes(c.category) && c.qty > 0
  );

  const selectedVendors = selectedVendorIds
    .map((id) => allVendors.find((v) => v.id === id))
    .filter((v): v is Vendor => v != null);

  // Per-vendor effective price for a component
  function vendorEffectivePrice(component: ComponentItem, vendorId: number): number {
    const prices = vendorPricesMap[vendorId] ?? [];
    return effectivePrice(component, prices);
  }

  // Cheapest vendor for a component (returns vendorId, or null = active list is cheapest)
  function cheapestVendorId(component: ComponentItem): number | null {
    const listPrice = component.costPerUnit;
    let best = listPrice;
    let bestId: number | null = null;
    for (const v of selectedVendors) {
      const p = vendorEffectivePrice(component, v.id);
      if (p < best) { best = p; bestId = v.id; }
    }
    return bestId;
  }

  // Cheapest price for a component across all vendors + list price
  function cheapestPrice(component: ComponentItem): number {
    const listPrice = component.costPerUnit;
    let best = listPrice;
    for (const v of selectedVendors) {
      const p = vendorEffectivePrice(component, v.id);
      if (p < best) best = p;
    }
    return best;
  }

  // Per-vendor costs using calculateCosts with modified component prices
  function vendorCosts(vendorId: number) {
    const vendorPrices = vendorPricesMap[vendorId] ?? [];
    const modifiedComponents = activeConfig.components.map((c) => {
      if (STRUCTURAL_CATEGORIES.includes(c.category)) {
        return { ...c, costPerUnit: effectivePrice(c, vendorPrices) };
      }
      return c;
    });
    return calculateCosts({ ...activeConfig, components: modifiedComponents });
  }

  async function handlePickVendor(vendor: Vendor) {
    if (!quote) return;
    if (!confirm(`Apply ${vendor.name} pricing to this quote? A new price list snapshot will be created and the quote updated.`)) return;
    setPickingVendorId(vendor.id);
    setToastError('');
    try {
      const vendorPricesList = vendorPricesMap[vendor.id] ?? await apiListVendorPrices(vendor.id);
      const vendorPricesIndex: Record<string, number> = {};
      for (const vp of vendorPricesList) vendorPricesIndex[vp.itemKey] = vp.unitPrice;

      // Clone active price list items with vendor overrides
      const baseItems = priceList.items;
      const overlaidItems = baseItems.map((item) => ({
        item_key: item.item_key,
        description: item.description,
        unit: item.unit,
        unit_price: vendorPricesIndex[item.item_key] ?? item.unit_price,
        category: item.category,
      }));

      const today = new Date().toISOString().slice(0, 10);
      const versionName = `Quote ${quote.id} — ${vendor.name} ${today}`;
      const created = await apiCreatePriceListVersion({
        name: versionName,
        supplier: vendor.name,
        notes: `Vendor snapshot for ${vendor.name}. Source version: ${priceList.activeVersionId ?? 'unknown'}.`,
        items: overlaidItems,
      });
      await apiActivatePriceListVersion(created.id);
      const quoteConfig = { ...quote.config };
      await apiUpdateQuote(
        quote.id,
        quoteConfig,
        quote.grandTotal,
        quote.status,
        created.id,
        quote.customerId ?? null
      );
      setToast(`Quote updated with ${vendor.name} pricing — version "${versionName}" created and activated.`);
      setTimeout(() => {
        setToast('');
        navigate('/design');
      }, 2500);
    } catch (e) {
      const err = e as Error & { code?: string };
      setToastError(err.code ? `[${err.code}] ${err.message}` : (err.message || 'Failed to apply vendor pricing'));
    } finally {
      setPickingVendorId(null);
    }
  }

  // Render: quote picker if no quoteId
  if (!quoteId) {
    return (
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Compare Vendors</h1>
          <p className="text-sm text-gray-500 mt-1">Select a quote to run a multi-vendor price comparison.</p>
        </div>
        {quoteList.length === 0 ? (
          <p className="text-gray-400">No quotes found. <Link to="/quotes" className="text-blue-600 underline">Create one first.</Link></p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {quoteList.map((q) => (
                  <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{q.projectName || '(untitled)'}</td>
                    <td className="py-3 px-4 text-gray-600">{q.customerName || '—'}</td>
                    <td className="py-3 px-4 text-right">{formatUSD(q.grandTotal)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate(`/compare/${q.id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-50"
                      >
                        Compare →
                      </button>
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

  if (quoteLoading) return <div className="text-center py-12 text-gray-400">Loading quote…</div>;
  if (quoteError) return (
    <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
      {quoteError} <Link to="/compare" className="underline ml-2">Pick another quote</Link>
    </div>
  );

  return (
    <div>
      {/* Toast messages */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded shadow-lg text-sm max-w-sm">
          {toast}
        </div>
      )}
      {toastError && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-5 py-3 rounded shadow-lg text-sm max-w-sm">
          {toastError}
          <button onClick={() => setToastError('')} className="ml-3 underline">dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/compare" className="text-sm text-blue-600 hover:text-blue-800">← All Quotes</Link>
            <span className="text-gray-300">|</span>
            <Link to="/quotes" className="text-sm text-blue-600 hover:text-blue-800">My Quotes</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {quote?.projectName || '(untitled)'} — Vendor Comparison
          </h1>
          {quote && (
            <p className="text-sm text-gray-500 mt-1">
              {quote.config.dimensions.width > 0
                ? `${quote.config.dimensions.width}' × ${quote.config.dimensions.length}' × ${quote.config.dimensions.eaveHeight}' · `
                : ''}
              {structuralComponents.length} structural items compared
            </p>
          )}
        </div>
      </div>

      {/* Vendor selector */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-sm font-medium text-gray-600">Vendors:</span>
        {selectedVendors.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-1 rounded-full">
            {v.name}
            <button onClick={() => removeVendor(v.id)} className="text-blue-400 hover:text-blue-700 ml-1 text-xs font-bold leading-none">×</button>
          </span>
        ))}
        {addingVendor ? (
          <div className="flex items-center gap-2">
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              defaultValue=""
              onChange={(e) => { if (e.target.value) addVendor(Number(e.target.value)); }}
            >
              <option value="" disabled>Select vendor…</option>
              {allVendors.filter((v) => !selectedVendorIds.includes(v.id)).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <button onClick={() => setAddingVendor(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setAddingVendor(true)}
            disabled={vendorsLoading || allVendors.filter((v) => !selectedVendorIds.includes(v.id)).length === 0}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-full px-3 py-1 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add Vendor
          </button>
        )}
        {selectedVendors.length === 0 && (
          <span className="text-sm text-gray-400 italic">Add vendors to compare pricing</span>
        )}
      </div>

      {structuralComponents.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
          No structural components found in this quote. Configure the building first on the <Link to="/framing" className="underline">Main Framing</Link> page.
        </div>
      ) : (
        <>
          {/* Comparison table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
            <table className="text-sm" style={{ minWidth: selectedVendors.length > 0 ? `${600 + selectedVendors.length * 140}px` : '600px' }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-medium text-gray-600 sticky left-0 bg-gray-100 z-20 min-w-[80px]">Item</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600 sticky left-[80px] bg-gray-100 z-20 min-w-[180px]">Description</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-600 min-w-[50px]">Qty</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600 min-w-[100px]">Active List</th>
                  {selectedVendors.map((v) => (
                    <th key={v.id} className="text-right py-3 px-3 font-medium text-gray-600 min-w-[120px]">
                      {v.name}
                    </th>
                  ))}
                  {selectedVendors.length > 0 && (
                    <>
                      <th className="text-center py-3 px-3 font-medium text-gray-600 min-w-[80px]">Cheapest</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-600 min-w-[100px]">Subtotal</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {structuralComponents.map((c) => {
                  const bestVendorId = selectedVendors.length > 0 ? cheapestVendorId(c) : null;
                  const bestPrice = selectedVendors.length > 0 ? cheapestPrice(c) : c.costPerUnit;
                  const rowSubtotal = c.qty * bestPrice;

                  return (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-xs font-semibold sticky left-0 bg-white z-10">{c.id}</td>
                      <td className="py-2 px-3 text-gray-700 sticky left-[80px] bg-white z-10">{c.description}</td>
                      <td className="py-2 px-3 text-center text-gray-600">{c.qty}</td>
                      <td className="py-2 px-3 text-right text-gray-600">
                        {c.costPerUnit === 0 ? (
                          <span className="text-yellow-600" title="This item is priced at $0 — verify intentional">⚠ $0.00</span>
                        ) : (
                          `$${c.costPerUnit.toFixed(4)}`
                        )}
                      </td>
                      {selectedVendors.map((v) => {
                        const prices = vendorPricesMap[v.id] ?? [];
                        const hasOverride = isVendorOverride(c, prices);
                        const price = vendorEffectivePrice(c, v.id);
                        const isCheapest = selectedVendors.length > 0 && bestVendorId === v.id;
                        return (
                          <td
                            key={v.id}
                            className={`py-2 px-3 text-right ${isCheapest ? 'bg-green-50 font-semibold text-green-800' : ''}`}
                          >
                            {price === 0 ? (
                              <span className="text-yellow-600" title="This item is priced at $0 — verify intentional">⚠ $0.00</span>
                            ) : (
                              <>
                                <span className={isCheapest ? 'font-bold' : ''}>${price.toFixed(4)}</span>
                                {!hasOverride && (
                                  <span className="text-gray-400 text-xs ml-1" title="Fallback: active list price">(list)</span>
                                )}
                              </>
                            )}
                          </td>
                        );
                      })}
                      {selectedVendors.length > 0 && (
                        <>
                          <td className="py-2 px-3 text-center text-xs text-gray-500">
                            {bestVendorId
                              ? allVendors.find((v) => v.id === bestVendorId)?.name ?? '—'
                              : <span className="text-gray-400">List</span>
                            }
                          </td>
                          <td className="py-2 px-3 text-right font-medium">{formatUSD(rowSubtotal)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals section */}
          {selectedVendors.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800">Totals by Vendor</h2>
                <p className="text-xs text-gray-500 mt-0.5">Labor, overhead, and margins are project-level and constant across vendors.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 w-48">Metric</th>
                      {selectedVendors.map((v) => (
                        <th key={v.id} className="text-right py-3 px-4 font-medium text-gray-600">{v.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const vendorBreakdowns = selectedVendors.map((v) => ({
                        vendor: v,
                        costs: vendorCosts(v.id),
                      }));
                      const minGrand = Math.min(...vendorBreakdowns.map((vb) => vb.costs.grandTotal));
                      const rows: Array<{ label: string; getValue: (costs: ReturnType<typeof calculateCosts>) => number; highlight?: boolean }> = [
                        { label: 'Structural Materials', getValue: (c) => c.structuralTotal },
                        { label: 'Labor', getValue: (c) => c.labor },
                        { label: 'Detailing', getValue: (c) => c.detailing },
                        { label: 'Engineering', getValue: (c) => c.engineering },
                        { label: 'Overhead', getValue: (c) => c.overheadCost },
                        { label: 'Subtotal', getValue: (c) => c.subTotal, highlight: true },
                        { label: 'Profit', getValue: (c) => c.profit },
                        { label: 'Commission', getValue: (c) => c.commission },
                        { label: 'Grand Total', getValue: (c) => c.grandTotal, highlight: true },
                      ];
                      return rows.map(({ label, getValue, highlight }) => (
                        <tr key={label} className={`border-b border-gray-100 ${highlight ? 'bg-gray-50' : ''}`}>
                          <td className={`py-2 px-4 ${highlight ? 'font-semibold' : 'text-gray-600'}`}>{label}</td>
                          {vendorBreakdowns.map(({ vendor, costs }) => {
                            const val = getValue(costs);
                            const isCheapestGrand = label === 'Grand Total' && costs.grandTotal === minGrand;
                            return (
                              <td
                                key={vendor.id}
                                className={`py-2 px-4 text-right ${highlight ? 'font-semibold' : ''} ${isCheapestGrand ? 'text-green-700 font-bold' : ''}`}
                              >
                                {formatUSD(val)}
                                {isCheapestGrand && <span className="ml-1 text-green-600">✓</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pick vendor buttons */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-3 flex-wrap">
                {selectedVendors.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handlePickVendor(v)}
                    disabled={pickingVendorId !== null}
                    className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {pickingVendorId === v.id ? 'Applying…' : `Use ${v.name}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
