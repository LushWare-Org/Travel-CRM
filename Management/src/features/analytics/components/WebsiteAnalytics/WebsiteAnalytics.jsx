import { useState } from "react";
import { TimeRangeFilter, StatCard, ChartContainer } from "../Common";
import { Search, MapPin, Home, TrendingUp } from "lucide-react";

/**
 * WebsiteAnalytics Component
 * Displays customer website behavior and search patterns
 */
const WebsiteAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

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

      {/* Charts Section - Placeholder for Phase 2 */}
      <ChartContainer
        title="Most Searched Destinations"
        description="Top destinations by search volume"
      >
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">Chart coming in Phase 2</p>
        </div>
      </ChartContainer>

      {/* Additional breakdown charts - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Activity Search Trends"
          description="Most searched activities"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Hotel Search Patterns"
          description="Most searched hotels and resorts"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Package Duration Preferences"
          description="Most searched day lengths for packages"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Price Range Searches"
          description="Most searched price ranges"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

export default WebsiteAnalytics;
