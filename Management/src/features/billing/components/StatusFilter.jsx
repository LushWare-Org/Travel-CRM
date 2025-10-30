import React from "react";

/**
 * Status filter component for filtering by status
 */
const StatusFilter = ({ filterStatus, setFilterStatus, statusOptions = [] }) => {
  // Provide default status options if none are passed
  const defaultOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
  ];

  const options = statusOptions.length > 0 ? statusOptions : defaultOptions;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setFilterStatus(option.value)}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-sm ${
            filterStatus === option.value
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default StatusFilter;
