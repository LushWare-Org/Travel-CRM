import { useState } from "react";
import { Calendar } from "lucide-react";

/**
 * TimeRangeFilter Component
 * Allows users to select analysis period: Daily, Weekly, Monthly, Annual
 */
const TimeRangeFilter = ({ selectedRange, onRangeChange }) => {
  const timeRanges = [
    { id: "daily", label: "Daily", value: "daily" },
    { id: "weekly", label: "Weekly", value: "weekly" },
    { id: "monthly", label: "Monthly", value: "monthly" },
    { id: "annual", label: "Annual", value: "annual" },
  ];

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
      <Calendar className="w-4 h-4 text-gray-600 ml-2" />
      <div className="flex gap-1">
        {timeRanges.map((range) => (
          <button
            key={range.id}
            onClick={() => onRangeChange(range.value)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              selectedRange === range.value
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeRangeFilter;
