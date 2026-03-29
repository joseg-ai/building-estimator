import ComponentTable from '../components/ComponentTable';
import { stairsCatalog } from '../catalog';

export default function StructuralPage() {
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Stairs & Structural</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <p className="text-sm text-gray-500 mb-4">
          Stairs, landings, guard rails, and structural support members.
        </p>
        <ComponentTable category="stairs" catalog={stairsCatalog} title="Stairs & Structural" />
      </div>
    </div>
  );
}
