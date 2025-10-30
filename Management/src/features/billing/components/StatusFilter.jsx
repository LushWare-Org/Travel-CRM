import React from "react";
import { FILTER_STATUS_OPTIONS } from "../utils/constants";

/**
 * Status filter component for filtering invoices by status
 */
const StatusFilter = ({ filterStatus, onFilterChange, invoices }) => {
  const getStatusCount = (status) => {
    if (status === "all") return invoices.length;
    return invoices.filter((i) => i.status === status).length;
  };

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {FILTER_STATUS_OPTIONS.map((status) => (
        <button
          key={status}
          onClick={() => onFilterChange(status)}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            filterStatus === status
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {status === "all"
            ? "All Invoices"
            : status.charAt(0).toUpperCase() + status.slice(1)}
          <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
            {getStatusCount(status)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default StatusFilter;
