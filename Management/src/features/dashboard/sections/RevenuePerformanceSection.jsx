import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartContainer from '../../analytics/components/Common/ChartContainer';
import { formatCompact } from '../../../utils/currency';

/**
 * Revenue Performance Section
 * Shows revenue vs target performance over time
 * Only visible to admins with manage_billing permission
 */
const RevenuePerformanceSection = ({ data }) => {
  // Extract revenue trend from analytics response
  const revenueTrend = data?.revenueTrend || [];


  // If no data, show placeholder
  if (!revenueTrend || revenueTrend.length === 0) {
    return (
      <ChartContainer
        title="Revenue Performance"
        description="Monthly revenue vs target"
        restrictedMessage="Revenue analytics available to billing administrators only"
      >
        <div className="h-80 flex items-center justify-center text-gray-500">
          <p>No revenue data available for the selected period</p>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="Revenue Performance" description="Monthly revenue vs target">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={revenueTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem'
            }}
            formatter={(value) => formatCompact(value)}
          />
          <Legend />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Actual Revenue" />
          <Bar dataKey="target" fill="#e5e7eb" radius={[8, 8, 0, 0]} name="Target" />
        </BarChart>
      </ResponsiveContainer>

      {/* Outstanding & Potential Revenue Cards */}
      {data?.outstandingTrend && data.outstandingTrend.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Latest Outstanding */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700">Total Outstanding Amount</p>
            <p className="text-2xl font-bold text-orange-900 mt-1">
              {formatCompact(data.stats.totalOutstanding)}
            </p>
            <p className="text-xs text-orange-600 mt-1">{data.stats.pendingInvoices} pending invoices</p>
          </div>

          {/* Latest Potential Revenue */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">Potential Revenue</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {formatCompact(data.stats.totalPotentialRevenue)}
            </p>
            <p className="text-xs text-green-600 mt-1">Could be collected</p>
          </div>
        </div>
      )}
    </ChartContainer>
  );
};

export default RevenuePerformanceSection;
