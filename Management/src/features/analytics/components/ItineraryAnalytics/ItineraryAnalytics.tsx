import { useState, useEffect } from 'react';
import {
  TimeRangeFilter,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
} from '../Common';
import { CHART_PALETTE } from '../Common/chartTheme';
import { ShoppingCart, TrendingUp, Download, Briefcase, Star } from 'lucide-react';
import AnalyticsService from '../../../../services/analytics.service';
import { exportPackageAnalyticsPDF } from '../../utils/exportAnalytics';
import toast from '@/lib/toast';
import { StatCard } from '../../../../components/shared/StatCard';
import { Button } from '../../../../components/ui/button';

/**
 * PackageAnalytics Component
 */
const PackageAnalytics = () => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const packageLines = [
    { dataKey: 'inquiries', stroke: CHART_PALETTE[0], name: 'Inquiries' },
    { dataKey: 'conversions', stroke: CHART_PALETTE[1], name: 'Conversions' },
  ];

  const destinationBars = [
    { dataKey: 'inquiries', fill: CHART_PALETTE[0], name: 'Inquiries' },
    { dataKey: 'conversions', fill: CHART_PALETTE[1], name: 'Conversions' },
  ];

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await AnalyticsService.getPackageAnalyticsOverview(timeRange);
        setAnalyticsData(data);
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.message);
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, [timeRange]);

  const data = analyticsData || {
    stats: { totalItineraries: 0, totalInquiries: 0, totalConversions: 0 },
    trend: [],
    mostInquired: [],
    destinationPerformance: [],
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const toastId = toast.loading('Preparing package analytics PDF...');
      const summaryMetrics = [
        { label: 'Published Packages', value: data.stats.totalItineraries },
        { label: 'Lead Inquiries', value: data.stats.totalInquiries },
        { label: 'Conversions', value: data.stats.totalConversions },
        { label: 'Time Range', value: timeRange.toUpperCase() },
      ];
      await exportPackageAnalyticsPDF({ timeRange, summaryMetrics });
      toast.dismiss(toastId);
      toast.success('Package analytics PDF downloaded successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export analytics PDF');
    } finally {
      setExporting(false);
    }
  };

  const conversionRate = data.stats.totalInquiries > 0
    ? ((data.stats.totalConversions / data.stats.totalInquiries) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Package Performance</h2>
          <p className="text-sm text-muted-foreground mt-1">Track inquiries and conversions for published packages</p>
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
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
        <StatCard icon={Briefcase} label="Packages" value={data.stats.totalItineraries} subtitle="Published & active" color="muted" />
        <StatCard icon={TrendingUp} label="Inquiries" value={data.stats.totalInquiries} subtitle="Leads generated" color="primary" />
        <StatCard icon={ShoppingCart} label="Conversions" value={data.stats.totalConversions} subtitle="Bookings made" color="success" />
        <StatCard icon={Star} label="Conversion Rate" value={conversionRate} unit="%" subtitle="Inquiry to booking" color="primary" />
      </div>

      {/* Trend Chart - Full Width */}
      <ChartContainer
        title="Inquiry & Conversion Trends"
        description={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} performance trends`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
          </div>
        ) : data.trend.length > 0 ? (
          <LineChartComponent
            data={data.trend}
            lines={packageLines}
            xAxisKey="month"
            height={300}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No trend data available
          </div>
        )}
      </ChartContainer>

      {/* Destination Performance - Full Width */}
      <ChartContainer
        title="Destination Performance"
        description="Inquiries and conversions by destination"
      >
        {loading ? (
          <div className="flex items-center justify-center h-[320px]">
            <div className="animate-spin w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
          </div>
        ) : data.destinationPerformance.length > 0 ? (
          <BarChartComponent
            data={data.destinationPerformance}
            bars={destinationBars}
            xAxisKey="destination"
            height={320}
          />
        ) : (
          <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
            No destination data available
          </div>
        )}
      </ChartContainer>

      {/* Top Packages */}
      <ChartContainer
        title="Top Packages"
        description="Most inquired and converted packages"
      >
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
          </div>
        ) : data.mostInquired.length > 0 ? (
          <div className="space-y-4">
            <BarChartComponent
              data={data.mostInquired}
              bars={destinationBars}
              xAxisKey="name"
              height={280}
            />
            {/* Package List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-border">
              {data.mostInquired.slice(0, 6).map((pkg: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[150px]">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">{pkg.inquiries} inquiries</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums text-success">{pkg.conversions}</p>
                    <p className="text-xs text-muted-foreground">converted</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No package data available
          </div>
        )}
      </ChartContainer>
    </div>
  );
};

export default PackageAnalytics;
