/**
 * Package Details Form Component
 * Handles pricing, duration, destinations, activities, accommodation, and transport
 */

import MultiSelectDropdown from '../MultiSelectDropdown';
import {
  DESTINATION_OPTIONS,
  ACTIVITY_OPTIONS,
  ACCOMMODATION_OPTIONS,
  TRANSPORT_OPTIONS,
} from '../../utils/constants';

const PackageDetails = ({ formData, nightsInput, onFormChange, onNightsChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFormChange({ ...formData, [name]: value });
  };

  const handleDestinationsChange = (values) => {
    onFormChange({ ...formData, destinations: values });
  };

  const handleActivitiesChange = (values) => {
    onFormChange({ ...formData, activities: values });
  };

  return (
    <div className="space-y-4">
      {/* Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Nights
          </label>
          <input
            type="number"
            min="1"
            value={nightsInput}
            onChange={(e) => onNightsChange(parseInt(e.target.value, 10) || 0)}
            placeholder="Number of Nights"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (Auto-filled)
          </label>
          <input
            type="text"
            value={formData.duration}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
          />
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price
        </label>
        <input
          type="text"
          name="price"
          value={formData.price}
          onChange={handleChange}
          placeholder="Price (e.g., $2,499)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Destinations */}
      <div>
        <MultiSelectDropdown
          label="Destinations"
          options={DESTINATION_OPTIONS}
          selectedValues={formData.destinations || []}
          onChange={handleDestinationsChange}
          placeholder="Select destinations..."
          allowCustom={true}
        />
      </div>

      {/* Activities */}
      <div>
        <MultiSelectDropdown
          label="Activities"
          options={ACTIVITY_OPTIONS}
          selectedValues={formData.activities || []}
          onChange={handleActivitiesChange}
          placeholder="Select activities..."
          allowCustom={true}
        />
      </div>

      {/* Accommodation and Transport */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Accommodation
          </label>
          <select
            name="accommodation"
            value={formData.accommodation}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Accommodation</option>
            {ACCOMMODATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transport
          </label>
          <select
            name="transport"
            value={formData.transport}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Transport</option>
            {TRANSPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PackageDetails;
