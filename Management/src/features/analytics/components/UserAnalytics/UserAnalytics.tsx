import { useState, useMemo, useEffect } from 'react';
import {
  TimeRangeFilter,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from '../Common';
import { CHART_PALETTE } from '../Common/chartTheme';
import { Users, UserCheck, Shield, Download, Activity, Award } from 'lucide-react';
import { exportUserAnalyticsPDF } from '../../utils/exportAnalytics';
import toast from 'react-hot-toast';
import AnalyticsService from '../../../../services/analytics.service';
import {
  getUserGrowthByTimeRange,
  userTypeDistributionData,
} from '../../utils/userAnalyticsData';
import { StatCard } from '../../../../components/shared/StatCard';
import { Button } from '../../../../components/ui/button';

/**
 * UserAnalytics Component
 */
const UserAnalytics = () => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [salesRepPerformance, setSalesRepPerformance] = useState<any[]>([]);
  const [salesRepLoading, setSalesRepLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await AnalyticsService.getUserAnalyticsOverview(timeRange);
        setAnalyticsData(data);
      } catch (err: any) {
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
      return analyticsData.trendData.map((item: any) => ({
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

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const toastId = toast.loading('Preparing user analytics PDF...');
      const summaryMetrics = [
        { label: 'Total Users', value: analyticsData?.stats?.totalUsers || 0 },
        { label: 'Active Users', value: analyticsData?.stats?.activeUsers || 0 },
        { label: 'Users with Bookings', value: analyticsData?.stats?.usersWithBookings || 0 },
        { label: 'Conversion Rate', value: `${analyticsData?.stats?.conversionRate || 0}%` },
        { label: 'Time Range', value: timeRange.toUpperCase() },
      ];
      await exportUserAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success('User analytics PDF downloaded successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export analytics PDF');
    } finally {
      setExporting(false);
    }
  };

  const getXAxisKey = () => {
    switch (timeRange) {
      case 'weekly': return 'week';
      case 'annual': return 'year';
      default: return 'month';
    }
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'weekly': return 'Last 12 weeks';
      case 'annual': return 'Last 12 months';
      default: return 'Last 6 months';
    }
  };

  const userGrowthLines = [
    { dataKey: 'newUsers', stroke: CHART_PALETTE[0], name: 'New Users' },
    { dataKey: 'purchased', stroke: CHART_PALETTE[1], name: 'Active Users' },
    { dataKey: 'salesReps', stroke: CHART_PALETTE[2], name: 'Admin Users' },
  ];

  const salesRepBars = [
    { dataKey: 'sales', fill: CHART_PALETTE[0], name: 'Sales' },
    { dataKey: 'conversion', fill: CHART_PALETTE[1], name: 'Conversion %' },
  ];

  const stats = analyticsData?.stats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">User growth and platform activity metrics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <Button onClick={handleExportPDF} disabled={exporting || loading}>
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* User Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers || 0} subtitle={`${stats.activeUsers || 0} currently active`} color="primary" />
        <StatCard icon={Activity} label="Active" value={stats.activeUsers || 0} subtitle="With activity this period" color="success" />
        <StatCard icon={UserCheck} label="Verified" value={stats.verifiedUsers || 0} subtitle="Email confirmed" color="muted" />
        <StatCard icon={Award} label="Conversion" value={stats.conversionRate || 0} unit="%" subtitle={`${stats.usersWithBookings || 0} with bookings`} color="muted" />
      </div>

      {/* User Growth Chart - Full Width */}
      <ChartContainer
        title="User Growth Trend"
        description={`User activity metrics - ${getTimeRangeLabel()}`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
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
              <div className="animate-spin w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
            </div>
          ) : salesRepPerformance.length > 0 ? (
            <BarChartComponent
              data={salesRepPerformance}
              bars={salesRepBars}
              xAxisKey="rep"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
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
              bars={[{ dataKey: 'count', fill: CHART_PALETTE[0], name: 'Users' }]}
              xAxisKey="role"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
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
        />
      </ChartContainer>

      {/* Stats Summary Grid */}
      <div className="bg-muted/50 rounded-xl p-6 border border-border">
        <h3 className="font-heading font-semibold text-foreground mb-4">Statistics Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground mt-1">{stats.totalUsers || 0}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground mt-1">{stats.activeUsers || 0}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Conversion</p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground mt-1">{stats.conversionRate || 0}%</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Verified</p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground mt-1">{stats.verifiedUsers || 0}</p>
          </div>
        </div>
      </div>

      {/* Role Details */}
      {analyticsData?.topRoles?.length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border shadow-card">
          <h3 className="font-heading font-semibold text-foreground mb-4">Top User Roles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.topRoles.map((role: any, index: number) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground capitalize">{role.role}</span>
                </div>
                <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{role.count}</p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(role.count / stats.totalUsers) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono tabular-nums">
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
