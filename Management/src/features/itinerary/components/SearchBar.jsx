/**
 * Search Bar Component
 * Provides search functionality for packages
 */

import { Search } from 'lucide-react';

const SearchBar = ({ value, onChange, placeholder = 'Search packages by name or region...' }) => {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default SearchBar;
