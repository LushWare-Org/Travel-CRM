import { useEffect, useMemo, useState } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
} from "../Common";
import PieChartComponent, { DEFAULT_PIE_COLORS } from "../Common/Charts/PieChartComponent";
import { BarChart3, TrendingUp, Users, Target, Download, Activity, Zap } from "lucide-react";
import { analyticsAPI } from "../../../../services/api";
import { exportLeadAnalyticsPDF } from "../../utils/exportAnalytics";
import toast from "react-hot-toast";

/**
 * LeadAnalytics Component - Completely Redesigned
 * Modern layout with unique component structure
 */
const LeadAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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
        setPriceRangeData(payload?.priceRangeDistribution || []);

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
        setStats({ totalLeads: 0, contacted: 0, interested: 0, converted: 0, new: 0, quoted: 0 });
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

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const toastId = toast.loading("Preparing analytics PDF...");
      const summaryMetrics = [
        { label: "Total Leads", value: stats.totalLeads },
        { label: "Contacted", value: stats.contacted },
        { label: "Interested", value: stats.interested },
        { label: "Converted", value: stats.converted },
        { label: "Time Range", value: timeRange.toUpperCase() },
      ];
      await exportLeadAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success("Analytics PDF downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export analytics PDF");
    } finally {
      setExporting(false);
    }
  };

  const leadLineChartLines = [
    { dataKey: "new", stroke: "#3b82f6", name: "New Leads" },
    { dataKey: "contacted", stroke: "#10b981", name: "Contacted" },
    { dataKey: "interested", stroke: "#f59e0b", name: "Interested" },
    { dataKey: "converted", stroke: "#8b5cf6", name: "Converted" },
  ];

  const categoryColors = [
    "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a855f7",
    "#ec4899", "#3b82f6", "#22c55e", "#f97316", "#8b5cf6",
  ];

  const statusColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1",
  ];

  // Quick stats for header
  const quickStats = [
    { label: 'Total', value: stats.totalLeads, color: 'text-slate-800' },
    { label: 'Contacted', value: stats.contacted, color: 'text-blue-600' },
    { label: 'Interested', value: stats.interested, color: 'text-amber-600' },
    { label: 'Converted', value: stats.converted, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Lead Performance</h2>
          <p className="text-sm text-slate-500 mt-1">Track your lead pipeline and conversions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>{numberFormatter.format(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          icon={Users}
          label="Total Leads"
          value={numberFormatter.format(stats.totalLeads)}
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={Target}
          label="Contacted"
          value={numberFormatter.format(stats.contacted)}
          color="green"
          loading={loading}
        />
        <StatCard
          icon={Zap}
          label="Interested"
          value={numberFormatter.format(stats.interested)}
          color="purple"
          loading={loading}
        />
        <StatCard
          icon={Activity}
          label="Converted"
          value={numberFormatter.format(stats.converted)}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Lead Funnel Chart - Full Width */}
      <ChartContainer
        title="Lead Conversion Funnel"
        description="Track lead progression through sales stages"
      >
        {loading ? (
          <div className="flex items-center justify-center h-[320px]">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
          </div>
        ) : trendData.length > 0 ? (
          <LineChartComponent
            data={trendData}
            lines={leadLineChartLines}
            xAxisKey="label"
            height={320}
          />
        ) : (
          <div className="flex items-center justify-center h-[320px] text-slate-400">
            {errorMessage || "No lead trend data available for the selected range."}
          </div>
        )}
      </ChartContainer>

      {/* Distribution Charts - 2 Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer
          title="Leads by Category"
          description="Distribution across categories"
        >
          {loading ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          ) : categoryData.length > 0 ? (
            <PieChartComponent
              data={categoryData}
              dataKey="value"
              nameKey="name"
              height={280}
              colors={categoryColors}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No category data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Leads by Status"
          description="Current status breakdown"
        >
          {loading ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          ) : statusData.length > 0 ? (
            <PieChartComponent
              data={statusData}
              dataKey="value"
              nameKey="name"
              height={280}
              colors={statusColors}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No status data available
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Country and Price Range - 2 Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Countries"
          description="Leads by origin country"
        >
          {countryData.length > 0 ? (
            <div className="space-y-4">
              <BarChartComponent
                data={countryData}
                bars={[
                  { dataKey: "leads", fill: "#6366f1", name: "Leads" },
                  { dataKey: "conversion", fill: "#10b981", name: "Conversion %" },
                ]}
                xAxisKey="country"
                height={260}
              />
              {/* Country List */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                {countryData.slice(0, 6).map((country, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate">{country.country}</span>
                    <span className="font-semibold text-slate-800">{country.leads}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No country data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Price Range Distribution"
          description="Lead distribution by budget"
        >
          {priceRangeData.length > 0 ? (
            <BarChartComponent
              data={priceRangeData}
              bars={[{ dataKey: "value", fill: "#8b5cf6", name: "Leads" }]}
              xAxisKey="range"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              No price range data available
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Top Destinations - Full Width */}
      <ChartContainer
        title="Top Destinations"
        description="Leads by destination with conversion rates"
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
          <div className="flex items-center justify-center h-[300px] text-slate-400">
            No destination data available
          </div>
        )}
      </ChartContainer>
    </div>
  );
};

export default LeadAnalytics;
