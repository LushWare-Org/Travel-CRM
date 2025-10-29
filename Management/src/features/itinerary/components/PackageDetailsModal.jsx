/**
 * Package Details Modal Component
 * Displays detailed information about a package
 */

import { Star } from 'lucide-react';
import ItineraryDisplay from './ItineraryDisplay';

const PackageDetailsModal = ({ pkg, onClose }) => {
  if (!pkg) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{pkg.name}</h2>
            <p className="text-gray-600 mt-1">{pkg.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-2xl"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <p className="text-sm text-gray-900 mt-1">{pkg.category}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Region</label>
              <p className="text-sm text-gray-900 mt-1">{pkg.region}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Duration</label>
              <p className="text-sm text-gray-900 mt-1">{pkg.duration}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Price</label>
              <p className="text-sm font-bold text-blue-600 mt-1">{pkg.price}</p>
            </div>
          </div>

          {/* Destinations */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Destinations
            </label>
            <div className="flex gap-2 flex-wrap">
              {pkg.destinations.map((dest, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"
                >
                  {dest}
                </span>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Activities
            </label>
            <div className="grid grid-cols-2 gap-2">
              {pkg.activities.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  {activity}
                </div>
              ))}
            </div>
          </div>

          {/* Images */}
          {pkg.images && pkg.images.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Images
              </label>
              <div className="flex space-x-2 mt-2 flex-wrap gap-2">
                {pkg.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Package Image ${index}`}
                    className="w-24 h-24 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Itinerary */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">
              Day-wise Itinerary
            </label>
            <ItineraryDisplay
              itinerary={pkg.itinerary}
              itineraryTitles={pkg.itineraryTitles}
            />
          </div>

          {/* Rating and Reviews */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{pkg.rating}</span>
              <span className="text-sm text-gray-600">({pkg.reviews} reviews)</span>
            </div>
            <p className="text-sm text-gray-600">Bookings: {pkg.bookings}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetailsModal;
