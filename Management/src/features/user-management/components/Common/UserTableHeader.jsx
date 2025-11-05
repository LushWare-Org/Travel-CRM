import React from 'react';
import { Search, Filter, X } from 'lucide-react';

const UserTableHeader = ({ 
  searchTerm, 
  onSearchChange, 
  onFilterClick,
  filterCount = 0,
  title,
  subtitle
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6 rounded-lg shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <button
          onClick={onFilterClick}
          className={`px-4 py-2 border rounded-lg font-medium flex items-center gap-2 transition-colors ${
            filterCount > 0
              ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {filterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
              {filterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default UserTableHeader;
