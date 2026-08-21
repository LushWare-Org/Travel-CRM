import { useEffect, useState } from "react";
import { TimeRangeFilter, StatCard } from "../Common";
import { Users, Target, Activity, Zap } from "lucide-react";
import AnalyticsService from "../../../../services/analytics.service";

const STATUS_COLORS = {
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CLOSED_LOST: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-rose-100 text-rose-700",
  BOOKING_FAILED: "bg-rose-100 text-rose-700",
};

/**
 * MyPerformanceAnalytics Component
 * Personal, self-scoped performance view for a salesRep — backed by
 * GET /analytics/salesreps/me/performance, which is already scoped to
 * req.user.id server-side.
 */
const MyPerformanceAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState({
    leadsAssigned: 0,
    converted: 0,
    pending: 0,
    conversionRate: 0,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const data = await AnalyticsService.getSalesRepPerformance(timeRange);
        setPerformance(data?.performance || { leadsAssigned: 0, converted: 0, pending: 0, conversionRate: 0 });
        setRecentLeads(data?.recentLeads || []);
      } catch (error) {
        console.error("Failed to load salesRep performance", error);
        setErrorMessage(error.message || "Failed to load your performance data.");
        setPerformance({ leadsAssigned: 0, converted: 0, pending: 0, conversionRate: 0 });
        setRecentLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [timeRange]);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Performance</h2>
          <p className="text-sm text-slate-500 mt-1">Your personal leads and conversion metrics for this period</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard icon={Users} label="Leads Assigned" value={performance.leadsAssigned} color="blue" loading={loading} />
        <StatCard icon={Target} label="Converted" value={performance.converted} color="green" loading={loading} />
        <StatCard icon={Activity} label="Pending" value={performance.pending} color="orange" loading={loading} />
        <StatCard icon={Zap} label="Conversion Rate" value={performance.conversionRate} unit="%" color="purple" loading={loading} />
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Recent Leads</h3>
          <p className="text-xs text-slate-400 mt-0.5">Your 10 most recently assigned leads in this period</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
          </div>
        ) : recentLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 text-slate-800 font-medium">{lead.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-500">{lead.email || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[lead.status] || "bg-slate-100 text-slate-600"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            {errorMessage || "No leads assigned to you in this period."}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPerformanceAnalytics;
