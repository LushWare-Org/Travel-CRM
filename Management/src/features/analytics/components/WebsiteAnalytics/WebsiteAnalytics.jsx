import { useState, useEffect } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { Search, MapPin, Activity, TrendingUp, Download, Globe, MousePointer, Target } from "lucide-react";
import { exportWebsiteAnalyticsPDF } from "../../utils/exportAnalytics";
import toast from "react-hot-toast";
import AnalyticsService from "../../../../services/analytics.service";

/**
 * WebsiteAnalytics Component - Redesigned
 * Modern layout for website traffic and engagement metrics
 */
const WebsiteAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await AnalyticsService.getWebsiteAnalyticsOverview(timeRange);
        setAnalyticsData(data);
      } catch (err) {
        console.error("Error fetching website analytics:", err);
        setError(err.message || "Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, [timeRange]);

  const data = analyticsData || {
    stats: {
      totalSearches: 0,
      totalBookings: 0,
      uniqueDestinations: 0,
      uniqueActivities: 0,
      conversionRate: 0,
    },
    trend: [],
    topDestinations: [],
    accommodationTypes: [],
    durationPreferences: [],
    priceRanges: [],
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const toastId = toast.loading("Preparing website analytics PDF...");
      const summaryMetrics = [
        { label: "Total Inquiries", value: data.stats.totalSearches || 0 },
        { label: "Total Bookings", value: data.stats.totalBookings || 0 },
        { label: "Top Destinations", value: data.stats.uniqueDestinations || 0 },
        { label: "Activities Offered", value: data.stats.uniqueActivities || 0 },
        { label: "Time Range", value: timeRange.toUpperCase() },
      ];
      await exportWebsiteAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success("Website analytics PDF downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export analytics PDF");
    } finally {
      setExporting(false);
    }
  };

  const searchLines = [
    { dataKey: "searches", stroke: "#06b6d4", name: "Inquiries" },
    { dataKey: "conversions", stroke: "#10b981", name: "Bookings" },
  ];

  const destinationBars = [
    { dataKey: "searches", fill: "#06b6d4", name: "Inquiries" },
    { dataKey: "conversions", fill: "#10b981", name: "Conversions" },
  ];

  const durationBars = [
    { dataKey: "searches", fill: "#6366f1", name: "Inquiries" },
    { dataKey: "bookings", fill: "#10b981", name: "Bookings" },
  ];

  const conversionRate = data.stats.totalSearches > 0
    ? ((data.stats.totalBookings / data.stats.totalSearches) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Website Analytics</h2>
            <p className="text-sm text-slate-500 mt-1">Customer inquiry and booking patterns</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Website Analytics</h2>
            <p className="text-sm text-slate-500 mt-1">Customer inquiry and booking patterns</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
          <p className="text-rose-800 font-semibold">Error Loading Analytics</p>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Website Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Customer inquiry and booking conversion patterns</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/25"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Inquiries</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.totalSearches || 0}</p>
          <p className="text-xs mt-2 opacity-70">Lead inquiries</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Bookings</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.totalBookings || 0}</p>
          <p className="text-xs mt-2 opacity-70">Confirmed bookings</p>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Destinations</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.uniqueDestinations || 0}</p>
          <p className="text-xs mt-2 opacity-70">Unique locations</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Conversion</span>
          </div>
          <p className="text-3xl font-bold">{conversionRate}%</p>
          <p className="text-xs mt-2 opacity-70">Inquiry to booking</p>
        </div>
      </div>

      {/* Trend Chart - Full Width */}
      <ChartContainer
        title="Inquiry & Booking Trends"
        description="Customer engagement over time"
      >
        {data.trend?.length > 0 ? (
          <LineChartComponent
            data={data.trend}
            lines={searchLines}
            xAxisKey="label"
            height={300}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-400">
            No trend data available
          </div>
        )}
      </ChartContainer>

      {/* Destination & Price Range - 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Destinations"
          description="Most inquired destinations"
        >
          {data.topDestinations?.length > 0 ? (
            <BarChartComponent
              data={data.topDestinations}
              bars={destinationBars}
              xAxisKey="destination"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No destination data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Price Range Distribution"
          description="Inquiries by budget"
        >
          {data.priceRanges?.length > 0 ? (
            <BarChartComponent
              data={data.priceRanges}
              bars={[{ dataKey: "searches", fill: "#8b5cf6", name: "Inquiries" }]}
              xAxisKey="range"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No price range data available
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Accommodation & Duration - 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer
          title="Accommodation Preferences"
          description="Popular accommodation types"
        >
          {data.accommodationTypes?.length > 0 ? (
            <PieChartComponent
              data={data.accommodationTypes}
              dataKey="value"
              nameKey="name"
              height={280}
              colors={["#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No accommodation data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Duration Preferences"
          description="Package duration popularity"
        >
          {data.durationPreferences?.length > 0 ? (
            <BarChartComponent
              data={data.durationPreferences}
              bars={durationBars}
              xAxisKey="duration"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No duration data available
            </div>
          )}
        </ChartContainer>
      </div>
    </div>
  );
};

export default WebsiteAnalytics;
