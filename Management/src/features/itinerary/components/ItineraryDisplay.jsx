/**
 * Itinerary Display Component
 * Shows itinerary information in read-only format
 */

import { getSortedMiddleDayKeys } from '../utils/helpers';
import { ITINERARY_LABELS } from '../utils/constants';

const ItineraryDisplay = ({ itinerary, itineraryTitles }) => {
  return (
    <div className="space-y-3">
      {/* Arrival Day */}
      <div className="border p-4 rounded-md bg-blue-100">
        <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">
          {ITINERARY_LABELS.ARRIVAL_DAY}
        </h4>
        <p className="font-bold mt-2">
          {itineraryTitles.first_day || ITINERARY_LABELS.ARRIVAL_DAY}
        </p>
        <p className="text-sm text-gray-600 mt-1">{itinerary.first_day}</p>
      </div>

      {/* Middle Days */}
      {getSortedMiddleDayKeys(itinerary.middle_days || {}).map((dayKey) => (
        <div key={dayKey} className="border p-4 rounded-md bg-blue-100">
          <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">
            {`Day ${dayKey.split('_')[1]}`}
          </h4>
          <p className="font-bold mt-2">
            {itineraryTitles.middle_days?.[dayKey] || `Day ${dayKey.split('_')[1]}`}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {itinerary.middle_days?.[dayKey]}
          </p>
        </div>
      ))}

      {/* Departure Day */}
      <div className="border p-4 rounded-md bg-blue-100">
        <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">
          {ITINERARY_LABELS.DEPARTURE_DAY}
        </h4>
        <p className="font-bold mt-2">
          {itineraryTitles.last_day || ITINERARY_LABELS.DEPARTURE_DAY}
        </p>
        <p className="text-sm text-gray-600 mt-1">{itinerary.last_day}</p>
      </div>
    </div>
  );
};

export default ItineraryDisplay;
