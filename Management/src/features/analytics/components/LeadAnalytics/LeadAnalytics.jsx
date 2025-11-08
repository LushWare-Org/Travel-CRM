import { useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  PieChartComponent,
  BarChartComponent,
} from "../Common";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";
import {
  leadTrendData,
  leadByCategoryData,
  leadByStatusData,
  leadByCountryData,
  leadByPriceRangeData,
  leadByDestinationData,
} from "../../utils/leadAnalyticsData";

/**
 * LeadAnalytics Component
 * Displays comprehensive lead statistics and trends
 */
const LeadAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  // Line chart configuration
  const leadLineChartLines = [
    { dataKey: "new", stroke: "#3b82f6", name: "New Leads" },
    { dataKey: "contacted", stroke: "#10b981", name: "Contacted" },
    { dataKey: "interested", stroke: "#f59e0b", name: "Interested" },
    { dataKey: "converted", stroke: "#8b5cf6", name: "Converted" },
  ];

  // Bar chart configuration
  const leadByCountryBars = [
    { dataKey: "leads", fill: "#3b82f6", name: "Leads" },
    { dataKey: "conversion", fill: "#10b981", name: "Conversion %" },
  ];

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

      {/* Lead Conversion Funnel Chart */}
      <ChartContainer
        title="Lead Conversion Funnel"
        description="Track lead progression through sales stages"
      >
        <LineChartComponent
          data={leadTrendData}
          lines={leadLineChartLines}
          xAxisKey="month"
          height={350}
        />
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Leads by Category"
          description="Distribution of leads across categories"
        >
          <PieChartComponent
            data={leadByCategoryData}
            dataKey="value"
            nameKey="name"
            height={350}
            colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]}
          />
        </ChartContainer>

        <ChartContainer
          title="Leads by Status"
          description="Breakdown of leads by current status"
        >
          <PieChartComponent
            data={leadByStatusData}
            dataKey="value"
            nameKey="name"
            height={350}
            colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]}
          />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Countries"
          description="Leads by origin country and conversion rates"
        >
          <BarChartComponent
            data={leadByCountryData}
            bars={leadByCountryBars}
            xAxisKey="country"
            height={300}
          />
        </ChartContainer>

        <ChartContainer
          title="Price Range Distribution"
          description="Lead distribution by price range"
        >
          <BarChartComponent
            data={leadByPriceRangeData}
            bars={[{ dataKey: "value", fill: "#8b5cf6", name: "Leads" }]}
            xAxisKey="range"
            height={300}
          />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Top Destinations"
        description="Leads by destination and conversion rates"
      >
        <BarChartComponent
          data={leadByDestinationData}
          bars={[
            { dataKey: "leads", fill: "#3b82f6", name: "Leads" },
            { dataKey: "conversion", fill: "#10b981", name: "Conversion %" },
          ]}
          xAxisKey="destination"
          height={300}
        />
      </ChartContainer>
    </div>
  );
};

export default LeadAnalytics;
