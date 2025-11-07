import { useState } from "react";
import { TimeRangeFilter, StatCard, ChartContainer } from "../Common";
import { Users, UserCheck, TrendingUp, DollarSign } from "lucide-react";

/**
 * UserAnalytics Component
 * Displays user and sales representative statistics
 */
const UserAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management Analytics</h2>
          <p className="text-gray-600 mt-1">User growth and sales performance metrics</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="New Users"
          value="342"
          trend="+8%"
          trendDirection="up"
          color="blue"
        />
        <StatCard
          icon={UserCheck}
          label="Users Purchased"
          value="128"
          trend="+12%"
          trendDirection="up"
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Successful Sales"
          value="98"
          trend="+5%"
          trendDirection="up"
          color="purple"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue/Rep Avg"
          value="$4,250"
          trend="+15%"
          trendDirection="up"
          unit="USD"
          color="orange"
        />
      </div>

      {/* Charts Section - Placeholder for Phase 2 */}
      <ChartContainer
        title="User Growth Trend"
        description="New users acquired over time"
      >
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">Chart coming in Phase 2</p>
        </div>
      </ChartContainer>

      {/* Additional breakdown charts - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Sales Rep Performance"
          description="Sales by each representative"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Revenue by Sales Rep"
          description="Revenue earned by each representative"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

export default UserAnalytics;
