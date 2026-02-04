import { Clock, Calendar, BarChart2, Target } from "lucide-react";

/**
 * TimeRangeFilter Component - Completely Redesigned
 * Pill-style segmented control with icons
 */
const TimeRangeFilter = ({ selectedRange, onRangeChange }) => {
  const timeRanges = [
    { id: "daily", label: "Daily", shortLabel: "D", icon: Clock },
    { id: "weekly", label: "Weekly", shortLabel: "W", icon: Calendar },
    { id: "monthly", label: "Monthly", shortLabel: "M", icon: BarChart2 },
    { id: "annual", label: "Annual", shortLabel: "Y", icon: Target },
  ];

  return (
    <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
      {timeRanges.map((range) => {
        const Icon = range.icon;
        const isActive = selectedRange === range.id;

        return (
          <button
            key={range.id}
            onClick={() => onRangeChange(range.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">{range.label}</span>
            <span className="sm:hidden">{range.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TimeRangeFilter;
