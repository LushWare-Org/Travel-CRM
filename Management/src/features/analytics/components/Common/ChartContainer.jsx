import { MoreHorizontal } from "lucide-react";

/**
 * ChartContainer Component - Completely Redesigned
 * Modern card with header actions and decorative elements
 */
const ChartContainer = ({ title, description, children, className = "", actions }) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Decorative dot */}
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <div className="w-2 h-2 rounded-full bg-slate-200" />
            <div className="w-2 h-2 rounded-full bg-slate-100" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {description && (
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions ? (
          <div>{actions}</div>
        ) : (
          <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default ChartContainer;
