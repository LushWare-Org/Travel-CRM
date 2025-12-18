import { useState, useMemo, useEffect } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { Users, UserCheck, TrendingUp, DollarSign, Download } from "lucide-react";
import { exportUserAnalyticsPDF } from "../../utils/exportAnalytics";
import toast from "react-hot-toast";
import AnalyticsService from "../../../../services/analytics.service";
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
 * Fetches real data from backend API
 */
const UserAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch analytics data from backend
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await AnalyticsService.getUserAnalyticsOverview(timeRange);
        setAnalyticsData(data);
      } catch (err) {
        console.error('Error fetching user analytics:', err);
        setError(err.message || 'Failed to fetch analytics data');
        // Fallback to mock data
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  // Compute data based on selected time range
  const currentUserGrowthData = useMemo(() => {
    if (analyticsData?.trendData) {
      return analyticsData.trendData.map(item => ({
        ...item,
        month: item.label,
        week: item.label,
        year: item.label,
        newUsers: item.totalNewUsers,
        purchased: item.activeUsers, // Using activeUsers as proxy for "purchased"
        salesReps: item.adminUsers, // Using adminUsers for sales rep count
      }));
    }
    return getUserGrowthByTimeRange(timeRange);
  }, [analyticsData, timeRange]);

  const userStats = useMemo(() => {
    if (analyticsData?.stats) {
      const { stats } = analyticsData;
      const totalNewUsers = analyticsData.trendData
        ? analyticsData.trendData.reduce((sum, item) => sum + item.totalNewUsers, 0)
        : stats.totalUsers;
      
      return {
        totalNewUsers,
        totalPurchased: stats.usersWithBookings || 0,
        avgSalesReps: 0,
        conversionRate: parseFloat(stats.conversionRate) || 0,
        usersTrend: 0,
        purchasedTrend: 0,
        lastPeriodNewUsers: 0,
        lastPeriodPurchased: 0,
      };
    }
    return getAggregatedUserStats(timeRange);
  }, [analyticsData, timeRange]);

  const salesStats = useMemo(() => {
    return getSalesRepStats(timeRange);
  }, [timeRange]);

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const toastId = toast.loading("Preparing user analytics PDF...");

      const summaryMetrics = [
        { label: "Total Users", value: analyticsData?.stats?.totalUsers || 0 },
        { label: "Active Users", value: analyticsData?.stats?.activeUsers || 0 },
        { label: "Users with Bookings", value: analyticsData?.stats?.usersWithBookings || 0 },
        { label: "Conversion Rate", value: `${analyticsData?.stats?.conversionRate || 0}%` },
        { label: "Time Range", value: timeRange.toUpperCase() },
      ];

      await exportUserAnalyticsPDF({
        timeRange,
        summaryMetrics,
      });

      toast.dismiss(toastId);
      toast.success("User analytics PDF downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export analytics PDF");
    } finally {
      setExporting(false);
    }
  };

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

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Management Analytics</h2>
            <p className="text-gray-600 mt-1">User growth and sales performance metrics</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading analytics data...</div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    console.warn('Analytics API error, falling back to mock data:', error);
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management Analytics</h2>
          <p className="text-gray-600 mt-1">User growth and sales performance metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            <Download size={18} />
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Users"
          value={analyticsData?.stats?.totalUsers?.toString() || "0"}
          trend={`${userStats.usersTrend > 0 ? "+" : ""}${userStats.usersTrend}%`}
          trendDirection={userStats.usersTrend >= 0 ? "up" : "down"}
          color="blue"
          subtitle={`${analyticsData?.stats?.activeUsers || 0} Active`}
        />
        <StatCard
          icon={UserCheck}
          label="Users with Bookings"
          value={analyticsData?.stats?.usersWithBookings?.toString() || "0"}
          trend={`${userStats.purchasedTrend > 0 ? "+" : ""}${userStats.purchasedTrend}%`}
          trendDirection={userStats.purchasedTrend >= 0 ? "up" : "down"}
          color="green"
          subtitle={`${analyticsData?.stats?.conversionRate || 0}% conversion`}
        />
        <StatCard
          icon={TrendingUp}
          label="Verified Users"
          value={analyticsData?.stats?.verifiedUsers?.toString() || "0"}
          trend={`+${analyticsData?.stats?.verifiedUsers || 0}`}
          trendDirection="up"
          color="purple"
          subtitle="Email Verified"
        />
        <StatCard
          icon={DollarSign}
          label="User Roles"
          value={analyticsData?.roleDistribution?.length?.toString() || "4"}
          trend={`Total: ${analyticsData?.stats?.totalUsers || 0}`}
          trendDirection="up"
          unit="Roles"
          color="orange"
          subtitle="Active Roles"
        />
      </div>

      {/* User Growth Trend Chart */}
      <ChartContainer
        title="User Growth Trend"
        description={`New users and activity metrics - ${getTimeRangeLabel()}`}
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
          title="User Distribution by Role"
          description="Breakdown of users by role"
        >
          <BarChartComponent
            data={analyticsData?.roleDistribution || []}
            bars={[{ dataKey: "count", fill: "#8b5cf6", name: "Count" }]}
            xAxisKey="role"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>
      </div>

      {/* User Status Distribution Pie Chart */}
      <ChartContainer
        title="User Status Distribution"
        description="Website users, registered users, and converted users"
      >
        <PieChartComponent
          data={analyticsData?.userStatusDistribution || userTypeDistributionData}
          dataKey="value"
          nameKey="name"
          height={300}
          colors={["#3b82f6", "#10b981", "#f59e0b"]}
        />
      </ChartContainer>

      {/* Summary Stats Section */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics Summary ({getTimeRangeLabel()})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded border border-gray-200">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{analyticsData?.stats?.totalUsers || 0}</p>
          </div>
          <div className="bg-white p-4 rounded border border-gray-200">
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-2xl font-bold text-gray-900">{analyticsData?.stats?.activeUsers || 0}</p>
          </div>
          <div className="bg-white p-4 rounded border border-gray-200">
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{analyticsData?.stats?.conversionRate || 0}%</p>
          </div>
          <div className="bg-white p-4 rounded border border-gray-200">
            <p className="text-sm text-gray-600">Verified Users</p>
            <p className="text-2xl font-bold text-gray-900">{analyticsData?.stats?.verifiedUsers || 0}</p>
          </div>
        </div>
      </div>

      {/* Role Details Section */}
      {analyticsData?.topRoles && analyticsData.topRoles.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top User Roles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.topRoles.map((role, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-sm text-gray-600 capitalize">{role.role}</p>
                <p className="text-2xl font-bold text-gray-900">{role.count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((role.count / analyticsData.stats.totalUsers) * 100).toFixed(1)}% of total
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAnalytics;
