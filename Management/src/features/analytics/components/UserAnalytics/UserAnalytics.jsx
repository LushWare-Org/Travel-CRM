import { useState, useMemo } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { Users, UserCheck, TrendingUp, DollarSign, AlertCircle, Loader } from "lucide-react";
import { useUserAnalytics } from "../../hooks/useUserAnalytics";

/**
 * UserAnalytics Component
 * Displays user and sales representative statistics with time range filtering
 * Fetches real data from backend API with fallback to mock data
 */
const UserAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const { loading, error, data, salesRepData, refetch } = useUserAnalytics(timeRange);

  // Use real data from API or provide default values
  const currentUserGrowthData = data?.trend || [];
  const userStats = data?.stats || {
    totalNewUsers: 0,
    totalPurchased: 0,
    conversionRate: 0,
    avgSalesReps: 0,
    usersTrend: 0,
    purchasedTrend: 0,
  };
  const salesStats = salesRepData?.stats || {
    totalSalesReps: 0,
    avgConversion: 0,
    topPerformer: 'N/A',
    topPerformerRevenue: 0,
  };

  // Sales rep performance data
  const salesRepPerformanceData = salesRepData?.performance || [];
  const revenueByRepData = (salesRepData?.performance || [])
    .sort((a, b) => b.revenue - a.revenue)
    .map((rep) => ({
      rep: rep.name,
      revenue: rep.revenue,
    }));
  const userTypeDistributionData = data?.userTypeDistribution || [];
  const userStatusDistributionData = data?.userStatusDistribution || [];
  const emailVerificationDistributionData = data?.emailVerificationDistribution || [];

  // Get x-axis key based on time range
  const getXAxisKey = () => {
    switch (timeRange) {
      case "daily":
        return "label";  // Use full label for daily (e.g., "Nov 5")
      case "weekly":
        return "label";  // Use full label for weekly (e.g., "W44 25")
      case "annual":
        return "label";  // Use full label for annual (e.g., "2025")
      case "monthly":
      default:
        return "label";  // Use full label for all (already contains formatted date)
    }
  };

  // Get time range label for display
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "daily":
        return "Last 7 days";
      case "weekly":
        return "Last 12 weeks";
      case "annual":
        return "Last 5 years";
      case "monthly":
      default:
        return "Last 6 months";
    }
  };

  // Line chart configuration
  const userGrowthLines = [
    { dataKey: "newUsers", stroke: "#3b82f6", name: "New Users" },
    { dataKey: "purchased", stroke: "#10b981", name: "Users Purchased" },
    { dataKey: "salesReps", stroke: "#f59e0b", name: "Sales Reps Active" },
  ];

  // Bar chart configuration
  const salesRepBars = [
    { dataKey: "sales", fill: "#3b82f6", name: "Sales" },
    { dataKey: "conversion", fill: "#10b981", name: "Conversion %" },
  ];

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
          <div className="text-center">
            <Loader className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      )}

      {/* Content - only show when not loading */}
      {!loading && (
        <>
          {/* Header with Time Range Filter */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">User Management Analytics</h2>
              <p className="text-gray-600 mt-1">User growth and sales performance metrics</p>
            </div>
            <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Users}
              label="New Users"
              value={userStats.totalNewUsers.toString()}
              trend={`${userStats.usersTrend > 0 ? "+" : ""}${userStats.usersTrend}%`}
              trendDirection={userStats.usersTrend >= 0 ? "up" : "down"}
              color="blue"
              subtitle={getTimeRangeLabel()}
            />
            <StatCard
              icon={UserCheck}
              label="Users Purchased"
              value={userStats.totalPurchased.toString()}
              trend={`${userStats.purchasedTrend > 0 ? "+" : ""}${userStats.purchasedTrend}%`}
              trendDirection={userStats.purchasedTrend >= 0 ? "up" : "down"}
              color="green"
              subtitle={`${userStats.conversionRate}% conversion`}
            />
            <StatCard
              icon={TrendingUp}
              label="Successful Sales"
              value={salesStats.totalSalesReps?.toString() || "0"}
              trend={`Avg: ${salesStats.avgConversion}%`}
              trendDirection="up"
              color="purple"
              subtitle="Conversion Rate"
            />
            <StatCard
              icon={DollarSign}
              label="Revenue/Rep Avg"
              value={`$${(salesStats.topPerformerRevenue / 1000).toFixed(1)}k`}
              trend={`Top: ${salesStats.topPerformer}`}
              trendDirection="up"
              unit="USD"
              color="orange"
              subtitle={`$${(salesStats.topPerformerRevenue / 1000).toFixed(0)}k`}
            />
          </div>

          {/* User Growth Trend Chart */}
          {currentUserGrowthData.length > 0 && (
            <ChartContainer
              title="User Growth Trend"
              description={`New users, purchases, and sales rep activity - ${getTimeRangeLabel()}`}
            >
              <LineChartComponent
                data={currentUserGrowthData}
                lines={userGrowthLines}
                xAxisKey={getXAxisKey()}
                height={350}
              />
            </ChartContainer>
          )}

          {/* Additional breakdown charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {salesRepPerformanceData.length > 0 && (
              <ChartContainer
                title="Sales Rep Performance"
                description="Sales count and conversion rates by representative"
              >
                <BarChartComponent
                  data={salesRepPerformanceData}
                  bars={salesRepBars}
                  xAxisKey="rep"
                  height={320}
                  margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
                />
              </ChartContainer>
            )}

            {revenueByRepData.length > 0 && (
              <ChartContainer
                title="Revenue by Sales Rep"
                description="Revenue earned by each representative"
              >
                <BarChartComponent
                  data={revenueByRepData}
                  bars={[{ dataKey: "revenue", fill: "#8b5cf6", name: "Revenue" }]}
                  xAxisKey="rep"
                  height={320}
                  margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
                />
              </ChartContainer>
            )}
          </div>

          {userTypeDistributionData.length > 0 && (
            <ChartContainer
              title="User Type Distribution"
              description="Breakdown of users by role (Customers, Sales Reps, Vendors, Admins)"
            >
              <PieChartComponent
                data={userTypeDistributionData}
                dataKey="value"
                nameKey="name"
                height={300}
                colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]}
              />
            </ChartContainer>
          )}

          {/* Additional Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {userStatusDistributionData.length > 0 && (
              <ChartContainer
                title="User Status Distribution"
                description="Active vs Inactive users across all roles"
              >
                <PieChartComponent
                  data={userStatusDistributionData}
                  dataKey="value"
                  nameKey="status"
                  height={300}
                  colors={["#10b981", "#ef4444"]}
                />
              </ChartContainer>
            )}

            {emailVerificationDistributionData.length > 0 && (
              <ChartContainer
                title="Email Verification Status"
                description="Users with verified and unverified email addresses"
              >
                <PieChartComponent
                  data={emailVerificationDistributionData}
                  dataKey="value"
                  nameKey="status"
                  height={300}
                  colors={["#3b82f6", "#9ca3af"]}
                />
              </ChartContainer>
            )}
          </div>

          {/* Summary Stats Section */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Summary ({getTimeRangeLabel()})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-600">Total New Users</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.totalNewUsers}</p>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.totalPurchased}</p>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.conversionRate}%</p>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-600">Avg Sales Reps</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.avgSalesReps}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserAnalytics;
