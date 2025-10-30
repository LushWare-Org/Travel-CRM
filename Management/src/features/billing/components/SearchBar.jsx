import React from "react";
import { Search } from "lucide-react";

/**
 * Search bar component for filtering invoices
 */
const SearchBar = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder="Search by customer name or invoice ID..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export default SearchBar;
