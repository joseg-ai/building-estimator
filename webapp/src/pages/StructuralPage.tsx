import { useMemo } from 'react';
import { useBuildingConfig } from '../context';
import { computeStairBom, computeStairCost, type StairConfig, type StairLanding, type StairComponentItem } from '../stairEngine';
import { formatUSD } from '../calculator';

function num(v: number, digits = 2): string {
  return Number.isFinite(v) ? v.toFixed(digits) : '—';
}

function bomItemExtended(item: StairComponentItem): number {
  const m = (item.measure ?? '').trim().toLowerCase();
  if (m === 'ln ft' || m === 'lnft' || m === 'ln. ft' || m === 'linear ft' || m === 'linft') {
    return (item.lnF > 0 ? item.lnF : item.qty * item.length) * item.costPerUnit;
  }
  if (m === 'pound/ft' || m === 'lb/ft' || m === 'pound' || m === 'lb' || m === '$/lb') {
    return item.weight * item.costPerUnit;
  }
  if (m === 'pc' || m === '') {
    return item.qty * item.costPerUnit;
  }
  return item.weight > 0 ? item.weight * item.costPerUnit : item.qty * item.costPerUnit;
}

function clampInt(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step = 0.01,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">
        {label}
        {suffix ? <span className="text-gray-400"> ({suffix})</span> : null}
      </label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300"
      />
      {label}
    </label>
  );
}

function LandingEditor({
  title,
  landing,
  onChange,
}: {
  title: string;
  landing: StairLanding;
  onChange: (patch: Partial<StairLanding>) => void;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded p-3">
      <h2 className="font-semibold text-gray-800 text-sm mb-1.5">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Width" suffix="ft" value={landing.width} min={0} onChange={(v) => onChange({ width: Math.max(0, v) })} />
        <NumberField label="Length" suffix="ft" value={landing.length} min={0} onChange={(v) => onChange({ length: Math.max(0, v) })} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <CheckboxField label="Guard A (near short)" checked={landing.guardRailA} onChange={(v) => onChange({ guardRailA: v })} />
        <CheckboxField label="Guard B (long)" checked={landing.guardRailB} onChange={(v) => onChange({ guardRailB: v })} />
        <CheckboxField label="Guard C (far short)" checked={landing.guardRailC} onChange={(v) => onChange({ guardRailC: v })} />
      </div>
    </section>
  );
}

