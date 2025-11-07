import { useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { Users, UserCheck, TrendingUp, DollarSign } from "lucide-react";
import {
  userGrowthData,
  salesRepPerformanceData,
  revenueByRepData,
  userTypeDistributionData,
} from "../../utils/userAnalyticsData";

/**
 * UserAnalytics Component
 * Displays user and sales representative statistics
 */
const UserAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  // Line chart configuration
  const userGrowthLines = [
    { dataKey: "newUsers", stroke: "#3b82f6", name: "New Users" },
    { dataKey: "purchased", stroke: "#10b981", name: "Users Purchased" },
    { dataKey: "salesReps", stroke: "#f59e0b", name: "Sales Reps Active" },
  ];

  // Bar chart configuration
  const salesRepBars = [
    { dataKey: "sales", fill: "#3b82f6", name: "Sales" },
    { dataKey: "conversion", fill: "#10b981", name: "Conversion %" },
  ];

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

      {/* User Growth Trend Chart */}
      <ChartContainer
        title="User Growth Trend"
        description="New users, purchases, and sales rep activity over time"
      >
        <LineChartComponent
          data={userGrowthData}
          lines={userGrowthLines}
          xAxisKey="month"
          height={350}
        />
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Sales Rep Performance"
          description="Sales count and conversion rates by representative"
        >
          <BarChartComponent
            data={salesRepPerformanceData}
            bars={salesRepBars}
            xAxisKey="rep"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>

        <ChartContainer
          title="Revenue by Sales Rep"
          description="Revenue earned by each representative"
        >
          <BarChartComponent
            data={revenueByRepData}
            bars={[{ dataKey: "revenue", fill: "#8b5cf6", name: "Revenue" }]}
            xAxisKey="rep"
            height={320}
            margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
          />
        </ChartContainer>
      </div>

      <ChartContainer
        title="User Type Distribution"
        description="Breakdown of website users, registered users, and converted users"
      >
        <PieChartComponent
          data={userTypeDistributionData}
          dataKey="value"
          nameKey="name"
          height={300}
          colors={["#3b82f6", "#10b981", "#f59e0b"]}
        />
      </ChartContainer>
    </div>
  );
};

export default UserAnalytics;
