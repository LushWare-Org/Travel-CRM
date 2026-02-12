import { useEffect, useMemo, useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  AreaChartComponent,
  PieChartComponent,
  BarChartComponent,
} from "../Common";
import { DollarSign, Wallet, TrendingUp, AlertCircle, Download, CreditCard, Receipt } from "lucide-react";
import { analyticsAPI } from "../../../../services/api";
import { exportBillingAnalyticsPDF } from "../../utils/exportAnalytics";
import { exportBillingAnalyticsPDF } from "../../utils/exportAnalytics";
import toast from "react-hot-toast";
import { formatCompact, formatCurrency, getCurrencySymbol } from "../../../../utils/currency";

/**
 * BillingAnalytics Component - Redesigned
 * Modern layout with unique component structure
 */
const BillingAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  const formatShort = (value) => {
    return `${getCurrencySymbol()}${formatCompact(value)}`;
  };

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return current ? "100.0" : "0.0";
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  const getLastTwoValues = (data, key) => {
    if (!data || data.length < 2) return { current: 0, previous: 0 };
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
        setStats({ totalRevenue: 0, totalOutstanding: 0, totalPotentialRevenue: 0, pendingInvoices: 0 });
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

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const toastId = toast.loading("Preparing billing analytics PDF...");
      const summaryMetrics = [
        { label: "Total Revenue", value: formatCurrency(stats.totalRevenue) },
        { label: "Outstanding Amount", value: formatCurrency(stats.totalOutstanding) },
        { label: "Potential Revenue", value: formatCurrency(stats.totalPotentialRevenue) },
        { label: "Pending Invoices", value: stats.pendingInvoices },
        { label: "Time Range", value: timeRange.toUpperCase() },
      ];
      await exportBillingAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success("Billing analytics PDF downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export analytics PDF");
    } finally {
      setExporting(false);
    }
  };

  const revenueTrend = getLastTwoValues(revenueTrendData, "revenue");
  const outstandingTrend = getLastTwoValues(outstandingTrendData, "outstanding");
  const potentialRevenueTrend = getLastTwoValues(revenueTrendData, "target");

  const revenueAreas = [
    { dataKey: "revenue", fill: "#10b981", stroke: "#059669", name: "Revenue" },
    { dataKey: "target", fill: "#e2e8f0", stroke: "#94a3b8", name: "Target" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Billing & Revenue</h2>
          <p className="text-sm text-slate-500 mt-1">Track invoices, payments, and financial performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Revenue Summary Cards - Unique 2x2 Grid with Large Numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold">{formatShort(stats.totalRevenue)}</p>
          <p className="text-xs mt-2 opacity-70">
            {calculateTrend(revenueTrend.current, revenueTrend.previous)}% from last period
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Outstanding</span>
          </div>
          <p className="text-3xl font-bold">{formatShort(stats.totalOutstanding)}</p>
          <p className="text-xs mt-2 opacity-70">{stats.pendingInvoices} pending invoices</p>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Potential</span>
          </div>
          <p className="text-3xl font-bold">{formatShort(stats.totalPotentialRevenue)}</p>
          <p className="text-xs mt-2 opacity-70">Available to collect</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Invoices</span>
          </div>
          <p className="text-3xl font-bold">{stats.pendingInvoices}</p>
          <p className="text-xs mt-2 opacity-70">Awaiting payment</p>
        </div>
      </div>

      {/* Revenue Trend - Full Width */}
      <ChartContainer
        title="Revenue Trend"
        description={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} revenue vs targets`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[320px]">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
          </div>
        ) : revenueTrendData.length > 0 ? (
          <AreaChartComponent data={revenueTrendData} areas={revenueAreas} xAxisKey="label" height={320} />
        ) : (
          <div className="flex items-center justify-center h-[320px] text-slate-400">
            {errorMessage || "No revenue data available"}
          </div>
        )}
      </ChartContainer>

      {/* Payment Status & Outstanding - 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer
          title="Payment Status"
          description="Distribution of payment statuses"
        >
          {loading ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
            </div>
          ) : paymentStatusData.some((item) => item.value > 0) ? (
            <PieChartComponent
              data={paymentStatusData}
              dataKey="value"
              nameKey="name"
              height={280}
              colors={["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"]}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No payment status data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Outstanding Trend"
          description="Pending payments over time"
        >
          {loading ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
            </div>
          ) : outstandingTrendData.length > 0 ? (
            <AreaChartComponent
              data={outstandingTrendData}
              areas={[
                { dataKey: "outstanding", fill: "#ef4444", stroke: "#dc2626", name: "Outstanding" },
                { dataKey: "potentialRevenue", fill: "#8b5cf6", stroke: "#7c3aed", name: "Potential" },
              ]}
              xAxisKey="label"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No outstanding data available
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Invoice Breakdown - Full Width */}
      <ChartContainer
        title="Invoice Breakdown"
        description="Revenue and invoices by category"
      >
        {loading ? (
          <div className="flex items-center justify-center h-[280px]">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
          </div>
        ) : invoiceBreakdownData.length > 0 ? (
          <BarChartComponent
            data={invoiceBreakdownData}
            bars={[
              { dataKey: "revenue", fill: "#6366f1", name: "Revenue" },
              { dataKey: "invoices", fill: "#10b981", name: "Invoices" },
            ]}
            xAxisKey="name"
            height={280}
          />
        ) : (
          <div className="flex items-center justify-center h-[280px] text-slate-400">
            No invoice data available
          </div>
        )}
      </ChartContainer>
    </div>
  );
};

export default BillingAnalytics;
