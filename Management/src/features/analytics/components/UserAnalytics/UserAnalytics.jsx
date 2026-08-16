import { useState, useMemo, useEffect } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { Users, UserCheck, TrendingUp, Shield, Download, Activity, Award } from "lucide-react";
import { exportUserAnalyticsPDF } from "../../utils/exportAnalytics";
import toast from "react-hot-toast";
import AnalyticsService from "../../../../services/analytics.service";
import {
  getUserGrowthByTimeRange,
  getAggregatedUserStats,
  userTypeDistributionData,
} from "../../utils/userAnalyticsData";

/**
 * UserAnalytics Component - Redesigned
 * Modern layout with unique component structure
 */
const UserAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [salesRepPerformance, setSalesRepPerformance] = useState([]);
  const [salesRepLoading, setSalesRepLoading] = useState(true);

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
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange]);

  useEffect(() => {
    const fetchSalesRepPerformance = async () => {
      try {
        setSalesRepLoading(true);
        const data = await AnalyticsService.getAllSalesRepsPerformance(timeRange);
        setSalesRepPerformance(data || []);
      } catch (err) {
        console.error('Error fetching sales rep performance:', err);
        setSalesRepPerformance([]);
      } finally {
        setSalesRepLoading(false);
      }
    };
    fetchSalesRepPerformance();
  }, [timeRange]);

  const currentUserGrowthData = useMemo(() => {
    if (analyticsData?.trendData) {
      return analyticsData.trendData.map(item => ({
        ...item,
        month: item.label,
        week: item.label,
        year: item.label,
        newUsers: item.totalNewUsers,
        purchased: item.activeUsers,
        salesReps: item.adminUsers,
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
      };
    }
    return getAggregatedUserStats(timeRange);
  }, [analyticsData, timeRange]);

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
      await exportUserAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success("User analytics PDF downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export analytics PDF");
    } finally {
      setExporting(false);
    }
  };

  const getXAxisKey = () => {
    switch (timeRange) {
      case "weekly": return "week";
      case "annual": return "year";
      default: return "month";
    }
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "weekly": return "Last 12 weeks";
      case "annual": return "Last 12 months";
      default: return "Last 6 months";
    }
  };

  const userGrowthLines = [
    { dataKey: "newUsers", stroke: "#6366f1", name: "New Users" },
    { dataKey: "purchased", stroke: "#10b981", name: "Active Users" },
    { dataKey: "salesReps", stroke: "#f59e0b", name: "Admin Users" },
  ];

  const salesRepBars = [
    { dataKey: "sales", fill: "#6366f1", name: "Sales" },
    { dataKey: "conversion", fill: "#10b981", name: "Conversion %" },
  ];

  const stats = analyticsData?.stats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500 mt-1">User growth and platform activity metrics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-500/25"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* User Summary - Modern Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Total Users</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalUsers || 0}</p>
          <p className="text-xs mt-2 opacity-70">{stats.activeUsers || 0} currently active</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Active</span>
          </div>
          <p className="text-3xl font-bold">{stats.activeUsers || 0}</p>
          <p className="text-xs mt-2 opacity-70">With activity this period</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Verified</span>
          </div>
          <p className="text-3xl font-bold">{stats.verifiedUsers || 0}</p>
          <p className="text-xs mt-2 opacity-70">Email confirmed</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Conversion</span>
          </div>
          <p className="text-3xl font-bold">{stats.conversionRate || 0}%</p>
          <p className="text-xs mt-2 opacity-70">{stats.usersWithBookings || 0} with bookings</p>
        </div>
      </div>

      {/* User Growth Chart - Full Width */}
      <ChartContainer
        title="User Growth Trend"
        description={`User activity metrics - ${getTimeRangeLabel()}`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full" />
          </div>
        ) : (
          <LineChartComponent
            data={currentUserGrowthData}
            lines={userGrowthLines}
            xAxisKey={getXAxisKey()}
            height={300}
          />
        )}
      </ChartContainer>

      {/* Distribution Charts - 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer
          title="Sales Rep Performance"
          description="Sales and conversion by representative"
        >
          {salesRepLoading ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="animate-spin w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full" />
            </div>
          ) : salesRepPerformance.length > 0 ? (
            <BarChartComponent
              data={salesRepPerformance}
              bars={salesRepBars}
              xAxisKey="rep"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No sales rep data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Role Distribution"
          description="Users by role"
        >
          {analyticsData?.roleDistribution?.length > 0 ? (
            <BarChartComponent
              data={analyticsData.roleDistribution}
              bars={[{ dataKey: "count", fill: "#8b5cf6", name: "Users" }]}
              xAxisKey="role"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No role data available
            </div>
          )}
        </ChartContainer>
      </div>

      {/* User Status Distribution */}
      <ChartContainer
        title="User Status Distribution"
        description="Status breakdown of platform users"
      >
        <PieChartComponent
          data={analyticsData?.userStatusDistribution || userTypeDistributionData}
          dataKey="value"
          nameKey="name"
          height={280}
          colors={["#6366f1", "#10b981", "#f59e0b", "#ef4444"]}
        />
      </ChartContainer>

      {/* Stats Summary Grid */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-4">Statistics Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalUsers || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.activeUsers || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Conversion</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.conversionRate || 0}%</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Verified</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.verifiedUsers || 0}</p>
          </div>
        </div>
      </div>

      {/* Role Details */}
      {analyticsData?.topRoles?.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">Top User Roles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.topRoles.map((role, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-violet-500" />
                  <span className="text-sm text-slate-600 capitalize">{role.role}</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{role.count}</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    style={{ width: `${(role.count / stats.totalUsers) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {((role.count / stats.totalUsers) * 100).toFixed(1)}% of total
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
