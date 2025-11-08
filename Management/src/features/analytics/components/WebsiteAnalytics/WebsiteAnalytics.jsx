import { useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { Search, MapPin, Home, TrendingUp } from "lucide-react";
import {
  searchTrendData,
  topDestinationSearchesData,
  activitySearchData,
  hotelSearchData,
  durationSearchData,
  priceRangeSearchData,
} from "../../utils/websiteAnalyticsData";

/**
 * WebsiteAnalytics Component
 * Displays customer website behavior and search patterns
 */
const WebsiteAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  // Line chart configuration
  const searchLines = [
    { dataKey: "searches", stroke: "#3b82f6", name: "Searches" },
    { dataKey: "clicks", stroke: "#10b981", name: "Clicks" },
    { dataKey: "bookings", stroke: "#f59e0b", name: "Bookings" },
  ];

  // Bar chart configuration
  const destinationBars = [
    { dataKey: "searches", fill: "#3b82f6", name: "Searches" },
    { dataKey: "conversions", fill: "#10b981", name: "Conversions" },
  ];

  const durationBars = [
    { dataKey: "searches", fill: "#3b82f6", name: "Searches" },
    { dataKey: "bookings", fill: "#10b981", name: "Bookings" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Website Analytics</h2>
          <p className="text-gray-600 mt-1">Customer search patterns and preferences</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Search}
          label="Total Searches"
          value="8,542"
          trend="+18%"
          trendDirection="up"
          color="blue"
        />
        <StatCard
          icon={MapPin}
          label="Top Destinations"
          value="34"
          trend="+5%"
          trendDirection="up"
          color="green"
        />
        <StatCard
          icon={Home}
          label="Popular Hotels"
          value="28"
          trend="+12%"
          trendDirection="up"
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Trending Packages"
          value="42"
          trend="+8%"
          trendDirection="up"
          color="orange"
        />
      </div>

      {/* Search Trend Chart */}
      <ChartContainer
        title="Search & Booking Trends"
        description="Monthly search volume, clicks, and bookings"
      >
        <LineChartComponent
          data={searchTrendData}
          lines={searchLines}
          xAxisKey="month"
          height={350}
        />
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Most Searched Destinations"
          description="Top destinations by search volume and conversion"
        >
          <BarChartComponent
            data={topDestinationSearchesData}
            bars={destinationBars}
            xAxisKey="destination"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>

        <ChartContainer
          title="Activity Search Trends"
          description="Most searched activities by customers"
        >
          <PieChartComponent
            data={activitySearchData}
            dataKey="value"
            nameKey="name"
            height={320}
            colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]}
          />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Hotel Search Patterns"
          description="Most searched hotels and resorts"
        >
          <PieChartComponent
            data={hotelSearchData}
            dataKey="value"
            nameKey="name"
            height={320}
            colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]}
          />
        </ChartContainer>

        <ChartContainer
          title="Package Duration Preferences"
          description="Search volume and bookings by package duration"
        >
          <BarChartComponent
            data={durationSearchData}
            bars={durationBars}
            xAxisKey="duration"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Price Range Search Distribution"
        description="Most searched price ranges for packages"
      >
        <BarChartComponent
          data={priceRangeSearchData}
          bars={[{ dataKey: "searches", fill: "#8b5cf6", name: "Searches" }]}
          xAxisKey="range"
          height={300}
        />
      </ChartContainer>
    </div>
  );
};

export default WebsiteAnalytics;
