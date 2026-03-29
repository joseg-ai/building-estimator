import ComponentTable from '../components/ComponentTable';
import {
  purlinsGirtsCatalog, baseRakeAnglesCatalog, sheetingCatalog,
  roofTrimCatalog, wallTrimCatalog, doorsWindowsCatalog, hardwareCatalog
} from '../catalog';

export default function ComponentsPage() {
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Components</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="purlins-girts" catalog={purlinsGirtsCatalog} title="Purlins & Girts" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="base-rake-angles" catalog={baseRakeAnglesCatalog} title="Base / Rake Angles" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="roof-wall-sheeting" catalog={sheetingCatalog} title="Roof & Wall Sheeting" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="roof-trim" catalog={roofTrimCatalog} title="Roof Trim" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="wall-trim" catalog={wallTrimCatalog} title="Wall Trim" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="doors-windows" catalog={doorsWindowsCatalog} title="Doors & Windows" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="standard-hardware" catalog={hardwareCatalog} title="Standard Hardware" />
      </div>
    </div>
  );
}
