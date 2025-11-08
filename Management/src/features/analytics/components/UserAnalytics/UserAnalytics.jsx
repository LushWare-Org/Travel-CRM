import { useState, useMemo } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { Users, UserCheck, TrendingUp, DollarSign } from "lucide-react";
import {
  getUserGrowthByTimeRange,
  getAggregatedUserStats,
  getSalesRepStats,
  salesRepPerformanceData,
  revenueByRepData,
  userTypeDistributionData,
} from "../../utils/userAnalyticsData";

/**
 * UserAnalytics Component
 * Displays user and sales representative statistics with time range filtering
 */
const UserAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  // Compute data based on selected time range
  const currentUserGrowthData = useMemo(() => getUserGrowthByTimeRange(timeRange), [timeRange]);
  const userStats = useMemo(() => getAggregatedUserStats(timeRange), [timeRange]);
  const salesStats = useMemo(() => getSalesRepStats(timeRange), [timeRange]);

  // Get x-axis key based on time range
  const getXAxisKey = () => {
    switch (timeRange) {
      case "weekly":
        return "week";
      case "yearly":
        return "year";
      case "monthly":
      default:
        return "month";
    }
  };

  // Get time range label for display
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "weekly":
        return "Last 12 weeks";
      case "yearly":
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
          value={salesStats.totalSales.toString()}
          trend={`Avg: ${salesStats.avgConversion}%`}
          trendDirection="up"
          color="purple"
          subtitle="Conversion Rate"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue/Rep Avg"
          value={`$${(salesStats.avgRevenuePerRep / 1000).toFixed(1)}k`}
          trend={`Top: ${salesStats.topPerformer}`}
          trendDirection="up"
          unit="USD"
          color="orange"
          subtitle={`$${(salesStats.topPerformerRevenue / 1000).toFixed(0)}k`}
        />
      </div>

      {/* User Growth Trend Chart */}
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

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

      <ChartContainer
        title="User Type Distribution"
        description="Breakdown of website users, registered users, and converted users"
      >
        <PieChartComponent
          data={userTypeDistributionData}
          dataKey="value"
          nameKey="name"
          height={300}
          colors={["#3b82f6", "#10b981", "#f59e0b"]}
        />
      </ChartContainer>

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
    </div>
  );
};

export default UserAnalytics;
