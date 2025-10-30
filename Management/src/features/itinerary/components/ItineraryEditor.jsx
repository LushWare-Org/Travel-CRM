/**
 * Itinerary Editor Component
 * Allows editing of itinerary details
 * Aligned with backend day-based structure
 */

import { Trash2, Plus } from 'lucide-react';

const ItineraryEditor = ({
  days = [],
  onDayChange,
  onAddDay,
  onRemoveDay,
}) => {
  if (!days || days.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
        <p className="text-gray-500 mb-4">No days added to itinerary</p>
        <button
          onClick={onAddDay}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} />
          Add First Day
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day, index) => (
        <div key={day.dayNumber} className="border border-gray-300 rounded-lg overflow-hidden">
          {/* Day Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center">
            <h3 className="font-semibold text-lg">Day {day.dayNumber}</h3>
            <button
              onClick={() => onRemoveDay(day.dayNumber)}
              className="p-2 hover:bg-red-500 rounded transition-colors"
              title="Remove day"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Day Content */}
          <div className="p-6 bg-gray-50 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Day Title *
              </label>
              <input
                type="text"
                value={day.title || ''}
                onChange={(e) => onDayChange(day.dayNumber, { title: e.target.value })}
                placeholder="e.g., Arrival in Dubai"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                rows="3"
                value={day.description || ''}
                onChange={(e) => onDayChange(day.dayNumber, { description: e.target.value })}
                placeholder="Detailed description of the day's activities..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Activities */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Activities (comma-separated)
              </label>
              <textarea
                rows="2"
                value={typeof day.activities === 'string' ? day.activities : (day.activities || []).join(', ')}
                onChange={(e) => onDayChange(day.dayNumber, { activities: e.target.value })}
                onBlur={(e) => {
                  // Convert to array on blur
                  const activitiesArray = e.target.value.split(',').map((a) => a.trim()).filter(Boolean);
                  onDayChange(day.dayNumber, { activities: activitiesArray });
                }}
                placeholder="Activity 1, Activity 2, Activity 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Meals */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Meals Included
              </label>
              <div className="flex gap-6">
                {['breakfast', 'lunch', 'dinner'].map((meal) => (
                  <label key={meal} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.meals?.[meal] || false}
                      onChange={(e) =>
                        onDayChange(day.dayNumber, {
                          meals: {
                            ...day.meals,
                            [meal]: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700 capitalize">{meal}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Transport */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Transport
              </label>
              <select
                value={day.transport || ''}
                onChange={(e) => onDayChange(day.dayNumber, { transport: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select transport type</option>
                <option value="flight">Flight</option>
                <option value="train">Train</option>
                <option value="bus">Bus</option>
                <option value="car">Car</option>
                <option value="boat">Boat</option>
                <option value="walk">Walk</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Accommodation */}
            <div className="border-t pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Accommodation
              </label>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  value={day.accommodation?.name || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, name: e.target.value },
                    })
                  }
                  placeholder="Hotel/Resort name"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={day.accommodation?.type || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, type: e.target.value },
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select accommodation type</option>
                  <option value="hotel">Hotel</option>
                  <option value="resort">Resort</option>
                  <option value="guesthouse">Guesthouse</option>
                  <option value="homestay">Homestay</option>
                  <option value="camp">Camp</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  value={day.accommodation?.address || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, address: e.target.value },
                    })
                  }
                  placeholder="Address"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={day.accommodation?.contactNumber || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, contactNumber: e.target.value },
                    })
                  }
                  placeholder="Contact number"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={day.accommodation?.rating || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, rating: parseFloat(e.target.value) || 0 },
                    })
                  }
                  placeholder="Rating (0-5)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                rows="2"
                value={day.notes || ''}
                onChange={(e) => onDayChange(day.dayNumber, { notes: e.target.value })}
                placeholder="Any additional notes or important information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add Day Button */}
      <button
        onClick={onAddDay}
        className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-500 hover:text-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Another Day
      </button>
    </div>
  );
};

export default ItineraryEditor;
