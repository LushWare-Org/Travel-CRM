import React from 'react';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';

const StatsCard = ({ 
  label, 
  value, 
  icon: Icon = Users, 
  color = 'blue',
  trend = null,
  subtitle = null
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700'
  };

  const iconClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 border border-opacity-20`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-opacity-70">{label}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs mt-1 text-opacity-70">{subtitle}</p>}
        </div>
        <div className={`${iconClasses[color]} p-2 rounded-lg`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
