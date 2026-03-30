import FramingTable from '../components/FramingTable';
import { mainFramingCatalog, canopyCatalog, platesCatalog, frameOpeningsCatalog } from '../catalog';

export default function FramingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Main Framing</h1>
      <p className="text-sm text-gray-500">
        Enter Qty and Length for each member. Select a material from the dropdown to auto-calculate weight and cost.
      </p>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <FramingTable category="main-framing" catalog={mainFramingCatalog} title="Building Structure" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <FramingTable category="canopy" catalog={canopyCatalog} title="Canopy & Parapets" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <FramingTable category="plates" catalog={platesCatalog} title="Plates" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <FramingTable category="frame-openings" catalog={frameOpeningsCatalog} title="Frame Openings" />
      </div>
    </div>
  );
}
