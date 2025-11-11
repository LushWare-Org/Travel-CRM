/**
 * Itinerary Display Component
 * Shows itinerary information in read-only format
 * Aligned with backend day-based structure
 */

const ItineraryDisplay = ({ days = [] }) => {
  if (!days || days.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
        <p className="text-gray-500 text-sm">No itinerary data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div key={day.dayNumber} className="border border-blue-200 rounded-lg overflow-hidden shadow-sm">
          {/* Day Header */}
          <div className="bg-blue-500 text-white px-6 py-3">
            <h3 className="text-lg font-semibold">
              Day {day.dayNumber}: {day.title || 'Day'}
            </h3>
          </div>

          {/* Day Content */}
          <div className="p-6 bg-blue-50 space-y-4">
            {/* Description */}
            {day.description && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{day.description}</p>
              </div>
            )}

            {/* Locations Covered */}
            {day.locations && day.locations.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Locations Covered</h4>
                <div className="flex flex-wrap gap-2">
                  {day.locations.map((location, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      📍 {location}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {day.activities && day.activities.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Activities</h4>
                <ul className="list-disc list-inside space-y-1">
                  {day.activities.map((activity, idx) => (
                    <li key={idx} className="text-gray-600 text-sm">
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meals */}
            {day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Meals Included</h4>
                <div className="flex gap-4">
                  {day.meals.breakfast && (
                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      🌅 Breakfast
                    </span>
                  )}
                  {day.meals.lunch && (
                    <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                      🍽️ Lunch
                    </span>
                  )}
                  {day.meals.dinner && (
                    <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                      🌙 Dinner
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Transport */}
            {day.transport && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Transport</h4>
                <p className="text-gray-600 text-sm capitalize bg-white px-3 py-2 rounded">
                  {day.transport}
                </p>
              </div>
            )}

            {/* Accommodation */}
            {day.accommodation && day.accommodation.name && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Accommodation</h4>
                <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                  <p className="text-gray-700 font-medium">{day.accommodation.name}</p>
                  {day.accommodation.type && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-semibold">Type:</span> {day.accommodation.type}
                    </p>
                  )}
                  {day.accommodation.rating && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-semibold">Rating:</span> ⭐ {day.accommodation.rating}/5
                    </p>
                  )}
                  {day.accommodation.address && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-semibold">Address:</span> {day.accommodation.address}
                    </p>
                  )}
                  {day.accommodation.contactNumber && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-semibold">Contact:</span> {day.accommodation.contactNumber}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Places */}
            {day.places && day.places.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Places to Visit</h4>
                <div className="space-y-3">
                  {day.places.map((place, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <p className="font-medium text-gray-700">{place.name}</p>
                      {place.description && (
                        <p className="text-gray-600 text-sm mt-1">{place.description}</p>
                      )}
                      {place.duration && (
                        <p className="text-gray-600 text-sm mt-1">
                          <span className="font-semibold">Duration:</span> {place.duration}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {day.notes && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Additional Notes</h4>
                <p className="text-gray-600 text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
                  {day.notes}
                </p>
              </div>
            )}

            {/* Day Images */}
            {day.images && day.images.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Day Images</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {day.images.map((img, idx) => {
                    const imageUrl = typeof img === 'string' ? img : img.url;
                    return (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors shadow-sm">
                        <img
                          src={imageUrl}
                          alt={`Day ${day.dayNumber} Image ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItineraryDisplay;
