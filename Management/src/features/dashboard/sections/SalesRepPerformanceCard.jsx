import { TrendingUp, Target, Award } from 'lucide-react';
import { getCurrencySymbol } from '../../../utils/currency.js';

/**
 * Sales Rep Personal Performance Card
 * Shows personal KPIs for sales representatives
 * Only visible when logged in as a sales rep
 */
const SalesRepPerformanceCard = ({ data }) => {
  // Default values if data is loading or not available
  const stats = data?.stats || {};

  const assignedLeads = stats.totalAssignedLeads || 0;
  const convertedLeads = stats.totalConvertedLeads || 0;
  const conversionRate = stats.conversionRate || 0;
  const estimatedEarnings = stats.estimatedEarnings || 0;
  const commissionRate = stats.commissionRate || 5;

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Performance</h2>
          <p className="text-blue-100 text-sm mt-1">Current month metrics</p>
        </div>
        <Award className="w-12 h-12 text-blue-100" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Assigned Leads */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 border border-white border-opacity-20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm font-medium">Assigned Leads</p>
            <Target className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-3xl font-bold text-white">{assignedLeads}</p>
          <p className="text-blue-100 text-xs mt-2">In your pipeline</p>
        </div>

        {/* Converted Leads */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 border border-white border-opacity-20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm font-medium">Converted</p>
            <TrendingUp className="w-4 h-4 text-green-200" />
          </div>
          <p className="text-3xl font-bold text-white">{convertedLeads}</p>
          <p className="text-blue-100 text-xs mt-2">Closed deals</p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 border border-white border-opacity-20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm font-medium">Conversion Rate</p>
            <span className="text-green-200 text-sm font-bold">↑</span>
          </div>
          <p className="text-3xl font-bold text-white">{conversionRate}%</p>
          <p className="text-blue-100 text-xs mt-2">Close ratio</p>
        </div>

        {/* Commission Earnings */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 border border-white border-opacity-20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm font-medium">Est. Earnings</p>
            <span className="text-yellow-200 text-sm font-bold">{getCurrencySymbol()}</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {(estimatedEarnings / 1000).toFixed(0)}K
          </p>
          <p className="text-blue-100 text-xs mt-2">{commissionRate}% commission</p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 pt-6 border-t border-white border-opacity-20 flex items-center justify-between">
        <p className="text-blue-100 text-sm">
          Great work! Keep up the momentum to reach your targets.
        </p>
        <button className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm">
          View Assigned Leads
        </button>
      </div>
    </div>
  );
};

export default SalesRepPerformanceCard;
