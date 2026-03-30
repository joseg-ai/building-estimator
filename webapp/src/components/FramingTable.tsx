import { useBuildingConfig } from '../context';
import type { ComponentCategory, ComponentItem } from '../types';
import { getSpecsByGroup, lookupMaterial } from '../materialSpecs';
import { formatUSD } from '../calculator';

type CatalogEntry = Omit<ComponentItem, 'qty'>;

interface Props {
  category: ComponentCategory;
  catalog: CatalogEntry[];
  title: string;
}

/** Framing-style table matching the Excel workflow:
 *  User enters Qty + Length -> LnFt auto-calculated
 *  User picks Material from dropdown (VLOOKUP) -> weight auto-calculated
 *  Cost = Weight * Cost per Pound (editable)
 */
export default function FramingTable({ category, catalog, title }: Props) {
  const { config, dispatch } = useBuildingConfig();

  const itemMap = new Map(
    config.components.filter((c) => c.category === category).map((c) => [c.id, c])
  );

  function upsert(catalogItem: CatalogEntry, data: Partial<ComponentItem>) {
    const existing = itemMap.get(catalogItem.id);
    if (existing) {
      dispatch({ type: 'UPDATE_COMPONENT', payload: { id: catalogItem.id, data } });
    } else {
      dispatch({ type: 'ADD_COMPONENT', payload: { ...catalogItem, qty: 0, ...data } });
    }
  }

  function setQty(item: CatalogEntry, qty: number) {
    const existing = itemMap.get(item.id);
    const len = existing?.length ?? item.length;
    const lnFt = qty * len;
    const spec = lookupMaterial(existing?.material ?? item.material);
    const weight = spec ? lnFt * spec.weightPerFt : existing?.weight ?? 0;
    const cost = weight * (existing?.costPerUnit ?? item.costPerUnit);
    upsert(item, { qty, lnFeetToFab: lnFt, weight });
    // We don't store cost as a field; it's computed. But we keep weight updated.
    void cost; // cost is displayed, not stored separately
  }

  function setLength(item: CatalogEntry, len: number) {
    const existing = itemMap.get(item.id);
    const qty = existing?.qty ?? 0;
    const lnFt = qty * len;
    const spec = lookupMaterial(existing?.material ?? item.material);
    const weight = spec ? lnFt * spec.weightPerFt : existing?.weight ?? 0;
    upsert(item, { length: len, lnFeetToFab: lnFt, weight });
  }

  function setMaterial(item: CatalogEntry, designation: string) {
    const existing = itemMap.get(item.id);
    const lnFt = existing?.lnFeetToFab ?? 0;
    const spec = lookupMaterial(designation);
    const group = spec?.group ?? existing?.group ?? item.group;
    const weight = spec ? lnFt * spec.weightPerFt : 0;
    upsert(item, { material: designation, group, weight });
  }

  function setCostPerPound(item: CatalogEntry, costPerUnit: number) {
    upsert(item, { costPerUnit });
  }

  // Available material groups for this section
  const groups = [...new Set(catalog.map((c) => c.group))];
  // Build a merged list of available materials across all groups in this catalog
  const availableMaterials = groups.flatMap((g) => getSpecsByGroup(g));

  const sectionWeight = catalog.reduce((sum, item) => {
    const existing = itemMap.get(item.id);
    return sum + (existing?.weight ?? 0);
  }, 0);

  const sectionCost = catalog.reduce((sum, item) => {
    const existing = itemMap.get(item.id);
    if (!existing || existing.qty <= 0) return sum;
    return sum + existing.weight * existing.costPerUnit;
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <div className="text-sm text-gray-600 space-x-4">
          <span>Weight: <span className="font-medium text-gray-900">{Math.round(sectionWeight).toLocaleString()} lbs</span></span>
          <span>Cost: <span className="font-medium text-gray-900">{formatUSD(sectionCost)}</span></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-medium text-gray-500">Description</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-16">Qty</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-20">Length</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-20">Ln Ft</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 w-48">Material</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-20">$/lb</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-24">Weight</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 w-24">Cost</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((item) => {
              const existing = itemMap.get(item.id);
              const qty = existing?.qty ?? 0;
              const len = existing?.length ?? item.length;
              const lnFt = existing?.lnFeetToFab ?? qty * len;
              const mat = existing?.material ?? item.material;
              const costPerUnit = existing?.costPerUnit ?? item.costPerUnit;
              const weight = existing?.weight ?? 0;
              const lineCost = weight * costPerUnit;
              const isActive = qty > 0;

              // Get available materials for this item's group
              const itemGroup = existing?.group ?? item.group;
              const materialsForGroup = getSpecsByGroup(itemGroup);

              return (
                <tr key={item.id} className={`border-b border-gray-100 ${isActive ? 'bg-blue-50/40' : ''}`}>
                  <td className="py-1.5 px-2">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-xs text-gray-400">{itemGroup}</div>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input type="number" min={0} step={1}
                      value={qty || ''}
                      onChange={(e) => setQty(item, Number(e.target.value))}
                      className="w-16 border border-gray-300 rounded px-1 py-0.5 text-right text-sm"
                      placeholder="0" />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input type="number" min={0} step={1}
                      value={len || ''}
                      onChange={(e) => setLength(item, Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded px-1 py-0.5 text-right text-sm"
                      placeholder="0" />
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-600">
                    {lnFt > 0 ? lnFt.toLocaleString() : '-'}
                  </td>
                  <td className="py-1.5 px-2">
                    <select
                      value={mat}
                      onChange={(e) => setMaterial(item, e.target.value)}
                      className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                    >
                      <option value={item.material}>{item.material}</option>
                      {materialsForGroup
                        .filter((m) => m.designation !== item.material)
                        .map((m) => (
                          <option key={m.designation} value={m.designation}>
                            {m.designation} ({m.weightPerFt} lb/ft)
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input type="number" min={0} step={0.01}
                      value={costPerUnit}
                      onChange={(e) => setCostPerPound(item, Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded px-1 py-0.5 text-right text-sm" />
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-600">
                    {weight > 0 ? `${Math.round(weight).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-medium">
                    {isActive && lineCost > 0 ? formatUSD(lineCost) : '-'}
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
