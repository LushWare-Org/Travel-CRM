/**
 * Activity Selector Component
 * Allows selecting from predefined activities and adding custom ones
 */

import { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { DEFAULT_ACTIVITIES, ACTIVITY_CATEGORIES } from '../utils/activities';

const ActivitySelector = ({ activities = [], onChange }) => {
  const [showSelector, setShowSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customActivity, setCustomActivity] = useState('');

  // Convert activities to array if it's a string
  const activitiesArray = Array.isArray(activities) 
    ? activities 
    : (typeof activities === 'string' ? activities.split(',').map(a => a.trim()).filter(Boolean) : []);

  // Filter activities based on category and search
  const filteredActivities = DEFAULT_ACTIVITIES.filter(activity => {
    const matchesCategory = selectedCategory === 'all' || activity.category === selectedCategory;
    const matchesSearch = activity.label.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddActivity = (activityLabel) => {
    if (!activitiesArray.includes(activityLabel)) {
      onChange([...activitiesArray, activityLabel]);
    }
  };

  const handleRemoveActivity = (activityToRemove) => {
    onChange(activitiesArray.filter(a => a !== activityToRemove));
  };

  const handleAddCustomActivity = () => {
    const trimmed = customActivity.trim();
    if (trimmed && !activitiesArray.includes(trimmed)) {
      onChange([...activitiesArray, trimmed]);
      setCustomActivity('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomActivity();
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Activities */}
      {activitiesArray.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activitiesArray.map((activity, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {activity}
              <button
                type="button"
                onClick={() => handleRemoveActivity(activity)}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Toggle Selector Button */}
      <button
        type="button"
        onClick={() => setShowSelector(!showSelector)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
      >
        <Plus size={16} />
        {showSelector ? 'Hide Activity Selector' : 'Add Activities'}
      </button>

      {/* Activity Selector Panel */}
      {showSelector && (
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
          {/* Custom Activity Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Add Custom Activity
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type custom activity name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleAddCustomActivity}
                disabled={!customActivity.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                Add
              </button>
            </div>
          </div>

          <div className="border-t border-blue-300 pt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select from Predefined Activities
            </label>

            {/* Search and Category Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search activities..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {ACTIVITY_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Activities Grid */}
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-white">
              {filteredActivities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                  {filteredActivities.map((activity) => {
                    const isSelected = activitiesArray.includes(activity.label);
                    return (
                      <button
                        key={activity.value}
                        type="button"
                        onClick={() => handleAddActivity(activity.label)}
                        disabled={isSelected}
                        className={`px-3 py-2 text-left text-sm rounded transition-colors ${
                          isSelected
                            ? 'bg-green-100 text-green-800 cursor-not-allowed'
                            : 'bg-gray-50 hover:bg-blue-100 text-gray-700'
                        }`}
                      >
                        {activity.label}
                        {isSelected && <span className="ml-2 text-xs">✓ Added</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No activities found. Try different search terms or category.
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="text-xs text-gray-600 mt-2">
              Showing {filteredActivities.length} of {DEFAULT_ACTIVITIES.length} activities
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {activitiesArray.length === 0 && !showSelector && (
        <p className="text-xs text-gray-500">
          Click "Add Activities" to select from predefined list or add custom activities
        </p>
      )}
    </div>
  );
};

export default ActivitySelector;
