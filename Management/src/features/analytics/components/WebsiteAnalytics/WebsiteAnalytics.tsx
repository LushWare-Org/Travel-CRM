import { useState, useEffect } from 'react';
import {
  TimeRangeFilter,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from '../Common';
import { CHART_PALETTE } from '../Common/chartTheme';
import { Search, MapPin, TrendingUp, Download, Target } from 'lucide-react';
import { exportWebsiteAnalyticsPDF } from '../../utils/exportAnalytics';
import toast from '@/lib/toast';
import AnalyticsService from '../../../../services/analytics.service';
import { StatCard } from '../../../../components/shared/StatCard';
import { Button } from '../../../../components/ui/button';

/**
 * WebsiteAnalytics Component
 */
const WebsiteAnalytics = () => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await AnalyticsService.getWebsiteAnalyticsOverview(timeRange);
        setAnalyticsData(data);
      } catch (err: any) {
        console.error('Error fetching website analytics:', err);
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, [timeRange]);

  const data = analyticsData || {
    stats: {
      totalSearches: 0,
      totalBookings: 0,
      uniqueDestinations: 0,
      uniqueActivities: 0,
      conversionRate: 0,
    },
    trend: [],
    topDestinations: [],
    accommodationTypes: [],
    durationPreferences: [],
    priceRanges: [],
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const toastId = toast.loading('Preparing website analytics PDF...');
      const summaryMetrics = [
        { label: 'Total Inquiries', value: data.stats.totalSearches || 0 },
        { label: 'Total Bookings', value: data.stats.totalBookings || 0 },
        { label: 'Top Destinations', value: data.stats.uniqueDestinations || 0 },
        { label: 'Activities Offered', value: data.stats.uniqueActivities || 0 },
        { label: 'Time Range', value: timeRange.toUpperCase() },
      ];
      await exportWebsiteAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success('Website analytics PDF downloaded successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export analytics PDF');
    } finally {
      setExporting(false);
    }
  };

  const searchLines = [
    { dataKey: 'searches', stroke: CHART_PALETTE[0], name: 'Inquiries' },
    { dataKey: 'conversions', stroke: CHART_PALETTE[1], name: 'Bookings' },
  ];

  const destinationBars = [
    { dataKey: 'searches', fill: CHART_PALETTE[0], name: 'Inquiries' },
    { dataKey: 'conversions', fill: CHART_PALETTE[1], name: 'Conversions' },
  ];

  const durationBars = [
    { dataKey: 'searches', fill: CHART_PALETTE[0], name: 'Inquiries' },
    { dataKey: 'bookings', fill: CHART_PALETTE[1], name: 'Bookings' },
  ];

  const conversionRate = data.stats.totalSearches > 0
    ? ((data.stats.totalBookings / data.stats.totalSearches) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Website Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">Customer inquiry and booking patterns</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-10 h-10 border-4 border-muted border-t-primary rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Website Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">Customer inquiry and booking patterns</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
          <p className="text-destructive font-semibold">Error Loading Analytics</p>
          <p className="text-destructive/80 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Website Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Customer inquiry and booking conversion patterns</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          <Button onClick={handleExportPDF} disabled={exporting || loading}>
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Search} label="Inquiries" value={data.stats.totalSearches || 0} subtitle="Lead inquiries" color="primary" />
        <StatCard icon={TrendingUp} label="Bookings" value={data.stats.totalBookings || 0} subtitle="Confirmed bookings" color="success" />
        <StatCard icon={MapPin} label="Destinations" value={data.stats.uniqueDestinations || 0} subtitle="Unique locations" color="muted" />
        <StatCard icon={Target} label="Conversion" value={conversionRate} unit="%" subtitle="Inquiry to booking" color="muted" />
      </div>

      {/* Trend Chart - Full Width */}
      <ChartContainer
        title="Inquiry & Booking Trends"
        description="Customer engagement over time"
      >
        {data.trend?.length > 0 ? (
          <LineChartComponent
            data={data.trend}
            lines={searchLines}
            xAxisKey="label"
            height={300}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No trend data available
          </div>
        )}
      </ChartContainer>

      {/* Destination & Price Range - 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Destinations"
          description="Most inquired destinations"
        >
          {data.topDestinations?.length > 0 ? (
            <BarChartComponent
              data={data.topDestinations}
              bars={destinationBars}
              xAxisKey="destination"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              No destination data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Price Range Distribution"
          description="Inquiries by budget"
        >
          {data.priceRanges?.length > 0 ? (
            <BarChartComponent
              data={data.priceRanges}
              bars={[{ dataKey: 'searches', fill: CHART_PALETTE[0], name: 'Inquiries' }]}
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

      {/* Accommodation & Duration - 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer
          title="Accommodation Preferences"
          description="Popular accommodation types"
        >
          {data.accommodationTypes?.length > 0 ? (
            <PieChartComponent
              data={data.accommodationTypes}
              dataKey="value"
              nameKey="name"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              No accommodation data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Duration Preferences"
          description="Package duration popularity"
        >
          {data.durationPreferences?.length > 0 ? (
            <BarChartComponent
              data={data.durationPreferences}
              bars={durationBars}
              xAxisKey="duration"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              No duration data available
            </div>
          )}
        </ChartContainer>
      </div>
    </div>
  );
};

export default WebsiteAnalytics;
