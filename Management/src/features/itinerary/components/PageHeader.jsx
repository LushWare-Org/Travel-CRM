/**
 * Page Header Component
 * Displays the page title, description, and action buttons
 */

import { Plus } from 'lucide-react';

const PageHeader = ({ onNewPackage }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm z-10">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Itinerary Generation</h1>
            <p className="text-gray-600 mt-1">
              Create and manage travel packages and itineraries
            </p>
          </div>
        </div>
        <button
          onClick={onNewPackage}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2"
          aria-label="Create new package"
        >
          <Plus className="w-4 h-4" />
          New Package
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
