import { useBuildingConfig } from '../context';
import type { ComponentCategory, ComponentItem } from '../types';
import { formatUSD } from '../calculator';

type CatalogEntry = Omit<ComponentItem, 'qty'>;

interface Props {
  category: ComponentCategory;
  catalog: CatalogEntry[];
  title: string;
}

export default function ComponentTable({ category, catalog, title }: Props) {
  const { config, dispatch } = useBuildingConfig();

  const itemMap = new Map(
    config.components.filter((c) => c.category === category).map((c) => [c.id, c])
  );

  function setQty(catalogItem: CatalogEntry, qty: number) {
    const existing = itemMap.get(catalogItem.id);
    if (qty <= 0) {
      if (existing) dispatch({ type: 'REMOVE_COMPONENT', payload: catalogItem.id });
      return;
    }
    if (existing) {
      dispatch({ type: 'UPDATE_COMPONENT', payload: { id: catalogItem.id, data: { qty } } });
    } else {
      dispatch({ type: 'ADD_COMPONENT', payload: { ...catalogItem, qty } });
    }
  }

  function setCostPerUnit(id: string, costPerUnit: number) {
    dispatch({ type: 'UPDATE_COMPONENT', payload: { id, data: { costPerUnit } } });
  }

  const categoryTotal = catalog.reduce((sum, item) => {
    const qty = itemMap.get(item.id)?.qty ?? 0;
    const price = itemMap.get(item.id)?.costPerUnit ?? item.costPerUnit;
    return sum + qty * price;
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <span className="text-sm font-medium text-gray-600">
          Subtotal: <span className="text-gray-900">{formatUSD(categoryTotal)}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-medium text-gray-500">Description</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 w-32">Material</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 w-14">Unit</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-20">Qty</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-24">Cost/Unit</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((item) => {
              const existing = itemMap.get(item.id);
              const qty = existing?.qty ?? 0;
              const price = existing?.costPerUnit ?? item.costPerUnit;
              const lineTotal = qty * price;

              return (
                <tr key={item.id} className={`border-b border-gray-100 ${qty > 0 ? 'bg-blue-50/40' : ''}`}>
                  <td className="py-1.5 px-2">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-xs text-gray-400">{item.group}</div>
                  </td>
                  <td className="py-1.5 px-2 text-xs text-gray-500 max-w-32 truncate" title={item.material}>
                    {item.material}
                  </td>
                  <td className="py-1.5 px-2 text-gray-500 text-xs">{item.measure}</td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      type="number" min={0} step={1}
                      value={qty || ''}
                      onChange={(e) => setQty(item, Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded px-2 py-0.5 text-right text-sm"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      type="number" min={0} step={0.01}
                      value={price}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        if (existing) {
                          setCostPerUnit(item.id, newPrice);
                        } else if (qty > 0) {
                          dispatch({
                            type: 'ADD_COMPONENT',
                            payload: { ...item, costPerUnit: newPrice, qty },
                          });
                        }
                      }}
                      className="w-24 border border-gray-300 rounded px-2 py-0.5 text-right text-sm"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right font-medium">
                    {qty > 0 ? formatUSD(lineTotal) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
