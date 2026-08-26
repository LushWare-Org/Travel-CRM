import { useEffect, useMemo, useState } from 'react';
import {
  TimeRangeFilter,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
} from '../Common';
import PieChartComponent from '../Common/Charts/PieChartComponent';
import { CHART_PALETTE } from '../Common/chartTheme';
import { Users, Target, Download, Activity, Zap } from 'lucide-react';
import { analyticsAPI } from '../../../../services/api';
import { exportLeadAnalyticsPDF } from '../../utils/exportAnalytics';
import toast from '@/lib/toast';
import { StatCard } from '../../../../components/shared/StatCard';
import { Button } from '../../../../components/ui/button';

/**
 * LeadAnalytics Component
 */
const LeadAnalytics = () => {
  const [timeRange, setTimeRange] = useState('monthly');
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
  const [trendData, setTrendData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [priceRangeData, setPriceRangeData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [destinationData, setDestinationData] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

  useEffect(() => {
    const fetchLeadAnalytics = async () => {
      setLoading(true);
      setErrorMessage('');
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

        const countries = (payload?.topCountries || []).map((item: any) => ({
          ...item,
          country: item?.country
            ? item.country
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
            : 'Unknown',
        }));
        setCountryData(countries);

        const destinations = (payload?.topDestinations || []).map((item: any) => ({
          ...item,
          destination: item?.destination
            ? item.destination
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
            : 'Unknown',
        }));
        setDestinationData(destinations);
      } catch (error: any) {
        console.error('Failed to load lead analytics', error);
        setErrorMessage(error.message || 'Failed to load lead analytics data.');
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
      const toastId = toast.loading('Preparing analytics PDF...');
      const summaryMetrics = [
        { label: 'Total Leads', value: stats.totalLeads },
        { label: 'Contacted', value: stats.contacted },
        { label: 'Interested', value: stats.interested },
        { label: 'Converted', value: stats.converted },
        { label: 'Time Range', value: timeRange.toUpperCase() },
      ];
      await exportLeadAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success('Analytics PDF downloaded successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export analytics PDF');
    } finally {
      setExporting(false);
    }
  };

  const leadLineChartLines = [
    { dataKey: 'new', stroke: CHART_PALETTE[0], name: 'New Leads' },
    { dataKey: 'contacted', stroke: CHART_PALETTE[1], name: 'Contacted' },
    { dataKey: 'interested', stroke: CHART_PALETTE[2], name: 'Interested' },
    { dataKey: 'converted', stroke: CHART_PALETTE[3], name: 'Converted' },
  ];

  // Quick stats for header
  const quickStats = [
    { label: 'Total', value: stats.totalLeads, color: 'text-foreground' },
    { label: 'Contacted', value: stats.contacted, color: 'text-primary' },
    { label: 'Interested', value: stats.interested, color: 'text-warning' },
    { label: 'Converted', value: stats.converted, color: 'text-success' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Lead Performance</h2>
          <p className="text-sm text-muted-foreground mt-1">Track your lead pipeline and conversions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <Button onClick={handleExportPDF} disabled={exporting || loading}>
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => (
          <div key={idx} className="bg-card rounded-lg border border-border p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`font-mono text-2xl font-semibold tabular-nums ${stat.color} mt-1`}>{numberFormatter.format(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          icon={Users}
          label="Total Leads"
          value={numberFormatter.format(stats.totalLeads)}
          color="primary"
          loading={loading}
        />
        <StatCard
          icon={Target}
          label="Contacted"
          value={numberFormatter.format(stats.contacted)}
          color="muted"
          loading={loading}
        />
        <StatCard
          icon={Zap}
          label="Interested"
          value={numberFormatter.format(stats.interested)}
          color="warning"
          loading={loading}
        />
        <StatCard
          icon={Activity}
          label="Converted"
          value={numberFormatter.format(stats.converted)}
          color="success"
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
            <div className="animate-spin w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
          </div>
        ) : trendData.length > 0 ? (
          <LineChartComponent
            data={trendData}
            lines={leadLineChartLines}
            xAxisKey="label"
            height={320}
          />
        ) : (
          <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
            {errorMessage || 'No lead trend data available for the selected range.'}
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
              <div className="animate-spin w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
            </div>
          ) : categoryData.length > 0 ? (
            <PieChartComponent
              data={categoryData}
              dataKey="value"
              nameKey="name"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
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
              <div className="animate-spin w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
            </div>
          ) : statusData.length > 0 ? (
            <PieChartComponent
              data={statusData}
              dataKey="value"
              nameKey="name"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
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
                  { dataKey: 'leads', fill: CHART_PALETTE[0], name: 'Leads' },
                  { dataKey: 'conversion', fill: CHART_PALETTE[1], name: 'Conversion %' },
                ]}
                xAxisKey="country"
                height={260}
              />
              {/* Country List */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border">
                {countryData.slice(0, 6).map((country, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">{country.country}</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">{country.leads}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
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
              bars={[{ dataKey: 'value', fill: CHART_PALETTE[0], name: 'Leads' }]}
              xAxisKey="range"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
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
              { dataKey: 'leads', fill: CHART_PALETTE[0], name: 'Leads' },
              { dataKey: 'conversion', fill: CHART_PALETTE[1], name: 'Conversion %' },
            ]}
            xAxisKey="destination"
            height={300}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No destination data available
          </div>
        )}
      </ChartContainer>
    </div>
  );
};

export default LeadAnalytics;
