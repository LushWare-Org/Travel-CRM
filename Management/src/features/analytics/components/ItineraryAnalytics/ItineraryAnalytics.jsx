import { useState } from "react";
import { TimeRangeFilter, StatCard, ChartContainer } from "../Common";
import { MapPin, ShoppingCart, TrendingUp, Home } from "lucide-react";

/**
 * ItineraryAnalytics Component
 * Displays itinerary and booking statistics
 */
const ItineraryAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Itinerary Analytics</h2>
          <p className="text-gray-600 mt-1">Most inquired and purchased packages and destinations</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={MapPin}
          label="Total Itineraries"
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

      {/* Charts Section - Placeholder for Phase 2 */}
      <ChartContainer
        title="Most Inquired Itineraries"
        description="Top packages by inquiry count"
      >
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">Chart coming in Phase 2</p>
        </div>
      </ChartContainer>

      {/* Additional breakdown charts - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Destination Performance"
          description="Most inquired vs purchased destinations"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Activity Trends"
          description="Most inquired and purchased activities"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Hotels & Resorts Preference"
          description="Most booked accommodations"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Inquiry vs Purchase Ratio"
          description="Conversion analysis for packages"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

export default ItineraryAnalytics;
