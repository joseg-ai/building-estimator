import { useBuildingConfig } from '../context';
import type { LeanToDirection } from '../types';
import LeanToCard from '../components/LeanToCard';
import BuildingDiagram from '../components/BuildingDiagram';

const directions: LeanToDirection[] = ['right', 'left', 'front', 'back'];

export default function DesignPage() {
  const { config, dispatch } = useBuildingConfig();
  const { dimensions, options, insulation, sheeting, doorsWindows, accessories } = config;

  const pitch = dimensions.roofPitch;
  const rafterLength = dimensions.width > 0 ? ((dimensions.width / 2) * Math.sqrt(1 + (pitch / 12) ** 2)) : 0;
  const totalHeight = dimensions.eaveHeight + (dimensions.width / 2) * (pitch / 12);
  const floorArea = dimensions.width * dimensions.length;
  const roofArea = rafterLength * dimensions.length * 2;
  const roofWidth = rafterLength * 2;
  // Bay Spacing: D8 = number of bays, "@ X" = length per bay
  const numBays = dimensions.baySpacing;
  const bayWidth = numBays > 0 && dimensions.length > 0 ? dimensions.length / numBays : 0;
  // Girts: user-entered count; girt bays = numBays + 1 (Excel row 14: D14=4, E14=5 bays)
  const girtsDisplay = dimensions.girts;
  const girtBays = numBays + 1;
  // Purlins: user-entered count; purlin bays = purlins - 1; spacing = roofWidth / (purlins - 1)
  // Excel: roofWidth=50.18, purlins=10, purlinBays=9, spacing=50.18/9=5.58
  const purlinsDisplay = dimensions.purlins;
  const purlinBays = purlinsDisplay > 1 ? purlinsDisplay - 1 : 0;
  const purlinSpacing = purlinBays > 0 && roofWidth > 0 ? roofWidth / purlinBays : 0;

  function numInput(label: string, value: number, onChange: (v: number) => void, step = 1) {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
        <input type="number" min={0} step={step} value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
      </div>
    );
  }

  function checkbox(label: string, checked: boolean, onChange: (v: boolean) => void) {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-blue-600" />
        <span className="text-sm">{label}</span>
      </label>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-gray-900">Design Configuration</h1>
        <button onClick={() => dispatch({ type: 'RESET' })}
          className="text-xs text-red-600 hover:text-red-800 border border-red-200 rounded px-2 py-0.5">
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ---- COL 1: Building basics ---- */}
        <div className="space-y-3">
          {/* Project */}
          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Project</h2>
            <input type="text" placeholder="Project name" value={config.projectName}
              onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-1" />
            <div className="grid grid-cols-2 gap-1">
              <input type="text" placeholder="Customer" value={config.customerName}
                onChange={(e) => dispatch({ type: 'SET_CUSTOMER_NAME', payload: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
              <input type="text" placeholder="Location" value={config.jobLocation}
                onChange={(e) => dispatch({ type: 'SET_JOB_LOCATION', payload: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
          </section>

          {/* Building Size */}
          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Building Size</h2>
            <div className="grid grid-cols-3 gap-1">
              {numInput('Width', dimensions.width, (v) => dispatch({ type: 'SET_DIMENSIONS', payload: { width: v } }))}
              {numInput('Length', dimensions.length, (v) => dispatch({ type: 'SET_DIMENSIONS', payload: { length: v } }))}
              {numInput('Height', dimensions.eaveHeight, (v) => dispatch({ type: 'SET_DIMENSIONS', payload: { eaveHeight: v } }))}
              {numInput('Pitch', dimensions.roofPitch, (v) => dispatch({ type: 'SET_DIMENSIONS', payload: { roofPitch: v } }), 0.5)}
              {numInput('Bays', dimensions.baySpacing, (v) => dispatch({ type: 'SET_DIMENSIONS', payload: { baySpacing: v } }))}
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Roof</label>
                <select value={config.roofType}
                  onChange={(e) => dispatch({ type: 'SET_ROOF_TYPE', payload: e.target.value as 'gable' | 'single-slope' })}
                  className="w-full border border-gray-300 rounded px-1 py-1 text-sm bg-white">
                  <option value="gable">Gable</option>
                  <option value="single-slope">Single Slope</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {numInput('Girts', dimensions.girts, (v) => dispatch({ type: 'SET_DIMENSIONS', payload: { girts: v } }))}
              {numInput('Purlins', dimensions.purlins, (v) => dispatch({ type: 'SET_DIMENSIONS', payload: { purlins: v } }))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {checkbox('Econ End Frame', options.economicEndFrame, (v) => dispatch({ type: 'SET_OPTIONS', payload: { economicEndFrame: v } }))}
              {checkbox('Central Poles', options.centralPoles, (v) => dispatch({ type: 'SET_OPTIONS', payload: { centralPoles: v } }))}
              {checkbox('Bypass Girts', options.bypassGirts, (v) => dispatch({ type: 'SET_OPTIONS', payload: { bypassGirts: v } }))}
              {checkbox('Parapet', options.parapet, (v) => dispatch({ type: 'SET_OPTIONS', payload: { parapet: v } }))}
            </div>
            {options.parapet && (
              <div className="grid grid-cols-2 gap-1 mt-1">
                {numInput('Par. W', options.parapetWidth, (v) => dispatch({ type: 'SET_OPTIONS', payload: { parapetWidth: v } }))}
                {numInput('Par. H', options.parapetHeight, (v) => dispatch({ type: 'SET_OPTIONS', payload: { parapetHeight: v } }))}
              </div>
            )}
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] text-gray-500">
              <div>Rafter: <b className="text-gray-700">{rafterLength.toFixed(2)}</b></div>
              <div>Tot H: <b className="text-gray-700">{totalHeight.toFixed(2)}</b></div>
              <div>Floor: <b className="text-gray-700">{floorArea.toLocaleString()}</b></div>
              <div>Girts: <b className="text-gray-700">{girtsDisplay}</b> {girtBays}bay</div>
              <div>Purl: <b className="text-gray-700">{purlinsDisplay}</b> {purlinBays}b @{purlinSpacing.toFixed(2)}</div>
              {bayWidth > 0 && <div>Bay: <b className="text-gray-700">@{bayWidth.toFixed(0)}</b></div>}
            </div>
          </section>

          {/* Overhangs + Roof calcs */}
          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Overhangs</h2>
            <div className="grid grid-cols-4 gap-1">
              {(['right', 'left', 'front', 'back'] as const).map((dir) => (
                numInput(dir.charAt(0).toUpperCase() + dir.slice(1), config.overhangs[dir],
                  (v) => dispatch({ type: 'SET_OVERHANGS_DESIGN', payload: { [dir]: v } }))
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600">
              <div className="flex justify-between"><span>Roof Slope</span><b className="text-gray-800">{rafterLength.toFixed(2)}</b></div>
              <div className="flex justify-between"><span>Roof Area</span><b className="text-gray-800">{Math.round(roofArea).toLocaleString()}</b></div>
              <div className="flex justify-between"><span>Roof Width</span><b className="text-gray-800">{roofWidth.toFixed(2)}</b></div>
              <div className="flex justify-between"><span>Roof Length</span><b className="text-gray-800">{dimensions.length}</b></div>
            </div>
          </section>

          {/* Sheetings + Insulation */}
          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Sheetings</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {checkbox('Side Wall', sheeting.sideWall, (v) => dispatch({ type: 'SET_SHEETING', payload: { sideWall: v } }))}
              {checkbox('End Wall', sheeting.endWall, (v) => dispatch({ type: 'SET_SHEETING', payload: { endWall: v } }))}
              <div className="flex items-center gap-1">
                {checkbox('SW Liner', sheeting.swLinerPanel, (v) => dispatch({ type: 'SET_SHEETING', payload: { swLinerPanel: v } }))}
                {sheeting.swLinerPanel && <input type="number" min={0} value={sheeting.swLinerHeight || ''} onChange={(e) => dispatch({ type: 'SET_SHEETING', payload: { swLinerHeight: Number(e.target.value) } })} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />}
              </div>
              <div className="flex items-center gap-1">
                {checkbox('EW Liner', sheeting.ewLinerPanel, (v) => dispatch({ type: 'SET_SHEETING', payload: { ewLinerPanel: v } }))}
                {sheeting.ewLinerPanel && <input type="number" min={0} value={sheeting.ewLinerHeight || ''} onChange={(e) => dispatch({ type: 'SET_SHEETING', payload: { ewLinerHeight: Number(e.target.value) } })} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />}
              </div>
              {checkbox('Roof', sheeting.roof, (v) => dispatch({ type: 'SET_SHEETING', payload: { roof: v } }))}
              {checkbox('Soffit', sheeting.soffit, (v) => dispatch({ type: 'SET_SHEETING', payload: { soffit: v } }))}
              <div className="flex items-center gap-1">
                {checkbox('SW Skirt', sheeting.swSkirt, (v) => dispatch({ type: 'SET_SHEETING', payload: { swSkirt: v } }))}
                {sheeting.swSkirt && <input type="number" min={0} value={sheeting.swSkirtHeight || ''} onChange={(e) => dispatch({ type: 'SET_SHEETING', payload: { swSkirtHeight: Number(e.target.value) } })} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />}
              </div>
              <div className="flex items-center gap-1">
                {checkbox('EW Skirt', sheeting.ewSkirt, (v) => dispatch({ type: 'SET_SHEETING', payload: { ewSkirt: v } }))}
                {sheeting.ewSkirt && <input type="number" min={0} value={sheeting.ewSkirtHeight || ''} onChange={(e) => dispatch({ type: 'SET_SHEETING', payload: { ewSkirtHeight: Number(e.target.value) } })} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />}
              </div>
            </div>
            <h2 className="font-semibold text-gray-800 text-sm mt-3 mb-1">Insulation</h2>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {checkbox('Roof', insulation.roof, (v) => dispatch({ type: 'SET_INSULATION', payload: { roof: v } }))}
              {checkbox('Side Wall', insulation.wall, (v) => dispatch({ type: 'SET_INSULATION', payload: { wall: v } }))}
              {checkbox('End Wall', insulation.additional, (v) => dispatch({ type: 'SET_INSULATION', payload: { additional: v } }))}
            </div>
          </section>
        </div>

        {/* ---- COL 2: Doors, Windows, Accessories ---- */}
        <div className="space-y-3">
          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Doors & Windows</h2>
            <div className="text-sm space-y-0.5">
              {([
                { label: 'Door 3070', key: 'doors3070' as const },
                { label: 'Door 4070', key: 'doors4070' as const },
                { label: 'Door 6070', key: 'door6070' as const },
              ]).map(({ label, key }) => (
                <div key={key} className="flex items-center gap-1">
                  <span className="w-20 text-xs text-gray-600">{label}</span>
                  <input type="number" min={0} value={doorsWindows[key].qty || ''} onChange={(e) => dispatch({ type: 'SET_DOORS_WINDOWS', payload: { [key]: { ...doorsWindows[key], qty: Number(e.target.value) } } })} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />
                  <label className="flex items-center gap-0.5 text-[10px] text-gray-400"><input type="checkbox" checked={doorsWindows[key].includeFrame} onChange={(e) => dispatch({ type: 'SET_DOORS_WINDOWS', payload: { [key]: { ...doorsWindows[key], includeFrame: e.target.checked } } })} className="w-3 h-3" />Fr</label>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <span className="w-20 text-xs text-gray-600">Panic</span>
                <input type="number" min={0} value={doorsWindows.panicHardware || ''} onChange={(e) => dispatch({ type: 'SET_DOORS_WINDOWS', payload: { panicHardware: Number(e.target.value) } })} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-20 text-xs text-gray-600">Dead Bolt</span>
                <input type="number" min={0} value={doorsWindows.deadBolt || ''} onChange={(e) => dispatch({ type: 'SET_DOORS_WINDOWS', payload: { deadBolt: Number(e.target.value) } })} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-2 mb-0.5">Roll Up Doors</p>
            {doorsWindows.rollUpDoors.map((rd, i) => (
              <div key={i} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-8 text-[10px] text-gray-400">{i+1}</span>
                {(['qty','width','height'] as const).map((f) => (
                  <input key={f} type="number" min={0} placeholder={f[0].toUpperCase()} value={(rd as Record<string,number>)[f] || ''} onChange={(e) => { const arr = [...doorsWindows.rollUpDoors]; arr[i] = { ...arr[i], [f]: Number(e.target.value) }; dispatch({ type: 'SET_DOORS_WINDOWS', payload: { rollUpDoors: arr } }); }} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />
                ))}
              </div>
            ))}
            <p className="text-[10px] text-gray-400 font-medium mt-1.5 mb-0.5">Frame Openings</p>
            {doorsWindows.frameOpenings.map((fo, i) => (
              <div key={i} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-8 text-[10px] text-gray-400">{i+1}</span>
                {(['qty','width','height'] as const).map((f) => (
                  <input key={f} type="number" min={0} placeholder={f[0].toUpperCase()} value={(fo as Record<string,number>)[f] || ''} onChange={(e) => { const arr = [...doorsWindows.frameOpenings]; arr[i] = { ...arr[i], [f]: Number(e.target.value) }; dispatch({ type: 'SET_DOORS_WINDOWS', payload: { frameOpenings: arr } }); }} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />
                ))}
              </div>
            ))}
            <p className="text-[10px] text-gray-400 font-medium mt-1.5 mb-0.5">Windows</p>
            {([
              { label: 'Win 3030', key: 'window3030' as const },
              { label: 'Win 4030', key: 'window4030' as const },
              { label: 'Win 6030', key: 'window6030' as const },
              { label: 'Win 6040', key: 'window6040' as const },
            ]).map(({ label, key }) => (
              <div key={key} className="flex items-center gap-1 mb-0.5">
                <span className="w-20 text-xs text-gray-600">{label}</span>
                <input type="number" min={0} value={doorsWindows[key].qty || ''} onChange={(e) => dispatch({ type: 'SET_DOORS_WINDOWS', payload: { [key]: { ...doorsWindows[key], qty: Number(e.target.value) } } })} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />
                <label className="flex items-center gap-0.5 text-[10px] text-gray-400"><input type="checkbox" checked={doorsWindows[key].includeFrame} onChange={(e) => dispatch({ type: 'SET_DOORS_WINDOWS', payload: { [key]: { ...doorsWindows[key], includeFrame: e.target.checked } } })} className="w-3 h-3" />Fr</label>
              </div>
            ))}
          </section>

          {/* Accessories */}
          <section className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Accessories</h2>
            <p className="text-[10px] text-gray-400 font-medium mb-0.5">Canopies (D / W / H)</p>
            {accessories.canopies.map((c, i) => (
              <div key={i} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-8 text-[10px] text-gray-400">{i+1}</span>
                {(['depth','width','height'] as const).map((f) => (
                  <input key={f} type="number" min={0} value={c[f] || ''} onChange={(e) => { const arr = [...accessories.canopies]; arr[i] = { ...arr[i], [f]: Number(e.target.value) }; dispatch({ type: 'SET_ACCESSORIES', payload: { canopies: arr } }); }} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />
                ))}
              </div>
            ))}
            <p className="text-[10px] text-gray-400 font-medium mt-1.5 mb-0.5">HSS Canopies (D / L / H)</p>
            {accessories.hssCanopies.map((c, i) => (
              <div key={i} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-8 text-[10px] text-gray-400">{i+1}</span>
                {(['depth','width','height'] as const).map((f) => (
                  <input key={f} type="number" min={0} value={c[f] || ''} onChange={(e) => { const arr = [...accessories.hssCanopies]; arr[i] = { ...arr[i], [f]: Number(e.target.value) }; dispatch({ type: 'SET_ACCESSORIES', payload: { hssCanopies: arr } }); }} className="w-12 border border-gray-300 rounded px-1 py-0 text-xs" />
                ))}
              </div>
            ))}
            <div className="grid grid-cols-3 gap-1 mt-2">
              {numInput('Masonry', accessories.masonry, (v) => dispatch({ type: 'SET_ACCESSORIES', payload: { masonry: v } }))}
              {numInput('Ridge V.', accessories.ridgeVents, (v) => dispatch({ type: 'SET_ACCESSORIES', payload: { ridgeVents: v } }))}
              {numInput('Skylights', accessories.skylights, (v) => dispatch({ type: 'SET_ACCESSORIES', payload: { skylights: v } }))}
            </div>
          </section>
        </div>

        {/* ---- COL 3: Diagram + Lean-tos ---- */}
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded p-3">
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Building Preview</h2>
            <BuildingDiagram />
          </div>

          <section>
            <h2 className="font-semibold text-gray-800 text-sm mb-1.5">Lean-To Extensions</h2>
            <div className="space-y-2">
              {directions.map((d) => <LeanToCard key={d} direction={d} />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