export default function StructuralPage() {
  const { stairConfig, setStairConfig } = useBuildingConfig();

  // Inline validation: levels 1–5, no negatives on numeric fields.
  const levelsError = stairConfig.levels < 1 || stairConfig.levels > 5 ? 'Levels must be between 1 and 5' : null;
  const widthError = stairConfig.width <= 0 ? 'Width must be > 0' : null;
  const ftfError = stairConfig.floorToFloorHeight <= 0 ? 'Floor-to-floor height must be > 0' : null;
  const treadRunError = stairConfig.treadRunInches <= 0 ? 'Tread run must be > 0' : null;

  const hasBlocker = !!(levelsError || widthError || ftfError || treadRunError);

  const bomItems = useMemo(() => (hasBlocker ? [] : computeStairBom(stairConfig)), [stairConfig, hasBlocker]);
  const cost = useMemo(() => (hasBlocker ? null : computeStairCost(stairConfig)), [stairConfig, hasBlocker]);

  function setLevels(raw: number) {
    const levels = clampInt(raw, 1, 5);
    setStairConfig((prev) => {
      const treads = [...prev.treadsPerFlight];
      while (treads.length < levels) treads.push(treads[treads.length - 1] ?? 10);
      treads.length = levels;
      return { ...prev, levels, treadsPerFlight: treads };
    });
  }

  function setTreadCount(idx: number, value: number) {
    setStairConfig((prev) => {
      const treads = [...prev.treadsPerFlight];
      treads[idx] = Math.max(0, Math.round(value));
      return { ...prev, treadsPerFlight: treads };
    });
  }

  function setRails(patch: Partial<StairConfig['rails']>) {
    setStairConfig((prev) => ({ ...prev, rails: { ...prev.rails, ...patch } }));
  }

  function setMidLanding(patch: Partial<StairLanding>) {
    setStairConfig((prev) => ({
      ...prev,
      midLanding: {
        ...(prev.midLanding ?? { width: 0, length: 0, guardRailA: false, guardRailB: false, guardRailC: false }),
        ...patch,
      },
    }));
  }

  function setFloorLanding(patch: Partial<StairLanding>) {
    setStairConfig((prev) => ({ ...prev, floorLanding: { ...prev.floorLanding, ...patch } }));
  }

  function toggleMidLanding(enabled: boolean) {
    setStairConfig((prev) => ({
      ...prev,
      hasMidLanding: enabled,
      midLanding: enabled
        ? (prev.midLanding ?? { width: prev.width * 2, length: 4.667, guardRailA: true, guardRailB: true, guardRailC: true })
        : prev.midLanding,
    }));
  }

  const bomTotal = bomItems.reduce((s, it) => s + bomItemExtended(it), 0);
  const totalWeight = bomItems.reduce((s, it) => s + it.weight, 0);

  return (
    <div className="max-w-7xl space-y-3">
      <h1 className="text-2xl font-bold text-gray-900">Stairs & Structural</h1>
      <p className="text-sm text-gray-500">
        Parametric stair calculator. Edits auto-save to localStorage; BOM and cost preview live-update.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ---- LEFT: inputs ---- */}
        <div className="space-y-3">
          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Stair Geometry</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Levels <span className="text-gray-400">(1–5)</span></label>
                <select
                  value={stairConfig.levels}
                  onChange={(e) => setLevels(Number(e.target.value))}
                  className={`w-full border rounded px-2 py-1 text-sm bg-white ${levelsError ? 'border-red-400' : 'border-gray-300'}`}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {levelsError && <p className="text-red-500 text-[10px] mt-0.5">{levelsError}</p>}
              </div>
              <div>
                <NumberField
                  label="Floor-to-floor"
                  suffix="ft"
                  value={stairConfig.floorToFloorHeight}
                  min={0}
                  step={0.1}
                  onChange={(v) => setStairConfig((prev) => ({ ...prev, floorToFloorHeight: Math.max(0, v) }))}
                />
                {ftfError && <p className="text-red-500 text-[10px] mt-0.5">{ftfError}</p>}
              </div>
              <div>
                <NumberField
                  label="Stair width"
                  suffix="ft"
                  value={stairConfig.width}
                  min={0}
                  step={0.1}
                  onChange={(v) => setStairConfig((prev) => ({ ...prev, width: Math.max(0, v) }))}
                />
                {widthError && <p className="text-red-500 text-[10px] mt-0.5">{widthError}</p>}
              </div>
              <div>
                <NumberField
                  label="Tread run"
                  suffix="in"
                  value={stairConfig.treadRunInches}
                  min={0}
                  step={0.25}
                  onChange={(v) => setStairConfig((prev) => ({ ...prev, treadRunInches: Math.max(0, v) }))}
                />
                {treadRunError && <p className="text-red-500 text-[10px] mt-0.5">{treadRunError}</p>}
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1">Treads per flight</label>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: stairConfig.levels }, (_, i) => (
                  <div key={i}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={stairConfig.treadsPerFlight[i] ?? 0}
                      onChange={(e) => setTreadCount(i, Number(e.target.value))}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <div className="text-[10px] text-gray-400 text-center mt-0.5">L{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
              <div>Flights: <b className="text-gray-700">{stairConfig.levels * (stairConfig.hasMidLanding ? 2 : 1)}</b></div>
              <div>Total treads: <b className="text-gray-700">{stairConfig.treadsPerFlight.reduce((s, n) => s + (n || 0), 0)}</b></div>
              <div>Stringer: <b className="text-gray-700">{num(
                Math.sqrt(
                  Math.pow(stairConfig.floorToFloorHeight / (stairConfig.hasMidLanding ? 2 : 1), 2) +
                  Math.pow(((stairConfig.treadsPerFlight[0] ?? 0) * stairConfig.treadRunInches) / 12, 2)
                )
              )} ft</b></div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Rails</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <CheckboxField label="Right guard rail" checked={stairConfig.rails.rightGuardRail} onChange={(v) => setRails({ rightGuardRail: v })} />
              <CheckboxField label="Left guard rail" checked={stairConfig.rails.leftGuardRail} onChange={(v) => setRails({ leftGuardRail: v })} />
              <CheckboxField label="Right hand rail" checked={stairConfig.rails.rightHandRail} onChange={(v) => setRails({ rightHandRail: v })} />
              <CheckboxField label="Left hand rail" checked={stairConfig.rails.leftHandRail} onChange={(v) => setRails({ leftHandRail: v })} />
              <CheckboxField
                label="Pickets between rails"
                checked={(stairConfig.rails.picketsPerFt ?? 0) > 0}
                onChange={(v) => setRails({ picketsPerFt: v ? 1 : 0 })}
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-400">
              Guard-rail height is governed by workbook defaults; engine prices rail by linear feet.
            </p>
          </section>

          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Mid Landing</h2>
            <CheckboxField label="Has mid-landing per ascent" checked={stairConfig.hasMidLanding} onChange={toggleMidLanding} />
            {stairConfig.hasMidLanding && stairConfig.midLanding && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <NumberField label="Width" suffix="ft" value={stairConfig.midLanding.width} min={0} onChange={(v) => setMidLanding({ width: Math.max(0, v) })} />
                <NumberField label="Length" suffix="ft" value={stairConfig.midLanding.length} min={0} onChange={(v) => setMidLanding({ length: Math.max(0, v) })} />
                <div className="col-span-2 flex flex-wrap gap-x-3 gap-y-1">
                  <CheckboxField label="Guard A" checked={stairConfig.midLanding.guardRailA} onChange={(v) => setMidLanding({ guardRailA: v })} />
                  <CheckboxField label="Guard B" checked={stairConfig.midLanding.guardRailB} onChange={(v) => setMidLanding({ guardRailB: v })} />
                  <CheckboxField label="Guard C" checked={stairConfig.midLanding.guardRailC} onChange={(v) => setMidLanding({ guardRailC: v })} />
                </div>
              </div>
            )}
          </section>

          <LandingEditor title="Floor Landing" landing={stairConfig.floorLanding} onChange={setFloorLanding} />
        </div>

        {/* ---- RIGHT: preview ---- */}
        <div className="space-y-3">
          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Cost Summary</h2>
            {hasBlocker && (
              <p className="text-xs text-red-600">Fix validation errors to see the cost preview.</p>
            )}
            {!hasBlocker && cost && (
              <div className="text-sm space-y-0.5">
                <div className="flex justify-between"><span className="text-gray-500">Direct Materials</span><span className="font-mono">{formatUSD(cost.directCost)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Labor ({num(cost.labor / cost.weight || 0)} ×/lb × {num(cost.weight, 1)} lb)</span><span className="font-mono">{formatUSD(cost.labor)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Detailing</span><span className="font-mono">{formatUSD(cost.detailing)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Loading / Hauling</span><span className="font-mono">{formatUSD(cost.loadingHauling)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Freight</span><span className="font-mono">{formatUSD(cost.freight)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Overhead ({(cost.overheadRate * 100).toFixed(1)}%)</span><span className="font-mono">{formatUSD(cost.overhead)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1 font-semibold"><span>Sub Total</span><span className="font-mono">{formatUSD(cost.subTotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Profit ({(cost.profitRate * 100).toFixed(1)}%) <span className="text-amber-600">stair-specific</span></span><span className="font-mono">{formatUSD(cost.profit)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Commission ({(cost.commissionRate * 100).toFixed(1)}%)</span><span className="font-mono">{formatUSD(cost.commission)}</span></div>
                <div className="flex justify-between border-t border-gray-300 pt-1 mt-1 text-base font-bold text-gray-900"><span>Grand Total</span><span className="font-mono">{formatUSD(cost.grandTotal)}</span></div>
                <div className="text-[10px] text-gray-400 mt-1">Total weight: {num(cost.weight, 1)} lb</div>
              </div>
            )}
          </section>

          <details open className="bg-white border border-gray-200 rounded overflow-hidden">
            <summary className="px-3 py-2 bg-gray-50 text-[10px] font-semibold uppercase text-gray-500 cursor-pointer select-none tracking-wide hover:bg-gray-100 list-none flex items-center justify-between">
              <span>Bill of Materials (Auto-Calculated)</span>
              <span className="text-gray-400 text-xs">▼</span>
            </summary>
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-1.5 px-2 text-left font-semibold text-gray-600 border-b border-gray-200">Description</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-gray-600 border-b border-gray-200">Qty</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-gray-600 border-b border-gray-200">Unit</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-gray-600 border-b border-gray-200">Length / Wt</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-gray-600 border-b border-gray-200">Unit Cost</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-gray-600 border-b border-gray-200">Extended</th>
                  </tr>
                </thead>
                <tbody>
                  {bomItems.length === 0 && (
                    <tr><td colSpan={6} className="py-3 px-3 text-center text-gray-400 text-xs">No BOM rows.</td></tr>
                  )}
                  {bomItems.map((item) => {
                    const extended = bomItemExtended(item);
                    const m = (item.measure || '').toLowerCase();
                    const isLnFt = m.includes('ln') || m.includes('linear');
                    const lengthCol = isLnFt
                      ? `${num(item.lnF, 1)} lnF`
                      : item.weight > 0
                        ? `${num(item.weight, 1)} lb`
                        : `${num(item.length, 2)} ft`;
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-1 px-2">
                          <div>{item.description}</div>
                          <div className="text-[9px] text-gray-400">{item.id} · {item.material}</div>
                        </td>
                        <td className="py-1 px-2 text-right font-mono">{Number.isInteger(item.qty) ? item.qty : item.qty.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right text-gray-500">{item.measure || 'pc'}</td>
                        <td className="py-1 px-2 text-right font-mono text-gray-600">{lengthCol}</td>
                        <td className="py-1 px-2 text-right font-mono">{formatUSD(item.costPerUnit)}</td>
                        <td className="py-1 px-2 text-right font-mono font-semibold">{formatUSD(extended)}</td>
                      </tr>
                    );
                  })}
                  {bomItems.length > 0 && (
                    <>
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="py-1.5 px-2 text-right text-gray-500 text-[10px] uppercase tracking-wide">Total weight</td>
                        <td className="py-1.5 px-2 text-right font-mono text-gray-700">{num(totalWeight, 1)} lb</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={5} className="py-1.5 px-2 text-right text-gray-600 text-xs uppercase tracking-wide">BOM Direct Total</td>
                        <td className="py-1.5 px-2 text-right font-mono">{formatUSD(bomTotal)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
