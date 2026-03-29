import ComponentTable from '../components/ComponentTable';
import { anchorBoltsCatalog, boltsCatalog, cableBracingCatalog, fastenerItemsCatalog } from '../catalog';

export default function FastenersPage() {
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Fasteners & Bolts</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="anchor-bolts" catalog={anchorBoltsCatalog} title="Anchor Bolts" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="bolts" catalog={boltsCatalog} title="Bolts" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="cable-bracing" catalog={cableBracingCatalog} title="Cable Bracing" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="fasteners" catalog={fastenerItemsCatalog} title="Fasteners" />
      </div>
    </div>
  );
}
