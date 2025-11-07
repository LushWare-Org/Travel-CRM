import { useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  AreaChartComponent,
  PieChartComponent,
  BarChartComponent,
} from "../Common";
import { DollarSign, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import {
  revenueData,
  paymentStatusData,
  outstandingTrendData,
  invoiceBreakdownData,
} from "../../utils/billingAnalyticsData";

/**
 * BillingAnalytics Component
 * Displays revenue and billing statistics
 */
const BillingAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  // Area chart configuration
  const revenueAreas = [
    {
      dataKey: "revenue",
      fill: "#3b82f6",
      stroke: "#1e40af",
      name: "Actual Revenue",
    },
    { dataKey: "target", fill: "#e5e7eb", stroke: "#9ca3af", name: "Target" },
  ];

  // Bar chart configuration
  const invoiceBars = [
    { dataKey: "revenue", fill: "#3b82f6", name: "Revenue" },
    { dataKey: "invoices", fill: "#10b981", name: "Invoices" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Billing & Invoicing Analytics</h2>
          <p className="text-gray-600 mt-1">Revenue and payment tracking</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value="$94,500"
          trend="+23%"
          trendDirection="up"
          unit="USD"
          color="green"
        />
        <StatCard
          icon={Wallet}
          label="Outstanding Amount"
          value="$12,340"
          trend="-5%"
          trendDirection="down"
          unit="USD"
          color="orange"
        />
        <StatCard
          icon={TrendingUp}
          label="Potential Revenue"
          value="$45,000"
          trend="+18%"
          trendDirection="up"
          unit="USD"
          color="purple"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending Invoices"
          value="24"
          trend="-3"
          trendDirection="down"
          color="blue"
        />
      </div>

      {/* Revenue Trend Chart */}
      <ChartContainer
        title="Revenue Trend"
        description="Monthly revenue comparison with targets"
      >
        <AreaChartComponent
          data={revenueData}
          areas={revenueAreas}
          xAxisKey="month"
          height={350}
        />
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Payment Status Overview"
          description="Paid vs Outstanding invoices"
        >
          <PieChartComponent
            data={paymentStatusData}
            dataKey="value"
            nameKey="name"
            height={320}
            colors={["#10b981", "#f59e0b", "#ef4444"]}
          />
        </ChartContainer>

        <ChartContainer
          title="Outstanding Amounts Trend"
          description="Pending payments and pending leads over time"
        >
          <AreaChartComponent
            data={outstandingTrendData}
            areas={[
              {
                dataKey: "outstanding",
                fill: "#ef4444",
                stroke: "#991b1b",
                name: "Outstanding ($)",
              },
            ]}
            xAxisKey="month"
            height={320}
          />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Invoice Breakdown by Category"
        description="Revenue and invoices by service category"
      >
        <BarChartComponent
          data={invoiceBreakdownData}
          bars={invoiceBars}
          xAxisKey="category"
          height={300}
          margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
        />
      </ChartContainer>
    </div>
  );
};

export default BillingAnalytics;
