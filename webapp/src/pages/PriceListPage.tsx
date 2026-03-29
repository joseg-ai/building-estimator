import { useState } from 'react';
import { defaultPriceList, type PriceListItem } from '../priceList';
import { allCatalogs } from '../catalog';
import { useBuildingConfig } from '../context';
import { formatUSD } from '../calculator';

/** Group labels for visual sections */
const groups: { label: string; filter: (item: PriceListItem) => boolean }[] = [
  { label: 'Cold Form (Purlins, Girts, Cee/Zee)', filter: (i) => /^[ZC]\d|^PU|^ES/.test(i.itemCode) },
  { label: 'Base & Rake Angles', filter: (i) => /^B\d/.test(i.itemCode) },
  { label: 'Panels & Sheeting', filter: (i) => /^CL24|^RL6|^ML6/.test(i.itemCode) },
  { label: 'Roof Trim', filter: (i) => /^SS(?:RA|GU|GE|PC|EF)/.test(i.itemCode) },
  { label: 'Wall Trim', filter: (i) => /^OU|^JA|^FR|^DS|^IC|^TS/.test(i.itemCode) },
  { label: 'Hardware & Closures', filter: (i) => /^CL5|^MRS|^RL?CL|^CL7|^BAND|^SH-/.test(i.itemCode) },
  { label: 'Structural Steel', filter: (i) => i.itemCode.startsWith('STEEL-') },
  { label: 'Bolts & Fasteners', filter: (i) => /^AB-|^BT-|^CB-|^BK-|^FAST/.test(i.itemCode) },
  { label: 'Insulation', filter: (i) => i.itemCode.startsWith('INS-') },
  { label: 'Doors & Windows', filter: (i) => /^DR-|^PANIC|^DEAD|^ROLL|^WIN-/.test(i.itemCode) },
  { label: 'Stairs & Misc', filter: (i) => /^STEP|^BRACK|^DECK/.test(i.itemCode) },
];

export default function PriceListPage() {
  const { config, dispatch } = useBuildingConfig();
  const [prices, setPrices] = useState<PriceListItem[]>(() => [...defaultPriceList]);
  const [search, setSearch] = useState('');

  const lowerSearch = search.toLowerCase();
  const filtered = search
    ? prices.filter(
        (p) =>
          p.itemCode.toLowerCase().includes(lowerSearch) ||
          p.description.toLowerCase().includes(lowerSearch)
      )
    : prices;

  function updatePrice(idx: number, newPrice: number) {
    setPrices((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], unitPrice: newPrice };
      return next;
    });
  }

  /** Sync all prices from the price list into the component catalog entries that are in the current config */
  function syncToProject() {
    // Build a map: material name -> new price
    const materialPriceMap = new Map<string, number>();
    for (const item of prices) {
      for (const mat of item.mapTo) {
        materialPriceMap.set(mat, item.unitPrice);
      }
    }

    // Update components in the project that match
    let updated = 0;
    const newComponents = config.components.map((comp) => {
      const newPrice = materialPriceMap.get(comp.material);
      if (newPrice !== undefined && newPrice !== comp.costPerUnit) {
        updated++;
        return { ...comp, costPerUnit: newPrice };
      }
      return comp;
    });

    if (updated > 0) {
      dispatch({ type: 'SET_COMPONENTS', payload: newComponents });
    }

    // Also check unlinked catalog items
    const catalogMaterials = new Set<string>();
    for (const cat of Object.values(allCatalogs)) {
      for (const item of cat.items) {
        catalogMaterials.add(item.material);
      }
    }

    const unmapped = prices.filter(
      (p) => p.mapTo.length > 0 && p.mapTo.some((m) => !catalogMaterials.has(m))
    );

    alert(
      `Synced ${updated} component price${updated !== 1 ? 's' : ''} to the project.` +
      (unmapped.length > 0
        ? `\n${unmapped.length} price list item(s) could not be mapped to catalog materials.`
        : '')
    );
  }

  function renderGroup(label: string, items: PriceListItem[]) {
    if (items.length === 0) return null;
    return (
      <div key={label} className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 bg-gray-100 px-3 py-1.5 rounded">{label}</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1.5 px-2 font-medium text-gray-500 w-28">Item Code</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500">Description</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500 w-14">Unit</th>
              <th className="text-right py-1.5 px-2 font-medium text-gray-500 w-28">Unit Price</th>
              <th className="text-center py-1.5 px-2 font-medium text-gray-500 w-16">Maps</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const globalIdx = prices.indexOf(item);
              return (
                <tr key={item.itemCode + globalIdx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 px-2 font-mono text-xs text-gray-600">{item.itemCode}</td>
                  <td className="py-1.5 px-2">{item.description}</td>
                  <td className="py-1.5 px-2 text-gray-500 text-xs">{item.unit}</td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      type="number" min={0} step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updatePrice(globalIdx, Number(e.target.value))}
                      className="w-24 border border-gray-300 rounded px-2 py-0.5 text-right text-sm"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {item.mapTo.length > 0 ? (
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title={item.mapTo.join(', ')} />
                    ) : (
                      <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" title="Not mapped to catalog" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centralized Price List</h1>
          <p className="text-sm text-gray-500 mt-1">
            Master pricing from supplier (Central States). Edit prices here, then sync to the project.
          </p>
        </div>
        <button
          onClick={syncToProject}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Sync Prices to Project
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by item code or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4 text-sm text-gray-500">
        <span>{prices.length} items total</span>
        <span>{prices.filter((p) => p.mapTo.length > 0).length} mapped to catalog</span>
        {search && <span>{filtered.length} matching search</span>}
      </div>

      {/* Price table by group */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        {search ? (
          // flat list when searching
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1.5 px-2 font-medium text-gray-500 w-28">Item Code</th>
                <th className="text-left py-1.5 px-2 font-medium text-gray-500">Description</th>
                <th className="text-left py-1.5 px-2 font-medium text-gray-500 w-14">Unit</th>
                <th className="text-right py-1.5 px-2 font-medium text-gray-500 w-28">Unit Price</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-500 w-16">Maps</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const globalIdx = prices.indexOf(item);
                return (
                  <tr key={item.itemCode + globalIdx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-mono text-xs text-gray-600">{item.itemCode}</td>
                    <td className="py-1.5 px-2">{item.description}</td>
                    <td className="py-1.5 px-2 text-gray-500 text-xs">{item.unit}</td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number" min={0} step={0.01}
                        value={item.unitPrice}
                        onChange={(e) => updatePrice(globalIdx, Number(e.target.value))}
                        className="w-24 border border-gray-300 rounded px-2 py-0.5 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {item.mapTo.length > 0 ? (
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title={item.mapTo.join(', ')} />
                      ) : (
                        <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" title="Not mapped" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          groups.map(({ label, filter }) => {
            const items = filtered.filter(filter);
            // catch ungrouped items
            return renderGroup(label, items);
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full" /> Mapped to catalog (price syncs to project)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" /> Reference only (not linked)
        </span>
      </div>
    </div>
  );
}
