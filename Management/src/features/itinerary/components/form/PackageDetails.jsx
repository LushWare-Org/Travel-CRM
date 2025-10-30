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

  return (
    <div className="space-y-4">
      {/* Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Nights <span className="text-red-500">*</span>
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

      {/* Price and Max Group Size */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="price"
            value={formData.price || ''}
            onChange={handlePriceChange}
            placeholder="Enter price (e.g., 2499)"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Enter numeric value only (no currency symbols)</p>
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
            placeholder="Max Group Size"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum number of people per group</p>
        </div>
      </div>

      {/* Difficulty Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Difficulty Level
        </label>
        <select
          name="difficulty"
          value={formData.difficulty || 'moderate'}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="difficult">Difficult</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Select the difficulty level of this tour</p>
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
