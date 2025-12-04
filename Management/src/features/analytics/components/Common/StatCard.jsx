import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * StatCard Component - Redesigned
 * Displays a single statistic with icon, value, label, and trend
 * Compact and modern with gradient backgrounds
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
  const gradientClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    pink: "from-pink-500 to-pink-600",
    cyan: "from-cyan-500 to-cyan-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

  const lightBgClasses = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    purple: "bg-purple-50 border-purple-100",
    orange: "bg-orange-50 border-orange-100",
    red: "bg-red-50 border-red-100",
    pink: "bg-pink-50 border-pink-100",
    cyan: "bg-cyan-50 border-cyan-100",
    indigo: "bg-indigo-50 border-indigo-100",
  };

  const iconColorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    red: "text-red-600",
    pink: "text-pink-600",
    cyan: "text-cyan-600",
    indigo: "text-indigo-600",
  };

  const trendClasses = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600",
  };

  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  return (
    <div className={`${lightBgClasses[color]} rounded-2xl border p-5 hover:shadow-md transition-all hover:scale-105 duration-300 cursor-pointer`}>
      {/* Header with Icon */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</h3>
        <div className={`bg-gradient-to-br ${gradientClasses[color]} p-2 rounded-xl shadow-sm`}>
          {loading ? (
            <div className="w-5 h-5 bg-white rounded-full animate-pulse" />
          ) : (
            <Icon className="w-5 h-5 text-white" />
          )}
        </div>
      </div>
      
      {/* Value */}
      <div className="mb-3">
        <p className="text-xl font-bold text-gray-900 break-words">
          {loading ? (
            <span className="inline-block w-20 h-7 bg-gray-200 rounded animate-pulse" />
          ) : (
            <>
              {value}
              {unit && <span className="text-sm ml-1 font-semibold text-gray-600">{unit}</span>}
            </>
          )}
        </p>
      </div>
      
      {/* Trend */}
      {trend && !loading && (
        <div className={`flex items-center gap-1.5 ${trendClasses[trendDirection]} text-xs font-bold`}>
          <TrendIcon className="w-4 h-4" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
