import { useState } from "react";
import { TimeRangeFilter, StatCard, ChartContainer } from "../Common";
import { DollarSign, Wallet, TrendingUp, AlertCircle } from "lucide-react";

/**
 * BillingAnalytics Component
 * Displays revenue and billing statistics
 */
const BillingAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

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

      {/* Charts Section - Placeholder for Phase 2 */}
      <ChartContainer
        title="Revenue Trend"
        description="Daily, weekly, monthly, and annual revenue comparison"
      >
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">Chart coming in Phase 2</p>
        </div>
      </ChartContainer>

      {/* Additional breakdown charts - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Payment Status Overview"
          description="Paid vs Outstanding invoices"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>

        <ChartContainer
          title="Outstanding Amounts Trend"
          description="Pending payments over time"
        >
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-600">Chart coming in Phase 2</p>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

export default BillingAnalytics;
