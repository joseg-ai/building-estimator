import ComponentTable from '../components/ComponentTable';
import { mainFramingCatalog, canopyCatalog, platesCatalog, frameOpeningsCatalog } from '../catalog';

export default function FramingPage() {
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Main Framing</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="main-framing" catalog={mainFramingCatalog} title="Building Structure" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="canopy" catalog={canopyCatalog} title="Canopy & Parapets" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="plates" catalog={platesCatalog} title="Plates" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <ComponentTable category="frame-openings" catalog={frameOpeningsCatalog} title="Frame Openings" />
      </div>
    </div>
  );
}
