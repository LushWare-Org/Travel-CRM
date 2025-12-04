import { useState, useEffect } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { MapPin, ShoppingCart, TrendingUp } from "lucide-react";
import AnalyticsService from "../../../../services/analytics.service";

/**
 * PackageAnalytics Component
 * Displays package analytics for published packages only
 * Shows inquiries, conversions, and activity insights
 */
const PackageAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
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
    activityPreferences: [],
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Package Analytics</h2>
          <p className="text-gray-600 mt-1">Insights on published packages, inquiries, and conversions</p>
          {error && <p className="text-red-600 text-sm mt-1">Error: {error}</p>}
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={MapPin}
          label="Total Packages"
          value={data.stats.totalItineraries.toString()}
          trend="+12%"
          trendDirection="up"
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Inquiries"
          value={data.stats.totalInquiries.toString()}
          trend="+8%"
          trendDirection="up"
          color="green"
          loading={loading}
        />
        <StatCard
          icon={ShoppingCart}
          label="Conversions"
          value={data.stats.totalConversions.toString()}
          trend="+5%"
          trendDirection="up"
          color="purple"
          loading={loading}
        />
      </div>

      {/* Package Trend Chart */}
      <ChartContainer
        title="Package Performance Trend"
        description="Monthly inquiries and conversions"
      >
        <LineChartComponent
          data={data.trend}
          lines={packageLines}
          xAxisKey="month"
          height={350}
        />
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Destination Performance"
          description="Most inquired and converted destinations"
        >
          <BarChartComponent
            data={data.destinationPerformance}
            bars={destinationBars}
            xAxisKey="destination"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>

        <ChartContainer
          title="Activity Preferences"
          description="Most inquired and converted activities"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(data.activityPreferences || []).map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{activity.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{activity.inquiries}</p>
                  <p className="text-xs text-gray-600">inquiries</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-bold text-green-600">{activity.conversions}</p>
                  <p className="text-xs text-gray-600">conversions</p>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>

        <ChartContainer
          title="Top Packages"
          description="Most inquired and converted packages"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(data.mostInquired || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-600">Rating: {item.rating}★</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{item.inquiries}</p>
                  <p className="text-xs text-gray-600">inquiries</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-bold text-green-600">{item.conversions}</p>
                  <p className="text-xs text-gray-600">conversions</p>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

export default PackageAnalytics;
