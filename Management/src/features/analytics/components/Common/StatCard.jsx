import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * StatCard Component - Completely Redesigned
 * Unique horizontal layout with left accent border
 */
const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection = "up",
  unit = "",
  color = "blue",
  loading = false
}) => {
  const colorConfig = {
    blue: { accent: '#3b82f6', bg: 'bg-blue-500/10', text: 'text-blue-600' },
    green: { accent: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
    purple: { accent: '#8b5cf6', bg: 'bg-violet-500/10', text: 'text-violet-600' },
    orange: { accent: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-600' },
    red: { accent: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-600' },
    pink: { accent: '#ec4899', bg: 'bg-pink-500/10', text: 'text-pink-600' },
    cyan: { accent: '#06b6d4', bg: 'bg-cyan-500/10', text: 'text-cyan-600' },
    indigo: { accent: '#6366f1', bg: 'bg-indigo-500/10', text: 'text-indigo-600' },
  };

  const config = colorConfig[color] || colorConfig.blue;
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl" />
          <div className="flex-1">
            <div className="w-24 h-3 bg-slate-200 rounded mb-2" />
            <div className="w-16 h-6 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Left Accent Bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: config.accent }}
      />

      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {value}
                {unit && <span className="text-sm ml-1 font-medium text-slate-500">{unit}</span>}
              </span>
            </div>

            {/* Trend */}
            {trend && (
              <div className={`flex items-center gap-1.5 mt-2 text-xs font-semibold ${trendDirection === 'up' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                <TrendIcon className="w-3.5 h-3.5" />
                <span>{trend}</span>
              </div>
            )}
          </div>

          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
          >
            <Icon className={`w-5 h-5 ${config.text}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
