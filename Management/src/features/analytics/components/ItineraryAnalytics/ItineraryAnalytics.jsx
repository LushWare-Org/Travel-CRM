import { useState, useEffect } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
} from "../Common";
import { MapPin, ShoppingCart, TrendingUp, Download, Briefcase, Globe, Star } from "lucide-react";
import AnalyticsService from "../../../../services/analytics.service";
import { exportPackageAnalyticsPDF } from "../../utils/exportAnalytics";
import toast from "react-hot-toast";

/**
 * PackageAnalytics Component - Redesigned
 * Modern layout for package performance metrics
 */
const PackageAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  const packageLines = [
    { dataKey: "inquiries", stroke: "#f59e0b", name: "Inquiries" },
    { dataKey: "conversions", stroke: "#10b981", name: "Conversions" },
  ];

  const destinationBars = [
    { dataKey: "inquiries", fill: "#f59e0b", name: "Inquiries" },
    { dataKey: "conversions", fill: "#10b981", name: "Conversions" },
  ];

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await AnalyticsService.getPackageAnalyticsOverview(timeRange);
        setAnalyticsData(data);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError(err.message);
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, [timeRange]);

  const data = analyticsData || {
    stats: { totalItineraries: 0, totalInquiries: 0, totalConversions: 0 },
    trend: [],
    mostInquired: [],
    destinationPerformance: [],
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const toastId = toast.loading("Preparing package analytics PDF...");
      const summaryMetrics = [
        { label: "Published Packages", value: data.stats.totalItineraries },
        { label: "Lead Inquiries", value: data.stats.totalInquiries },
        { label: "Conversions", value: data.stats.totalConversions },
        { label: "Time Range", value: timeRange.toUpperCase() },
      ];
      await exportPackageAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success("Package analytics PDF downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export analytics PDF");
    } finally {
      setExporting(false);
    }
  };

  const conversionRate = data.stats.totalInquiries > 0
    ? ((data.stats.totalConversions / data.stats.totalInquiries) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Package Performance</h2>
          <p className="text-sm text-slate-500 mt-1">Track inquiries and conversions for published packages</p>
          {error && <p className="text-sm text-rose-500 mt-1">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-amber-500/25"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Packages</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.totalItineraries}</p>
          <p className="text-xs mt-2 opacity-70">Published & active</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Inquiries</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.totalInquiries}</p>
          <p className="text-xs mt-2 opacity-70">Leads generated</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Conversions</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.totalConversions}</p>
          <p className="text-xs mt-2 opacity-70">Bookings made</p>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Conversion Rate</span>
          </div>
          <p className="text-3xl font-bold">{conversionRate}%</p>
          <p className="text-xs mt-2 opacity-70">Inquiry to booking</p>
        </div>
      </div>

      {/* Trend Chart - Full Width */}
      <ChartContainer
        title="Inquiry & Conversion Trends"
        description={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} performance trends`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full" />
          </div>
        ) : data.trend.length > 0 ? (
          <LineChartComponent
            data={data.trend}
            lines={packageLines}
            xAxisKey="month"
            height={300}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-400">
            No trend data available
          </div>
        )}
      </ChartContainer>

      {/* Destination Performance - Full Width */}
      <ChartContainer
        title="Destination Performance"
        description="Inquiries and conversions by destination"
      >
        {loading ? (
          <div className="flex items-center justify-center h-[320px]">
            <div className="animate-spin w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full" />
          </div>
        ) : data.destinationPerformance.length > 0 ? (
          <BarChartComponent
            data={data.destinationPerformance}
            bars={destinationBars}
            xAxisKey="destination"
            height={320}
          />
        ) : (
          <div className="flex items-center justify-center h-[320px] text-slate-400">
            No destination data available
          </div>
        )}
      </ChartContainer>

      {/* Top Packages */}
      <ChartContainer
        title="Top Packages"
        description="Most inquired and converted packages"
      >
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full" />
          </div>
        ) : data.mostInquired.length > 0 ? (
          <div className="space-y-4">
            <BarChartComponent
              data={data.mostInquired}
              bars={destinationBars}
              xAxisKey="name"
              height={280}
            />
            {/* Package List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              {data.mostInquired.slice(0, 6).map((pkg, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{pkg.name}</p>
                      <p className="text-xs text-slate-400">{pkg.inquiries} inquiries</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">{pkg.conversions}</p>
                    <p className="text-xs text-slate-400">converted</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-400">
            No package data available
          </div>
        )}
      </ChartContainer>
    </div>
  );
};

export default PackageAnalytics;
