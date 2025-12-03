import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartContainer from '../../analytics/components/Common/ChartContainer';

/**
 * User Analytics Section
 * Shows user growth trends and distribution
 * Only visible to admins (not salesReps)
 */
const UserAnalyticsSection = ({ data }) => {
  // Extract trend data from analytics response
  const userTrend = data?.trendData || [];
  const stats = data?.stats || {};

  // If no data, show placeholder
  if (!userTrend || userTrend.length === 0) {
    return (
      <ChartContainer
        title="User Analytics"
        description="User growth and distribution"
        restrictedMessage="User analytics available to administrators only"
      >
        <div className="h-80 flex items-center justify-center text-gray-500">
          <p>No user data available for the selected period</p>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="User Analytics" description="User growth and distribution">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={userTrend}>
          <defs>
            <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorActiveUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorVerifiedUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="totalNewUsers"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorNewUsers)"
            name="New Users"
          />
          <Area
            type="monotone"
            dataKey="activeUsers"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorActiveUsers)"
            name="Active Users"
          />
          <Area
            type="monotone"
            dataKey="verifiedUsers"
            stroke="#f59e0b"
            fillOpacity={1}
            fill="url(#colorVerifiedUsers)"
            name="Verified Users"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* User Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">Total Users</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalUsers || 0}</p>
          <p className="text-xs text-blue-600 mt-1">All registered users</p>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Active Users</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.activeUsers || 0}</p>
          <p className="text-xs text-green-600 mt-1">
            {stats.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% active
          </p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">Verified Users</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats.verifiedUsers || 0}</p>
          <p className="text-xs text-amber-600 mt-1">
            {stats.totalUsers ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0}% verified
          </p>
        </div>
      </div>

      {/* Conversion Metrics */}
      {stats.conversionRate !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-700">Users with Bookings</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">{stats.usersWithBookings || 0}</p>
            <p className="text-xs text-purple-600 mt-1">Users who made bookings</p>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-700">Conversion Rate</p>
            <p className="text-2xl font-bold text-indigo-900 mt-1">{(stats.conversionRate || 0).toFixed(1)}%</p>
            <p className="text-xs text-indigo-600 mt-1">Bookings / Total Users</p>
          </div>
        </div>
      )}
    </ChartContainer>
  );
};

export default UserAnalyticsSection;
