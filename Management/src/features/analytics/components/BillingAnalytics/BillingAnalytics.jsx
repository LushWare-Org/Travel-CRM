import { useState, useMemo } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  AreaChartComponent,
  PieChartComponent,
  BarChartComponent,
} from "../Common";
import { DollarSign, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import {
  getRevenueData,
  getOutstandingData,
  getAggregatedStats,
  paymentStatusData,
  invoiceBreakdownData,
} from "../../utils/billingAnalyticsData";

/**
 * BillingAnalytics Component
 * Displays revenue and billing statistics with support for multiple time ranges
 * Includes: daily, weekly, monthly, and annual metrics
 */
const BillingAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  // Compute data based on selected time range
  const currentRevenueData = useMemo(() => getRevenueData(timeRange), [timeRange]);
  const currentOutstandingData = useMemo(() => getOutstandingData(timeRange), [timeRange]);
  const stats = useMemo(() => getAggregatedStats(timeRange), [timeRange]);

  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate trend percentages
  const calculateTrend = (current, previous) => {
    if (!previous) return 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  // Get current and previous values for trend calculation
  const getLastTwoValues = (data, key) => {
    if (data.length < 2) return { current: 0, previous: 0 };
    const previous = data[data.length - 2][key] || 0;
    const current = data[data.length - 1][key] || 0;
    return { current, previous };
  };

  const revenueTrend = getLastTwoValues(currentRevenueData, "revenue");
  const outstandingTrend = getLastTwoValues(currentOutstandingData, "outstanding");
  const potentialRevenueTrend = getLastTwoValues(currentRevenueData, "potentialRevenue");
  const pendingLeadsTrend = getLastTwoValues(currentOutstandingData, "pendingLeads");

  // Area chart configuration
  const revenueAreas = [
    {
      dataKey: "revenue",
      fill: "#3b82f6",
      stroke: "#1e40af",
      name: "Actual Revenue",
    },
    { dataKey: "target", fill: "#e5e7eb", stroke: "#9ca3af", name: "Target" },
  ];

  // Bar chart configuration
  const invoiceBars = [
    { dataKey: "revenue", fill: "#3b82f6", name: "Revenue" },
    { dataKey: "invoices", fill: "#10b981", name: "Invoices" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Billing & Invoicing Analytics</h2>
          <p className="text-gray-600 mt-1">Revenue and payment tracking</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          trend={`${calculateTrend(revenueTrend.current, revenueTrend.previous)}%`}
          trendDirection={revenueTrend.current >= revenueTrend.previous ? "up" : "down"}
          unit="USD"
          color="green"
        />
        <StatCard
          icon={Wallet}
          label="Outstanding Amount"
          value={formatCurrency(stats.totalOutstanding)}
          trend={`${calculateTrend(outstandingTrend.current, outstandingTrend.previous)}%`}
          trendDirection={outstandingTrend.current <= outstandingTrend.previous ? "down" : "up"}
          unit="USD"
          color="orange"
        />
        <StatCard
          icon={TrendingUp}
          label="Potential Revenue"
          value={formatCurrency(stats.totalPotentialRevenue)}
          trend={`${calculateTrend(potentialRevenueTrend.current, potentialRevenueTrend.previous)}%`}
          trendDirection={potentialRevenueTrend.current >= potentialRevenueTrend.previous ? "up" : "down"}
          unit="USD"
          color="purple"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending Invoices"
          value={stats.pendingInvoices}
          trend={`${pendingLeadsTrend.current - pendingLeadsTrend.previous}`}
          trendDirection={pendingLeadsTrend.current <= pendingLeadsTrend.previous ? "down" : "up"}
          color="blue"
        />
      </div>

      {/* Revenue Trend Chart */}
      <ChartContainer
        title="Revenue Trend"
        description={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} revenue comparison with targets`}
      >
        <AreaChartComponent
          data={currentRevenueData}
          areas={revenueAreas}
          xAxisKey={timeRange === "annual" ? "year" : timeRange === "daily" ? "label" : "month"}
          height={350}
        />
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Payment Status Overview"
          description="Paid vs Outstanding invoices"
        >
          <PieChartComponent
            data={paymentStatusData}
            dataKey="value"
            nameKey="name"
            height={320}
            colors={["#10b981", "#f59e0b", "#ef4444"]}
          />
        </ChartContainer>

        <ChartContainer
          title="Outstanding Amounts Trend"
          description={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} pending payments and potential revenues`}
        >
          <AreaChartComponent
            data={currentOutstandingData}
            areas={[
              {
                dataKey: "outstanding",
                fill: "#ef4444",
                stroke: "#991b1b",
                name: "Outstanding ($)",
              },
              {
                dataKey: "potentialRevenue",
                fill: "#8b5cf6",
                stroke: "#6d28d9",
                name: "Potential Revenue ($)",
              },
            ]}
            xAxisKey={timeRange === "annual" ? "year" : timeRange === "daily" ? "label" : "month"}
            height={320}
          />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Invoice Breakdown by Category"
        description="Revenue and invoices by service category"
      >
        <BarChartComponent
          data={invoiceBreakdownData}
          bars={invoiceBars}
          xAxisKey="category"
          height={300}
          margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
        />
      </ChartContainer>
    </div>
  );
};

export default BillingAnalytics;
