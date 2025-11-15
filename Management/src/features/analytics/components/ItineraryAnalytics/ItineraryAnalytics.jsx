import { useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { MapPin, ShoppingCart, TrendingUp, Home } from "lucide-react";
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

  // Line chart configuration
  const itineraryLines = [
    { dataKey: "inquiries", stroke: "#3b82f6", name: "Inquiries" },
    { dataKey: "purchases", stroke: "#10b981", name: "Purchases" },
    { dataKey: "hotels", stroke: "#f59e0b", name: "Hotels Booked" },
  ];

  // Bar chart configuration for destinations
  const destinationBars = [
    { dataKey: "inquiries", fill: "#3b82f6", name: "Inquiries" },
    { dataKey: "purchases", fill: "#10b981", name: "Purchases" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Package Analytics</h2>
          <p className="text-gray-600 mt-1">Most inquired and purchased packages and destinations</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={MapPin}
          label="Total Packages"
          value="156"
          trend="+12%"
          trendDirection="up"
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Most Inquired"
          value="24"
          trend="+8%"
          trendDirection="up"
          color="green"
        />
        <StatCard
          icon={ShoppingCart}
          label="Most Purchased"
          value="18"
          trend="+5%"
          trendDirection="up"
          color="purple"
        />
        <StatCard
          icon={Home}
          label="Popular Hotels"
          value="42"
          trend="+3%"
          trendDirection="up"
          color="orange"
        />
      </div>

      {/* Package Trend Chart */}
      <ChartContainer
        title="Package Performance Trend"
        description="Monthly inquiries, purchases, and hotel bookings"
      >
        <LineChartComponent
          data={itineraryTrendData}
          lines={itineraryLines}
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
            data={destinationPerformanceData}
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
            {activityPreferenceData.map((activity, idx) => (
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
            {hotelPreferenceData.map((hotel, idx) => (
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
            {topItinerariesData.map((itinerary, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{itinerary.name}</p>
                  <p className="text-xs text-gray-600">Rating: {itinerary.rating}★</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{itinerary.inquiries}</p>
                  <p className="text-xs text-gray-600">inquiries</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-bold text-green-600">{itinerary.purchases}</p>
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
