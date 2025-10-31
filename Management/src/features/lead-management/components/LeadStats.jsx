const LeadStats = ({ totalLeads }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium">Total Leads</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{totalLeads}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium">This Month</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">8</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium">Conversion Rate</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">18.5%</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium">Avg. Response Time</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">2.3 days</p>
      </div>
    </div>
  );
};

export default LeadStats;

