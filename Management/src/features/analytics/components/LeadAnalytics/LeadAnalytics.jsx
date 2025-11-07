import { useState } from "react";
import { TimeRangeFilter, StatCard, ChartContainer } from "../Common";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";

/**
 * LeadAnalytics Component
 * Displays comprehensive lead statistics and trends
 */
const LeadAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive lead statistics and trends</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Leads"
          value="1,248"
          trend="+12%"
          trendDirection="up"
          color="blue"
        />
        <StatCard
          icon={Target}
          label="Contacted"
          value="892"
          trend="+8%"
          trendDirection="up"
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Interested"
          value="456"
          trend="+15%"
          trendDirection="up"
          color="purple"
        />
        <StatCard
          icon={BarChart3}
          label="Converted"
          value="128"
          trend="+5%"
          trendDirection="up"
          color="orange"
        />
      </div>

      {/* Charts Section - Placeholder for Phase 2 */}
      <ChartContainer
        title="Lead Conversion Funnel"
        description="Track lead progression through sales stages"
      >
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">Chart coming in Phase 2</p>
        </div>
      </ChartContainer>

      {/* Additional breakdown charts - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Leads by Category"
          description="Distribution of leads across categories"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Leads by Status"
          description="Breakdown of leads by current status"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Countries"
          description="Leads by origin country"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Price Range Distribution"
          description="Lead distribution by price range"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

export default LeadAnalytics;
