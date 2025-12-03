import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartContainer from '../../analytics/components/Common/ChartContainer';

/**
 * Package Distribution Section
 * Shows package destination distribution as a pie chart
 * Visible to all roles
 */
const PackageDistributionSection = ({ data }) => {
  // Extract destination distribution from analytics response
  const destinationData = data?.destinationPerformance || [];

  // Prepare data for pie chart - transform to format recharts expects
  const chartData = destinationData.map(item => ({
    name: item.destination || item.name || 'Unknown',
    value: item.inquiries || item.value || 0,
  }));

  // Colors for pie slices
  const COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];

  // Filter out entries with zero or no value
  const validChartData = chartData.filter(item => item.value > 0);

  // If no data, show placeholder
  if (!validChartData || validChartData.length === 0) {
    return (
      <ChartContainer title="Package Distribution" description="Active packages by destination">
        <div className="h-80 flex items-center justify-center text-gray-500">
          <p>No package data available</p>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="Package Distribution" description="Popular destinations by inquiries">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={validChartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {validChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default PackageDistributionSection;
