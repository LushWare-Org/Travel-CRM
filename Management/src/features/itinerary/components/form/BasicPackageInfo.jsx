/**
 * Basic Package Info Form Component
 * Handles package name, description, category, destination, highlights, inclusions, and exclusions
 */

import { CATEGORY_OPTIONS } from '../../utils/constants';

const BasicPackageInfo = ({ formData, onChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  const handleArrayFieldChange = (name, value) => {
    // Store as string while typing, convert to array on blur
    onChange({ ...formData, [name]: value });
  };

  const handleArrayFieldBlur = (name, value) => {
    // Convert comma-separated string to array when field loses focus
    const arrayValue = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    onChange({ ...formData, [name]: arrayValue });
  };

  const getArrayFieldValue = (fieldName) => {
    const value = formData[fieldName];
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || '';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Package Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="Package Name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          placeholder="Package Description"
          value={formData.description || ''}
          onChange={handleChange}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Category</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="destination"
            value={formData.destination || ''}
            onChange={handleChange}
            placeholder="e.g., Delhi, Agra, Jaipur"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Highlights */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Highlights
        </label>
        <textarea
          name="highlights"
          placeholder="Enter highlights separated by commas (e.g., Free WiFi, Breakfast included, City tour)"
          value={getArrayFieldValue('highlights')}
          onChange={(e) => handleArrayFieldChange('highlights', e.target.value)}
          onBlur={(e) => handleArrayFieldBlur('highlights', e.target.value)}
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Separate each highlight with a comma</p>
      </div>

      {/* Inclusions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Inclusions
        </label>
        <textarea
          name="inclusions"
          placeholder="What's included (e.g., Hotel accommodation, All meals, Tour guide)"
          value={getArrayFieldValue('inclusions')}
          onChange={(e) => handleArrayFieldChange('inclusions', e.target.value)}
          onBlur={(e) => handleArrayFieldBlur('inclusions', e.target.value)}
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Separate each inclusion with a comma</p>
      </div>

      {/* Exclusions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Exclusions
        </label>
        <textarea
          name="exclusions"
          placeholder="What's not included (e.g., Flight tickets, Personal expenses, Travel insurance)"
          value={getArrayFieldValue('exclusions')}
          onChange={(e) => handleArrayFieldChange('exclusions', e.target.value)}
          onBlur={(e) => handleArrayFieldBlur('exclusions', e.target.value)}
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Separate each exclusion with a comma</p>
      </div>
    </div>
  );
};

export default BasicPackageInfo;
