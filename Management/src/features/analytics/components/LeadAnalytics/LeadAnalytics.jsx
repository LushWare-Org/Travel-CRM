import { useEffect, useMemo, useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
} from "../Common";
import PieChartComponent, { DEFAULT_PIE_COLORS } from "../Common/Charts/PieChartComponent";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";
import { analyticsAPI } from "../../../../services/api";

/**
 * LeadAnalytics Component
 * Displays comprehensive lead statistics and trends
 */
const LeadAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    contacted: 0,
    interested: 0,
    converted: 0,
    new: 0,
    quoted: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [priceRangeData, setPriceRangeData] = useState([]);
  const [countryData, setCountryData] = useState([]);
  const [destinationData, setDestinationData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  useEffect(() => {
    const fetchLeadAnalytics = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await analyticsAPI.getLeadOverview({ timeRange });
        const payload = response?.data || {};
        setStats({
          totalLeads: payload?.stats?.totalLeads || 0,
          contacted: payload?.stats?.contacted || 0,
          interested: payload?.stats?.interested || 0,
          converted: payload?.stats?.converted || 0,
          new: payload?.stats?.new || 0,
          quoted: payload?.stats?.quoted || 0,
        });
        setTrendData(payload?.trend || []);
        setStatusData(payload?.statusDistribution || []);
        setCategoryData(payload?.categoryDistribution || []);
        const priceRanges = payload?.priceRangeDistribution || [];
        setPriceRangeData(priceRanges);

        const countries = (payload?.topCountries || []).map((item) => ({
          ...item,
          country: item?.country
            ? item.country
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
            : 'Unknown',
        }));
        setCountryData(countries);

        const destinations = (payload?.topDestinations || []).map((item) => ({
          ...item,
          destination: item?.destination
            ? item.destination
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
            : 'Unknown',
        }));
        setDestinationData(destinations);
      } catch (error) {
        console.error("Failed to load lead analytics", error);
        setErrorMessage(error.message || "Failed to load lead analytics data.");
        setStats({
          totalLeads: 0,
          contacted: 0,
          interested: 0,
          converted: 0,
          new: 0,
          quoted: 0,
        });
        setTrendData([]);
        setStatusData([]);
        setCategoryData([]);
        setPriceRangeData([]);
        setCountryData([]);
        setDestinationData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadAnalytics();
  }, [timeRange]);

  // Line chart configuration
  const leadLineChartLines = [
    { dataKey: "new", stroke: "#3b82f6", name: "New Leads" },
    { dataKey: "contacted", stroke: "#10b981", name: "Contacted" },
    { dataKey: "interested", stroke: "#f59e0b", name: "Interested" },
    { dataKey: "converted", stroke: "#8b5cf6", name: "Converted" },
  ];

  // Palette helpers
  const categoryColors = [
    DEFAULT_PIE_COLORS[0],
    DEFAULT_PIE_COLORS[1],
    DEFAULT_PIE_COLORS[2],
    "#ef4444", // Adventure
    "#a855f7", // Wildlife
    "#ec4899", // Family
    "#6366f1", // Beach
    "#22c55e", // Heritage
    "#f97316", // Religious
    DEFAULT_PIE_COLORS[5],
  ];

  const statusColors = [
    "#3b82f6", // New
    "#10b981", // Contacted
    "#f59e0b", // Interested
    "#ef4444", // Quoted
    "#8b5cf6", // Converted
    "#ec4899", // Lost
    "#6366f1", // Not Interested
  ];

  const renderLegendList = (items, colors) => (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-700">
      {items.map((item, index) => (
        <li key={`${item.name}-${index}`} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-gray-200"
            style={{ backgroundColor: colors[index % colors.length] }}
          />
          <span className="text-gray-600">
            {item.name}:{" "}
            <span className="font-semibold text-gray-900">{numberFormatter.format(item.value || 0)}</span>
          </span>
        </li>
      ))}
    </ul>
  );

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
          value={numberFormatter.format(stats.totalLeads || 0)}
          trend={null}
          color="blue"
        />
        <StatCard
          icon={Target}
          label="Contacted Leads"
          value={numberFormatter.format(stats.contacted || 0)}
          trend={null}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Interested"
          value={numberFormatter.format(stats.interested || 0)}
          trend={null}
          color="purple"
        />
        <StatCard
          icon={BarChart3}
          label="Converted"
          value={numberFormatter.format(stats.converted || 0)}
          trend={null}
          color="orange"
        />
      </div>

      {/* Lead Conversion Funnel Chart */}
      <ChartContainer
        title="Lead Conversion Funnel"
        description="Track lead progression through sales stages"
      >
        {loading ? (
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            Loading lead trend...
          </div>
        ) : trendData.length > 0 ? (
          <LineChartComponent
            data={trendData}
            lines={leadLineChartLines}
            xAxisKey="label"
            height={350}
          />
        ) : (
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            {errorMessage || "No lead trend data available for the selected range."}
          </div>
        )}
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Leads by Category"
          description="Distribution of leads across categories"
        >
          {loading ? (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Loading category distribution...
            </div>
          ) : categoryData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 min-h-[320px]">
              <div className="w-full lg:w-1/2 flex justify-center">
                <PieChartComponent
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  height={260}
                  colors={categoryColors}
                  legendProps={false}
                  pieProps={{
                    innerRadius: 70,
                    outerRadius: 110,
                    label: false,
                    cx: "50%",
                    cy: "50%",
                  }}
                />
              </div>
              <div className="w-full lg:w-1/2">
                {renderLegendList(categoryData, categoryColors)}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              {errorMessage || "No lead category data available for the selected range."}
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Leads by Status"
          description="Breakdown of leads by current status"
        >
          {loading ? (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Loading status distribution...
            </div>
          ) : statusData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 min-h-[320px]">
              <div className="w-full lg:w-1/2 flex justify-center">
                <PieChartComponent
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  height={260}
                  colors={statusColors}
                  legendProps={false}
                  pieProps={{
                    innerRadius: 65,
                    outerRadius: 105,
                    label: false,
                    cx: "50%",
                    cy: "50%",
                  }}
                />
              </div>
              <div className="w-full lg:w-1/2">
                {renderLegendList(statusData, statusColors)}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              {errorMessage || "No lead status data available for the selected range."}
            </div>
          )}
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Countries"
          description="Leads by origin country and conversion rates"
        >
          {countryData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 min-h-[320px]">
              <div className="w-full lg:w-2/3">
                <BarChartComponent
                  data={countryData}
                  bars={leadByCountryBars}
                  xAxisKey="country"
                  height={300}
                />
              </div>
              <div className="w-full lg:w-1/3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-full">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Countries</h4>
                  <ul className="space-y-3 text-sm text-gray-700 max-h-[260px] overflow-y-auto">
                    {countryData.map((country, index) => (
                      <li key={`${country.country}-${index}`} className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {country.country || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Conversion {country.conversion ? `${country.conversion}%` : "0%"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-blue-600">
                          {numberFormatter.format(country.leads || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              {errorMessage || "No country-wise lead data available for the selected range."}
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Price Range Distribution"
          description="Lead distribution by price range"
        >
          {priceRangeData.length > 0 ? (
            <BarChartComponent
              data={priceRangeData}
              bars={[{ dataKey: "value", fill: "#8b5cf6", name: "Leads" }]}
              xAxisKey="range"
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              {errorMessage || "No price range data available for the selected range."}
            </div>
          )}
        </ChartContainer>
      </div>

      <ChartContainer
        title="Top Destinations"
        description="Leads by destination and conversion rates"
      >
        {destinationData.length > 0 ? (
          <BarChartComponent
            data={destinationData}
            bars={[
              { dataKey: "leads", fill: "#3b82f6", name: "Leads" },
              { dataKey: "conversion", fill: "#10b981", name: "Conversion %" },
            ]}
            xAxisKey="destination"
            height={300}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            {errorMessage || "No destination-wise lead data available for the selected range."}
          </div>
        )}
      </ChartContainer>
    </div>
  );
};

export default LeadAnalytics;
