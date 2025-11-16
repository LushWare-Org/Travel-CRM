import { useEffect, useMemo, useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  AreaChartComponent,
  PieChartComponent,
  BarChartComponent,
} from "../Common";
import { DollarSign, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { analyticsAPI } from "../../../../services/api";

/**
 * BillingAnalytics Component
 * Displays revenue and billing statistics with support for multiple time ranges
 * Includes: daily, weekly, monthly, and annual metrics
 */
const BillingAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOutstanding: 0,
    totalPotentialRevenue: 0,
    pendingInvoices: 0,
  });
  const [revenueTrendData, setRevenueTrendData] = useState([]);
  const [outstandingTrendData, setOutstandingTrendData] = useState([]);
  const [paymentStatusData, setPaymentStatusData] = useState([]);
  const [invoiceBreakdownData, setInvoiceBreakdownData] = useState([]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const formatCurrency = (value) => currencyFormatter.format(value || 0);

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) {
      return current ? "100.0" : "0.0";
    }
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  const getLastTwoValues = (data, key) => {
    if (!data || data.length < 2) {
      return { current: 0, previous: 0 };
    }
    const previous = data[data.length - 2]?.[key] || 0;
    const current = data[data.length - 1]?.[key] || 0;
    return { current, previous };
  };

  useEffect(() => {
    const fetchBillingAnalytics = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await analyticsAPI.getBillingOverview({ timeRange });
        const payload = response?.data || {};
        setStats({
          totalRevenue: payload?.stats?.totalRevenue || 0,
          totalOutstanding: payload?.stats?.totalOutstanding || 0,
          totalPotentialRevenue: payload?.stats?.totalPotentialRevenue || 0,
          pendingInvoices: payload?.stats?.pendingInvoices || 0,
        });
        setRevenueTrendData(payload?.revenueTrend || []);
        setOutstandingTrendData(payload?.outstandingTrend || []);
        setPaymentStatusData(
          (payload?.paymentStatusDistribution || []).map((item) => ({
            ...item,
            name: item?.name || item?.status || "Unknown",
            value: item?.totalAmount || 0,
          }))
        );
        setInvoiceBreakdownData(payload?.invoiceCategoryBreakdown || []);
      } catch (error) {
        console.error("Failed to load billing analytics", error);
        setErrorMessage(error.message || "Failed to load billing analytics data.");
        setStats({
          totalRevenue: 0,
          totalOutstanding: 0,
          totalPotentialRevenue: 0,
          pendingInvoices: 0,
        });
        setRevenueTrendData([]);
        setOutstandingTrendData([]);
        setPaymentStatusData([]);
        setInvoiceBreakdownData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingAnalytics();
  }, [timeRange]);

  const revenueTrend = getLastTwoValues(revenueTrendData, "revenue");
  const outstandingTrend = getLastTwoValues(outstandingTrendData, "outstanding");
  const potentialRevenueTrend = getLastTwoValues(revenueTrendData, "target");
  const pendingInvoicesTrend = outstandingTrendData.length
    ? outstandingTrendData[outstandingTrendData.length - 1]?.outstanding -
      (outstandingTrendData[outstandingTrendData.length - 2]?.outstanding || 0)
    : 0;

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
          color="green"
        />
        <StatCard
          icon={Wallet}
          label="Outstanding Amount"
          value={formatCurrency(stats.totalOutstanding)}
          trend={`${calculateTrend(outstandingTrend.current, outstandingTrend.previous)}%`}
          trendDirection={outstandingTrend.current <= outstandingTrend.previous ? "down" : "up"}
          color="orange"
        />
        <StatCard
          icon={TrendingUp}
          label="Potential Revenue"
          value={formatCurrency(stats.totalPotentialRevenue)}
          trend={`${calculateTrend(potentialRevenueTrend.current, potentialRevenueTrend.previous)}%`}
          trendDirection={potentialRevenueTrend.current >= potentialRevenueTrend.previous ? "up" : "down"}
          color="purple"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending Invoices"
          value={stats.pendingInvoices}
          trend={`${pendingInvoicesTrend > 0 ? `+${pendingInvoicesTrend}` : pendingInvoicesTrend}`}
          trendDirection={pendingInvoicesTrend <= 0 ? "down" : "up"}
          color="blue"
        />
      </div>

      {/* Revenue Trend Chart */}
      <ChartContainer
        title="Revenue Trend"
        description={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} revenue comparison with targets`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            Loading revenue trend...
          </div>
        ) : revenueTrendData.length > 0 ? (
          <AreaChartComponent data={revenueTrendData} areas={revenueAreas} xAxisKey="label" height={350} />
        ) : (
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            {errorMessage || "No revenue data available for the selected range."}
          </div>
        )}
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Payment Status Overview"
          description="Paid vs Outstanding invoices"
        >
          {loading ? (
            <div className="flex items-center justify-center h-[320px] text-gray-500">
              Loading payment status data...
            </div>
          ) : paymentStatusData.some((item) => item.value > 0) ? (
            <PieChartComponent
              data={paymentStatusData}
              dataKey="value"
              nameKey="name"
              height={320}
              colors={["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"]}
              legendProps={false}
              pieProps={{
                innerRadius: 70,
                outerRadius: 110,
                cx: "45%",
                cy: "50%",
                label: ({ name, value }) => (value > 0 ? `${name}: ${formatCurrency(value)}` : ""),
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-[320px] text-gray-500">
              {errorMessage || "No payment status data available for the selected range."}
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Outstanding Amounts Trend"
          description={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} pending payments and potential revenues`}
        >
          {loading ? (
            <div className="flex items-center justify-center h-[320px] text-gray-500">
              Loading outstanding data...
            </div>
          ) : outstandingTrendData.length > 0 ? (
            <AreaChartComponent
              data={outstandingTrendData}
              areas={[
                {
                  dataKey: "outstanding",
                  fill: "#ef4444",
                  stroke: "#991b1b",
                  name: "Outstanding (₹)",
                },
                {
                  dataKey: "potentialRevenue",
                  fill: "#8b5cf6",
                  stroke: "#6d28d9",
                  name: "Potential Revenue (₹)",
                },
              ]}
              xAxisKey="label"
              height={320}
            />
          ) : (
            <div className="flex items-center justify-center h-[320px] text-gray-500">
              {errorMessage || "No outstanding data available for the selected range."}
            </div>
          )}
        </ChartContainer>
      </div>

      <ChartContainer
        title="Invoice Breakdown by Category"
        description="Revenue and invoices by service category"
      >
        {loading ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            Loading invoice breakdown...
          </div>
        ) : invoiceBreakdownData.length > 0 ? (
          <BarChartComponent
            data={invoiceBreakdownData}
            bars={[
              { dataKey: "revenue", fill: "#3b82f6", name: "Revenue" },
              { dataKey: "invoices", fill: "#10b981", name: "Invoices" },
            ]}
            xAxisKey="name"
            height={300}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            {errorMessage || "No invoice category data available for the selected range."}
          </div>
        )}
      </ChartContainer>
    </div>
  );
};

export default BillingAnalytics;
