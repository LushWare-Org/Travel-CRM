import { useState, useEffect } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { MapPin, ShoppingCart, TrendingUp, Download } from "lucide-react";
import AnalyticsService from "../../../../services/analytics.service";
import { exportPackageAnalyticsPDF } from "../../utils/exportAnalytics";
import toast from "react-hot-toast";

/**
 * PackageAnalytics Component
 * Displays analytics for published packages including:
 * - Inquiries: Leads created from booking/customization requests
 * - Conversions: Leads with status='converted'
 * 
 * Metrics are tracked only for published packages (status='published').
 * Website contact form leads (without package reference) are excluded.
 */
const PackageAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Line chart configuration
  const packageLines = [
    { dataKey: "inquiries", stroke: "#3b82f6", name: "Inquiries" },
    { dataKey: "conversions", stroke: "#10b981", name: "Conversions" },
  ];

  // Bar chart configuration for destinations
  const destinationBars = [
    { dataKey: "inquiries", fill: "#3b82f6", name: "Inquiries" },
    { dataKey: "conversions", fill: "#10b981", name: "Conversions" },
  ];

  // Fetch analytics data
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

  // Handle PDF export
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

      await exportPackageAnalyticsPDF({
        timeRange,
        summaryMetrics,
      });

      toast.dismiss(toastId);
      toast.success("Package analytics PDF downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export analytics PDF");
    } finally {
      setExporting(false);
    }
  };

  // Use fetched data or show empty state
  const data = analyticsData || {
    stats: {
      totalItineraries: 0,
      totalInquiries: 0,
      totalConversions: 0,
    },
    trend: [],
    mostInquired: [],
    destinationPerformance: [],
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Package Analytics</h2>
          <p className="text-gray-600 mt-1">Track leads from published packages - booking/customization inquiries and conversions</p>
          {error && <p className="text-red-600 text-sm mt-1">Error: {error}</p>}
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
          icon={MapPin}
          label="Published Packages"
          value={data.stats.totalItineraries.toString()}
          trend="+12%"
          trendDirection="up"
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="Lead Inquiries"
          value={data.stats.totalInquiries.toString()}
          trend="+8%"
          trendDirection="up"
          color="green"
          loading={loading}
        />
        <StatCard
          icon={ShoppingCart}
          label="Conversions (Booked)"
          value={data.stats.totalConversions.toString()}
          trend="+5%"
          trendDirection="up"
          color="purple"
          loading={loading}
        />
      </div>

      {/* Package Trend Chart */}
      <ChartContainer
        title="Package Inquiry & Conversion Trend"
        description={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} trends of booking/customization inquiries and conversions for published packages`}
      >
        <LineChartComponent
          data={data.trend}
          lines={packageLines}
          xAxisKey="month"
          height={350}
        />
      </ChartContainer>

      {/* Destination Performance and Top Packages */}
      <div className="grid grid-cols-1 gap-6">
        <ChartContainer
          title="Destination Performance"
          description="Inquiries (leads) and conversions by destination from published packages"
        >
          <BarChartComponent
            data={data.destinationPerformance}
            bars={destinationBars}
            xAxisKey="destination"
            height={400}
            margin={{ top: 5, right: 30, left: 0, bottom: 100 }}
          />
        </ChartContainer>

        <ChartContainer
          title="Top Packages"
          description="Most inquired and converted packages"
        >
          <BarChartComponent
            data={data.mostInquired}
            bars={destinationBars}
            xAxisKey="name"
            height={350}
            margin={{ top: 5, right: 30, left: 0, bottom: 100 }}
          />
        </ChartContainer>
      </div>
    </div>
  );
};

export default PackageAnalytics;
