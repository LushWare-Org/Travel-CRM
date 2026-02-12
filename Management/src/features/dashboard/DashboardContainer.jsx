import { useState, useEffect } from 'react';
import { usePermission } from '../../contexts/PermissionContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import AnalyticsService from '../../services/analytics.service';
import {
  Calendar, TrendingUp, Users, DollarSign, Activity, Briefcase,
  Eye, ArrowUpRight, ArrowDownRight, RefreshCw, Clock, Target,
  BarChart3, Zap, ChevronRight, Layers, PieChart as PieChartIcon
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, Legend
} from 'recharts';

import { formatCompact } from '../../utils/currency';

// ============================================
// UNIQUE LOADING STATE
// ============================================
const LoadingState = () => (
  <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <div className="relative w-24 h-24">
      <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping opacity-20" />
      <div className="absolute inset-2 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      <div className="absolute inset-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
        <Layers className="w-8 h-8 text-white" />
      </div>
    </div>
    <p className="mt-8 text-slate-700 font-semibold text-lg">Preparing Dashboard</p>
    <div className="flex gap-1 mt-2">
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// ============================================
// UNIQUE METRIC TILE - HORIZONTAL LAYOUT
// ============================================
const MetricTile = ({ title, value, trend, description, icon: Icon, colorScheme, isLarge }) => {
  const schemes = {
    blue: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    emerald: { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    violet: { bg: 'from-violet-500 to-violet-600', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
    amber: { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    indigo: { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    cyan: { bg: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  };

  const colors = schemes[colorScheme] || schemes.blue;
  const isPositive = trend?.startsWith('+');

  return (
    <div className={`group relative bg-white rounded-2xl border ${colors.border} p-5 hover:shadow-xl transition-all duration-300 overflow-hidden ${isLarge ? 'col-span-2' : ''}`}>
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
        <Icon className="w-full h-full" />
      </div>

      <div className="relative flex items-start gap-4">
        {/* Icon Container - Left Side Vertical Bar Style */}
        <div className={`w-1.5 h-16 rounded-full bg-gradient-to-b ${colors.bg}`} />

        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${colors.light} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <span className="text-sm font-medium text-slate-500">{title}</span>
            </div>
            {trend && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend}
              </div>
            )}
          </div>

          {/* Value Row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
              <p className="text-xs text-slate-400 mt-1">{description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// UNIQUE CHART WRAPPER - CARD WITH TABS
// ============================================
const ChartPanel = ({ title, subtitle, icon: Icon, children, actions, height = 320 }) => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div>{actions}</div>}
    </div>
    <div className="p-6" style={{ height }}>
      {children}
    </div>
  </div>
);

// ============================================
// UNIQUE TIME SELECTOR - SEGMENTED CONTROL
// ============================================
const TimeSelector = ({ selected, onChange }) => {
  const options = [
    { id: 'daily', label: 'Day' },
    { id: 'weekly', label: 'Week' },
    { id: 'monthly', label: 'Month' },
    { id: 'annual', label: 'Year' },
  ];

  return (
    <div className="inline-flex bg-slate-100 rounded-xl p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selected === opt.id
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ============================================
// LEAD FUNNEL - AREA CHART STYLE
// ============================================
const LeadFunnelChart = ({ data }) => {
  const trendData = data?.trend || [];

  if (!trendData.length) {
    return <div className="h-full flex items-center justify-center text-slate-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={trendData}>
        <defs>
          <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}
        />
        <Area type="monotone" dataKey="new" stroke="#3b82f6" strokeWidth={2} fill="url(#colorNew)" name="New Leads" />
        <Area type="monotone" dataKey="converted" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorConverted)" name="Converted" />
        <Line type="monotone" dataKey="contacted" stroke="#10b981" strokeWidth={2} dot={false} name="Contacted" />
        <Line type="monotone" dataKey="interested" stroke="#f59e0b" strokeWidth={2} dot={false} name="Interested" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ============================================
// PACKAGE DISTRIBUTION - RADIAL BAR CHART
// ============================================
const PackageRadialChart = ({ data }) => {
  const destinationData = data?.destinationPerformance || [];
  const chartData = destinationData.slice(0, 5).map((item, idx) => ({
    name: item.destination || item.name || 'Unknown',
    value: item.inquiries || item.value || 0,
    fill: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx],
  })).filter(item => item.value > 0);

  if (!chartData.length) {
    return <div className="h-full flex items-center justify-center text-slate-400">No data available</div>;
  }

  return (
    <div className="h-full flex">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="30%"
            outerRadius="90%"
            data={chartData}
            startAngle={180}
            endAngle={-180}
          >
            <RadialBar
              minAngle={15}
              background
              clockWise
              dataKey="value"
              cornerRadius={10}
            />
            <Tooltip />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="w-32 flex flex-col justify-center gap-2">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-xs text-slate-600 truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// REVENUE CHART - VERTICAL BARS WITH GRADIENT
// ============================================
const RevenueBarChart = ({ data }) => {
  const revenueTrend = data?.revenueTrend || [];

  if (!revenueTrend.length) {
    return <div className="h-full flex items-center justify-center text-slate-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={revenueTrend} barGap={8}>
        <defs>
          <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
        <Tooltip
          formatter={(value) => formatCompact(value)}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
          }}
        />
        <Bar dataKey="revenue" fill="url(#revenueBar)" radius={[6, 6, 0, 0]} name="Revenue" />
        <Bar dataKey="target" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Target" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// ============================================
// REVENUE SUMMARY CARDS
// ============================================
const RevenueSummaryCards = ({ data }) => {
  if (!data?.stats) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
        <p className="text-xs opacity-80">Outstanding</p>
        <p className="text-2xl font-bold mt-1">{formatCompact(data.stats.totalOutstanding)}</p>
        <p className="text-xs opacity-70 mt-1">{data.stats.pendingInvoices} invoices pending</p>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
        <p className="text-xs opacity-80">Potential Revenue</p>
        <p className="text-2xl font-bold mt-1">{formatCompact(data.stats.totalPotentialRevenue)}</p>
        <p className="text-xs opacity-70 mt-1">Available to collect</p>
      </div>
    </div>
  );
};

// ============================================
// USER ANALYTICS - PROGRESS BARS
// ============================================
const UserAnalyticsPanel = ({ data }) => {
  const userStats = data?.stats || {};
  const roleDistribution = data?.roleDistribution || [];

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-slate-50 rounded-xl">
          <p className="text-3xl font-bold text-slate-800">{userStats.totalUsers || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Total Users</p>
        </div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl">
          <p className="text-3xl font-bold text-emerald-600">{userStats.activeUsers || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Active</p>
        </div>
        <div className="text-center p-4 bg-rose-50 rounded-xl">
          <p className="text-3xl font-bold text-rose-600">{userStats.inactiveUsers || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Inactive</p>
        </div>
      </div>

      {roleDistribution.length > 0 && (
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-3">Role Distribution</p>
          <div className="space-y-3">
            {roleDistribution.map((role, idx) => {
              const percentage = Math.round((role.count / (userStats.totalUsers || 1)) * 100);
              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 capitalize">{role.role}</span>
                    <span className="text-slate-400">{role.count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// SALES REP PERFORMANCE - UNIQUE CARDS
// ============================================
const SalesRepDashboard = ({ data }) => {
  if (!data) return null;
  const performance = data?.performance || {};

  return (
    <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Your Performance</h3>
          <p className="text-xs text-amber-600">Personal metrics for this period</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Leads Assigned', value: performance.leadsAssigned || 0, color: 'from-blue-400 to-blue-600' },
          { label: 'Converted', value: performance.converted || 0, color: 'from-emerald-400 to-emerald-600' },
          { label: 'Pending', value: performance.pending || 0, color: 'from-amber-400 to-amber-600' },
          { label: 'Conversion Rate', value: performance.conversionRate || '0%', color: 'from-violet-400 to-violet-600' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 shadow-sm">
            <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${item.color} mb-3`} />
            <p className="text-2xl font-bold text-slate-800">{item.value}</p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN DASHBOARD CONTAINER
// ============================================
const DashboardContainer = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermission();

  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [leadData, setLeadData] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [packageData, setPackageData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [salesRepData, setSalesRepData] = useState(null);

  const canViewBilling = hasPermission('manage_billing') || user?.role === 'superAdmin';
  const canViewUsers = (hasPermission('view_reports') || user?.role === 'superAdmin') && user?.role !== 'salesRep';
  const isSalesRep = user?.role === 'salesRep';

  const fetchData = async () => {
    setLoading(!refreshing);
    setError(null);

    try {
      const requests = [
        AnalyticsService.getLeadAnalyticsOverview(timeRange).then(d => setLeadData(d)).catch(() => { }),
        AnalyticsService.getPackageAnalyticsOverview(timeRange).then(d => setPackageData(d)).catch(() => { }),
      ];

      if (canViewBilling) {
        requests.push(AnalyticsService.getBillingAnalyticsOverview(timeRange).then(d => setBillingData(d)).catch(() => { }));
      }
      if (canViewUsers) {
        requests.push(AnalyticsService.getUserAnalyticsOverview(timeRange).then(d => setUserData(d)).catch(() => { }));
      }
      if (isSalesRep) {
        requests.push(AnalyticsService.getSalesRepPerformance(timeRange).then(d => setSalesRepData(d)).catch(() => { }));
      }

      await Promise.all(requests);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [timeRange, canViewBilling, canViewUsers, isSalesRep]);

  if (loading && !refreshing) return <LoadingState />;

  // Build metrics
  const leadStats = leadData?.stats || {};
  const billingStats = billingData?.stats || {};
  const userStats = userData?.stats || {};
  const packageStats = packageData?.stats || {};

  const metrics = [
    { title: 'Total Leads', value: leadStats.totalLeads || '0', trend: '+12%', description: 'All leads in pipeline', icon: Activity, colorScheme: 'blue' },
    { title: 'Active Packages', value: packageStats.totalItineraries || '0', trend: '+5%', description: 'Available packages', icon: Briefcase, colorScheme: 'emerald' },
  ];

  if (billingData) {
    metrics.push(
      { title: 'Monthly Revenue', value: formatCompact(billingStats.totalRevenue), trend: '+23%', description: 'Paid invoices', icon: DollarSign, colorScheme: 'violet' },
      { title: 'Outstanding', value: formatCompact(billingStats.totalOutstanding), trend: '-15%', description: 'Pending payments', icon: Eye, colorScheme: 'amber' },
    );
  }

  if (userData && !isSalesRep) {
    metrics.push(
      { title: 'Total Users', value: userStats.totalUsers || '0', trend: '+8%', description: 'Registered users', icon: Users, colorScheme: 'indigo' },
      { title: 'Active Users', value: userStats.activeUsers || '0', trend: '+12%', description: 'Active this period', icon: TrendingUp, colorScheme: 'cyan' },
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500">Welcome back, <span className="font-semibold text-slate-700">{user?.name || 'User'}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setRefreshing(true); fetchData(); }}
              disabled={refreshing}
              className={`p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all ${refreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <TimeSelector selected={timeRange} onChange={setTimeRange} />
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-8">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            {error} <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Sales Rep Dashboard */}
        {isSalesRep && <SalesRepDashboard data={salesRepData} />}

        {/* Metrics Grid - 3 columns layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {metrics.map((metric, idx) => (
            <MetricTile key={idx} {...metric} />
          ))}
        </div>

        {/* Charts Row 1 - Lead Funnel (wide) + Package Distribution */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3">
            <ChartPanel title="Lead Pipeline Trends" subtitle="New leads vs conversions over time" icon={TrendingUp} height={300}>
              <LeadFunnelChart data={leadData} />
            </ChartPanel>
          </div>
          <div className="xl:col-span-2">
            <ChartPanel title="Destination Popularity" subtitle="Top destinations by inquiries" icon={PieChartIcon} height={300}>
              <PackageRadialChart data={packageData} />
            </ChartPanel>
          </div>
        </div>

        {/* Charts Row 2 - Revenue Performance (for billing admins) */}
        {canViewBilling && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ChartPanel title="Revenue Performance" subtitle="Monthly revenue vs targets" icon={DollarSign} height={280}>
                <RevenueBarChart data={billingData} />
              </ChartPanel>
            </div>
            <div className="flex flex-col justify-center">
              <RevenueSummaryCards data={billingData} />
            </div>
          </div>
        )}

        {/* Charts Row 3 - User Analytics (for admins) */}
        {canViewUsers && (
          <ChartPanel title="User Analytics" subtitle="Platform user metrics and distribution" icon={Users} height={280}>
            <UserAnalyticsPanel data={userData} />
          </ChartPanel>
        )}
      </div>
    </div>
  );
};

export default DashboardContainer;
