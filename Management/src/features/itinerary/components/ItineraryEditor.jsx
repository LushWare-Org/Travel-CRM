/**
 * Itinerary Editor Component
 * Allows editing of itinerary details
 */

import { Trash2 } from 'lucide-react';
import { getSortedMiddleDayKeys } from '../utils/helpers';
import { ITINERARY_LABELS } from '../utils/constants';

const ItineraryEditor = ({
  itinerary,
  itineraryTitles,
  onItineraryChange,
  onTitleChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Arrival Day */}
      <div className="border p-4 rounded-md bg-blue-100">
        <span className="bg-blue-500 text-white px-6 py-2 rounded-lg">
          {ITINERARY_LABELS.ARRIVAL_DAY}
        </span>
        <input
          type="text"
          value={itineraryTitles.first_day || ''}
          onChange={(e) => onTitleChange(e, 'first_day', null)}
          placeholder="Title for Arrival Day"
          className="mt-2 p-2 w-full border border-gray-300 rounded-md"
        />
        <textarea
          rows="2"
          value={itinerary.first_day || ''}
          onChange={(e) => onItineraryChange(e, 'first_day', null)}
          placeholder="Activities for Arrival Day"
          className="mt-2 p-2 w-full border border-gray-300 rounded-md"
        />
      </div>

      {/* Middle Days */}
      {getSortedMiddleDayKeys(itinerary.middle_days || {}).map((dayKey) => (
        <div key={dayKey} className="border p-4 rounded-md bg-blue-100">
          <span className="bg-blue-500 text-white px-6 py-2 rounded-lg">
            {`Day ${dayKey.split('_')[1]}`}
          </span>
          <input
            type="text"
            value={itineraryTitles.middle_days?.[dayKey] || ''}
            onChange={(e) => onTitleChange(e, 'middle_days', dayKey)}
            placeholder={`Title for Day ${dayKey.split('_')[1]}`}
            className="mt-2 p-2 w-full border border-gray-300 rounded-md"
          />
          <textarea
            rows="2"
            value={itinerary.middle_days?.[dayKey] || ''}
            onChange={(e) => onItineraryChange(e, 'middle_days', dayKey)}
            placeholder={`Activities for Day ${dayKey.split('_')[1]}`}
            className="mt-2 p-2 w-full border border-gray-300 rounded-md"
          />
        </div>
      ))}

      {/* Departure Day */}
      <div className="border p-4 rounded-md bg-blue-100">
        <span className="bg-blue-500 text-white px-6 py-2 rounded-lg">
          {ITINERARY_LABELS.DEPARTURE_DAY}
        </span>
        <input
          type="text"
          value={itineraryTitles.last_day || ''}
          onChange={(e) => onTitleChange(e, 'last_day', null)}
          placeholder="Title for Departure Day"
          className="mt-2 p-2 w-full border border-gray-300 rounded-md"
        />
        <textarea
          rows="2"
          value={itinerary.last_day || ''}
          onChange={(e) => onItineraryChange(e, 'last_day', null)}
          placeholder="Activities for Departure Day"
          className="mt-2 p-2 w-full border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
};

export default ItineraryEditor;
