/**
 * Package Details Form Component
 * Handles pricing, duration, and max group size
 * Note: Destinations, activities, accommodation, and transport are in itinerary days
 */

const PackageDetails = ({ formData, nightsInput, onFormChange, onNightsChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFormChange({ ...formData, [name]: value });
  };

  const handlePriceChange = (e) => {
    const { value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    onFormChange({ ...formData, price: numValue });
  };

  const handleMaxGroupSizeChange = (e) => {
    const { value } = e.target;
    const numValue = value === '' ? 10 : parseInt(value, 10) || 10;
    onFormChange({ ...formData, maxGroupSize: numValue });
  };

  // Prevent scroll wheel from changing number input values
  const handleNumberInputWheel = (e) => {
    e.currentTarget.blur();
  };

  return (
    <div className="space-y-4">
      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of Nights <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1"
          value={nightsInput === '' || nightsInput === null || nightsInput === undefined ? '' : nightsInput}
          onChange={(e) => {
            const value = e.target.value;
            // Allow empty string - don't force any value while typing
            if (value === '') {
              onNightsChange('');
            } else {
              const numValue = parseInt(value, 10);
              // Only update if it's a valid number
              if (!isNaN(numValue)) {
                onNightsChange(numValue);
              }
            }
          }}
          onBlur={(e) => {
            // On blur, if empty or invalid, set to minimum 1
            const value = e.target.value;
            const numValue = parseInt(value, 10);
            if (value === '' || isNaN(numValue) || numValue < 1) {
              onNightsChange(1);
            }
          }}
          onWheel={handleNumberInputWheel}
          placeholder="Number of Nights"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Price and Max Group Size */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 font-semibold">₹</span>
            <input
              type="number"
              name="price"
              value={formData.price || ''}
              onChange={handlePriceChange}
              onWheel={handleNumberInputWheel}
              placeholder="Enter price (e.g., 2499)"
              min="0"
              step="0.01"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Enter numeric value only</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Group Size
          </label>
          <input
            type="number"
            name="maxGroupSize"
            value={formData.maxGroupSize || 10}
            onChange={handleMaxGroupSizeChange}
            onWheel={handleNumberInputWheel}
            placeholder="Max Group Size"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum number of people per group</p>
        </div>
      </div>

      {/* Package Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Package Type <span className="text-red-500">*</span>
        </label>
        <select
          name="packageType"
          value={formData.packageType || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Package Type</option>
          <option value="Standard">Standard</option>
          <option value="Deluxe">Deluxe</option>
          <option value="Luxury">Luxury</option>
          <option value="Premium">Premium</option>
        </select>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Specific destinations, activities, accommodation, and transport details 
          are added in the Day-wise Itinerary section below.
        </p>
      </div>
    </div>
  );
};

export default PackageDetails;
