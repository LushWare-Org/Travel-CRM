import { useState, useEffect } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { MapPin, ShoppingCart, TrendingUp, Home } from "lucide-react";
import AnalyticsService from "../../../../services/analytics.service";
import {
  itineraryTrendData,
  topItinerariesData,
  destinationPerformanceData,
  activityPreferenceData,
  hotelPreferenceData,
} from "../../utils/itineraryAnalyticsData";

/**
 * PackageAnalytics Component
 * Displays package and booking statistics
 */
const PackageAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Line chart configuration
  const packageLines = [
    { dataKey: "inquiries", stroke: "#3b82f6", name: "Inquiries" },
    { dataKey: "purchases", stroke: "#10b981", name: "Purchases" },
    { dataKey: "hotels", stroke: "#f59e0b", name: "Hotels Booked" },
  ];

  // Bar chart configuration for destinations
  const destinationBars = [
    { dataKey: "inquiries", fill: "#3b82f6", name: "Inquiries" },
    { dataKey: "purchases", fill: "#10b981", name: "Purchases" },
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
        // Fall back to mock data
        setAnalyticsData({
          stats: {
            totalItineraries: 156,
            totalInquiries: 245,
            totalPurchases: 48,
            totalHotels: 42,
          },
          trend: itineraryTrendData,
          mostInquired: topItinerariesData,
          destinationPerformance: destinationPerformanceData,
          activityPreferences: activityPreferenceData,
          hotelPreferences: hotelPreferenceData,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  // Use fetched data or fallback to mock data
  const data = analyticsData || {
    stats: {
      totalItineraries: 156,
      totalInquiries: 245,
      totalPurchases: 48,
      totalHotels: 42,
    },
    trend: itineraryTrendData,
    mostInquired: topItinerariesData,
    destinationPerformance: destinationPerformanceData,
    activityPreferences: activityPreferenceData,
    hotelPreferences: hotelPreferenceData,
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Package Analytics</h2>
          <p className="text-gray-600 mt-1">Most inquired and purchased packages and destinations</p>
          {error && <p className="text-red-600 text-sm mt-1">Note: Using fallback data</p>}
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
          label="Total Purchases"
          value={data.stats.totalPurchases.toString()}
          trend="+5%"
          trendDirection="up"
          color="purple"
          loading={loading}
        />
        <StatCard
          icon={Home}
          label="Hotel Bookings"
          value={data.stats.totalHotels.toString()}
          trend="+3%"
          trendDirection="up"
          color="orange"
          loading={loading}
        />
      </div>

      {/* Package Trend Chart */}
      <ChartContainer
        title="Package Performance Trend"
        description="Monthly inquiries, purchases, and hotel bookings"
      >
        <LineChartComponent
          data={data.trend || itineraryTrendData}
          lines={packageLines}
          xAxisKey="month"
          height={350}
        />
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Destination Performance"
          description="Most inquired vs purchased destinations"
        >
          <BarChartComponent
            data={data.destinationPerformance || destinationPerformanceData}
            bars={destinationBars}
            xAxisKey="destination"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>

        <ChartContainer
          title="Activity Preferences"
          description="Most inquired and purchased activities"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(data.activityPreferences || activityPreferenceData).map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{activity.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{activity.inquiries}</p>
                  <p className="text-xs text-gray-600">inquiries</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-bold text-green-600">{activity.purchases}</p>
                  <p className="text-xs text-gray-600">purchased</p>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Hotels & Resorts Preference"
          description="Most booked accommodation types"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(data.hotelPreferences || hotelPreferenceData).map((hotel, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{hotel.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{hotel.inquiries}</p>
                  <p className="text-xs text-gray-600">inquiries</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-bold text-green-600">{hotel.purchases}</p>
                  <p className="text-xs text-gray-600">booked</p>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>

        <ChartContainer
          title="Top Packages"
          description="Most inquired and purchased packages"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(data.mostInquired || topItinerariesData).map((item, idx) => (
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
                  <p className="text-sm font-bold text-green-600">{item.purchases}</p>
                  <p className="text-xs text-gray-600">purchased</p>
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
