const LeadStats = ({ totalLeads, leads = [] }) => {
  // Calculate this month's leads
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthLeads = leads.filter(lead => {
    const leadDate = new Date(lead.createdAt || lead.leadDateTime || lead.createdAt);
    return leadDate >= startOfMonth;
  });

  // Calculate conversion rate for this month
  const convertedThisMonth = thisMonthLeads.filter(lead => lead.status === 'converted').length;
  const conversionRate = thisMonthLeads.length > 0 
    ? ((convertedThisMonth / thisMonthLeads.length) * 100).toFixed(1)
    : '0.0';

  // Calculate average response time (time from lead creation to first remark or status change)
  const calculateResponseTime = (lead) => {
    const leadDate = new Date(lead.createdAt || lead.leadDateTime);
    if (!leadDate || isNaN(leadDate.getTime())) return null;

    const responseTimes = [];

    // Check statusHistory for first status change (most accurate)
    if (lead.statusHistory && lead.statusHistory.length > 0) {
      const firstStatusChange = lead.statusHistory
        .map(s => new Date(s.changedAt))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a - b)[0];
      
      if (firstStatusChange && firstStatusChange > leadDate) {
        responseTimes.push((firstStatusChange - leadDate) / (1000 * 60 * 60 * 24));
      }
    }

    // Check if there are remarks
    if (lead.remarks && lead.remarks.length > 0) {
      const firstRemark = lead.remarks
        .map(r => new Date(r.date || r.addedAt))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a - b)[0];
      
      if (firstRemark && firstRemark > leadDate) {
        responseTimes.push((firstRemark - leadDate) / (1000 * 60 * 60 * 24));
      }
    }

    // If no statusHistory or remarks, check if status changed from 'new' (using updatedAt as proxy)
    if (responseTimes.length === 0 && lead.status && lead.status !== 'new' && lead.updatedAt) {
      const updatedDate = new Date(lead.updatedAt);
      if (!isNaN(updatedDate.getTime()) && updatedDate > leadDate) {
        responseTimes.push((updatedDate - leadDate) / (1000 * 60 * 60 * 24));
      }
    }

    // Return the earliest response time
    return responseTimes.length > 0 ? Math.min(...responseTimes) : null;
  };

  // Calculate average response time for this month's leads
  const responseTimes = thisMonthLeads
    .map(calculateResponseTime)
    .filter(time => time !== null && time >= 0);

  const avgResponseTime = responseTimes.length > 0
    ? (responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(1)
    : '0.0';

  const formatResponseTime = (days) => {
    const numDays = parseFloat(days);
    if (numDays < 1) {
      const hours = Math.round(numDays * 24);
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else if (numDays < 7) {
      return numDays === 1 ? '1 day' : `${numDays} days`;
    } else {
      const weeks = (numDays / 7).toFixed(1);
      return weeks === '1.0' ? '1 week' : `${weeks} weeks`;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium">Total Leads</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{totalLeads}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium">This Month</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{thisMonthLeads.length}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium">Conversion Rate</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{conversionRate}%</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium">Avg. Response Time</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatResponseTime(avgResponseTime)}</p>
      </div>
    </div>
  );
};

export default LeadStats;

