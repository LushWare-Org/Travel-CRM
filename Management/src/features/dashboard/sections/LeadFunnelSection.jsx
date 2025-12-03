import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartContainer from '../../analytics/components/Common/ChartContainer';

/**
 * Lead Funnel Section
 * Shows lead progression through sales pipeline over time
 * Visible to all roles
 */
const LeadFunnelSection = ({ data }) => {
  // Extract trend data from analytics response
  const trendData = data?.trend || [];

  // If no data, show placeholder
  if (!trendData || trendData.length === 0) {
    return (
      <ChartContainer title="Lead Conversion Funnel" description="Monthly lead progression through sales stages">
        <div className="h-80 flex items-center justify-center text-gray-500">
          <p>No lead data available for the selected period</p>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="Lead Conversion Funnel" description="Monthly lead progression through sales stages">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="new"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6' }}
            name="New Leads"
          />
          <Line
            type="monotone"
            dataKey="contacted"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981' }}
            name="Contacted"
          />
          <Line
            type="monotone"
            dataKey="interested"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b' }}
            name="Interested"
          />
          <Line
            type="monotone"
            dataKey="converted"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6' }}
            name="Converted"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default LeadFunnelSection;
