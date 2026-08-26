import { useEffect, useState } from 'react';
import { TimeRangeFilter } from '../Common';
import { Users, Target, Activity, Zap } from 'lucide-react';
import AnalyticsService from '../../../../services/analytics.service';
import { StatCard } from '../../../../components/shared/StatCard';
import { DataTable, type DataTableColumn } from '../../../../components/shared/DataTable';
import { Badge } from '../../../../components/ui/badge';

interface RecentLead {
  id: string;
  name?: string;
  email?: string;
  status: string;
  createdAt?: string;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  CONFIRMED: 'bg-success/10 text-success border-transparent',
  CLOSED_LOST: 'bg-destructive/10 text-destructive border-transparent',
  CANCELLED: 'bg-destructive/10 text-destructive border-transparent',
  BOOKING_FAILED: 'bg-destructive/10 text-destructive border-transparent',
};

/**
 * MyPerformanceAnalytics Component
 * Personal, self-scoped performance view for a salesRep — backed by
 * GET /analytics/salesreps/me/performance, which is already scoped to
 * req.user.id server-side.
 */
const MyPerformanceAnalytics = () => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState({
    leadsAssigned: 0,
    converted: 0,
    pending: 0,
    conversionRate: 0,
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const data = await AnalyticsService.getSalesRepPerformance(timeRange);
        setPerformance(data?.performance || { leadsAssigned: 0, converted: 0, pending: 0, conversionRate: 0 });
        setRecentLeads(data?.recentLeads || []);
      } catch (error: any) {
        console.error('Failed to load salesRep performance', error);
        setErrorMessage(error.message || 'Failed to load your performance data.');
        setPerformance({ leadsAssigned: 0, converted: 0, pending: 0, conversionRate: 0 });
        setRecentLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [timeRange]);

  const columns: DataTableColumn<RecentLead>[] = [
    { key: 'name', header: 'Name', render: (lead) => <span className="font-medium text-foreground">{lead.name || '—'}</span> },
    { key: 'email', header: 'Email', render: (lead) => lead.email || '—' },
    {
      key: 'status', header: 'Status', render: (lead) => (
        <Badge className={STATUS_BADGE_CLASSES[lead.status] || 'bg-muted text-muted-foreground border-transparent'}>
          {lead.status}
        </Badge>
      )
    },
    {
      key: 'createdAt', header: 'Created', render: (lead) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">My Performance</h2>
          <p className="text-sm text-muted-foreground mt-1">Your personal leads and conversion metrics for this period</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard icon={Users} label="Leads Assigned" value={performance.leadsAssigned} color="muted" loading={loading} />
        <StatCard icon={Target} label="Converted" value={performance.converted} color="success" loading={loading} />
        <StatCard icon={Activity} label="Pending" value={performance.pending} color="warning" loading={loading} />
        <StatCard icon={Zap} label="Conversion Rate" value={performance.conversionRate} unit="%" color="primary" loading={loading} />
      </div>

      {/* Recent Leads */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Leads</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Your 10 most recently assigned leads in this period</p>
        </div>

        {!loading && recentLeads.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border border-border rounded-lg bg-card">
            {errorMessage || 'No leads assigned to you in this period.'}
          </div>
        ) : (
          <DataTable columns={columns} data={recentLeads} getRowKey={(lead) => lead.id} loading={loading} />
        )}
      </div>
    </div>
  );
};

export default MyPerformanceAnalytics;
