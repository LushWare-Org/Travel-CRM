import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * StatCard Component
 * Displays a single statistic with icon, value, label, and trend
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
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    pink: "bg-pink-500",
  };

  const trendClasses = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600",
  };

  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-600">{label}</h3>
        <div className={`${colorClasses[color]} p-2 rounded-lg`}>
          {loading ? (
            <div className="w-5 h-5 bg-white rounded-full animate-pulse" />
          ) : (
            <Icon className="w-5 h-5 text-white" />
          )}
        </div>
      </div>
      
      <div className="mb-3">
        <p className="text-2xl font-bold text-gray-900">
          {loading ? (
            <span className="inline-block w-16 h-8 bg-gray-200 rounded animate-pulse" />
          ) : (
            <>
              {value}
              {unit && <span className="text-lg ml-1">{unit}</span>}
            </>
          )}
        </p>
      </div>
      
      {trend && !loading && (
        <div className={`flex items-center gap-1 ${trendClasses[trendDirection]}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-xs font-semibold">{trend}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
