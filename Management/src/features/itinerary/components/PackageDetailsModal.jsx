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
              <p className="text-sm text-gray-900 mt-1 capitalize">{pkg.category || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Destination</label>
              <p className="text-sm text-gray-900 mt-1">{pkg.destination || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Duration</label>
              <p className="text-sm text-gray-900 mt-1">{pkg.duration ? `${pkg.duration} days` : 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Price</label>
              <p className="text-sm font-bold text-blue-600 mt-1">
                ${typeof pkg.price === 'number' ? pkg.price.toFixed(2) : pkg.price || 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Max Group Size</label>
              <p className="text-sm text-gray-900 mt-1">{pkg.maxGroupSize || 10}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Difficulty</label>
              <p className="text-sm text-gray-900 mt-1 capitalize">{pkg.difficulty || 'N/A'}</p>
            </div>
          </div>

          {/* Highlights */}
          {pkg.highlights && pkg.highlights.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Highlights
              </label>
              <div className="space-y-1">
                {pkg.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inclusions */}
          {pkg.inclusions && pkg.inclusions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Inclusions
              </label>
              <div className="space-y-1">
                {pkg.inclusions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exclusions */}
          {pkg.exclusions && pkg.exclusions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Exclusions
              </label>
              <div className="space-y-1">
                {pkg.exclusions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-500">✗</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          {pkg.images && pkg.images.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Images
              </label>
              <div className="flex space-x-2 mt-2 flex-wrap gap-2">
                {pkg.images.map((image, index) => {
                  // Handle both string URLs and image objects
                  const imageUrl = typeof image === 'string' ? image : image.url;
                  return (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`Package Image ${index}`}
                      className="w-24 h-24 object-cover rounded"
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Itinerary */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">
              Day-wise Itinerary
            </label>
            {/* Check for days in multiple possible locations */}
            {(() => {
              const days = pkg.days || pkg.itinerary?.days || [];
              return Array.isArray(days) && days.length > 0 ? (
                <ItineraryDisplay days={days} />
              ) : (
                <p className="text-sm text-gray-600">No itinerary specified</p>
              );
            })()}
          </div>

          {/* Rating and Reviews */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{pkg.rating || 0}</span>
              <span className="text-sm text-gray-600">({pkg.numReviews || 0} reviews)</span>
            </div>
            <p className="text-sm text-gray-600">Bookings: {pkg.bookings || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetailsModal;
