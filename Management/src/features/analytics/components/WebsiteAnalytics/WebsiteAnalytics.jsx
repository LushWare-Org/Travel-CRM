import { useState, useEffect } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { Search, MapPin, Activity, TrendingUp } from "lucide-react";
import AnalyticsService from "../../../../services/analytics.service";

/**
 * WebsiteAnalytics Component
 * Displays customer inquiry patterns and booking conversion metrics
 * Shows actual lead inquiries (customer searches), bookings, destination preferences,
 * activities, duration preferences, and price ranges
 */
const WebsiteAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Fetch analytics data from backend
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

  // Use fetched data or show empty state
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

  // Line chart configuration
  const searchLines = [
    { dataKey: "searches", stroke: "#3b82f6", name: "Lead Inquiries" },
    { dataKey: "conversions", stroke: "#10b981", name: "Bookings" },
  ];

  // Bar chart configuration
  const destinationBars = [
    { dataKey: "searches", fill: "#3b82f6", name: "Inquiries" },
    { dataKey: "conversions", fill: "#10b981", name: "Conversions" },
  ];

  const durationBars = [
    { dataKey: "searches", fill: "#3b82f6", name: "Inquiries" },
    { dataKey: "bookings", fill: "#10b981", name: "Bookings" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Website Analytics</h2>
            <p className="text-gray-600 mt-1">Customer inquiry and booking patterns</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} disabled={loading} />
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Website Analytics</h2>
            <p className="text-gray-600 mt-1">Customer inquiry and booking patterns</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error Loading Analytics</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Website Analytics</h2>
          <p className="text-gray-600 mt-1">Customer inquiry and booking conversion patterns</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Search}
          label="Total Inquiries"
          value={data.stats.totalSearches?.toString() || "0"}
          trend="+12%"
          trendDirection="up"
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Bookings"
          value={data.stats.totalBookings?.toString() || "0"}
          trend="+8%"
          trendDirection="up"
          color="green"
          loading={loading}
        />
        <StatCard
          icon={MapPin}
          label="Top Destinations"
          value={data.stats.uniqueDestinations?.toString() || "0"}
          trend="+5%"
          trendDirection="up"
          color="purple"
          loading={loading}
        />
        <StatCard
          icon={Activity}
          label="Activities Offered"
          value={data.stats.uniqueActivities?.toString() || "0"}
          trend="+3%"
          trendDirection="up"
          color="orange"
          loading={loading}
        />
      </div>

      {/* Inquiry & Booking Trends Chart */}
      <ChartContainer
        title="Lead Inquiry & Booking Trends"
        description="Customer inquiries and booking conversions over time"
      >
        <LineChartComponent
          data={data.trend || []}
          lines={searchLines}
          xAxisKey="label"
          height={350}
        />
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Destination Inquiries"
          description="Most inquired destinations with conversion rates"
        >
          <BarChartComponent
            data={data.topDestinations || []}
            bars={destinationBars}
            xAxisKey="destination"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>

        <ChartContainer
          title="Price Range Distribution"
          description="Customer inquiries by package price range"
        >
          <BarChartComponent
            data={data.priceRanges || []}
            bars={[{ dataKey: "searches", fill: "#8b5cf6", name: "Inquiries" }]}
            xAxisKey="range"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Accommodation Type Distribution"
          description="Popular accommodation types in inquired packages"
        >
          <PieChartComponent
            data={data.accommodationTypes || []}
            dataKey="value"
            nameKey="name"
            height={360}
            colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]}
            legendProps={{ align: "bottom", verticalAlign: "bottom", layout: "horizontal" }}
          />
        </ChartContainer>

        <ChartContainer
          title="Package Duration Preferences"
          description="Inquiry volume and bookings by package duration"
        >
          <BarChartComponent
            data={data.durationPreferences || []}
            bars={durationBars}
            xAxisKey="duration"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>
      </div>
    </div>
  );
};

export default WebsiteAnalytics;
