import { Search, Filter } from 'lucide-react';

const LeadFilters = ({ 
  searchTerm, 
  onSearchChange, 
  onFilterClick,
  filterStatus,
  onFilterStatusChange,
  statusCounts,
  loading,
  statusColors,
  statusLabels
}) => {
  // Default status colors if not provided
  const safeStatusColors = statusColors || {};
  
  const statusButtons = [
    { key: "all", label: "All Leads", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: "bg-white", textColor: "text-gray-700" },
    { key: "new", label: "New", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: safeStatusColors.new?.tab || "bg-blue-100 text-blue-800", textColor: "text-blue-800" },
    { key: "contacted", label: "Contacted", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: safeStatusColors.contacted?.tab || "bg-yellow-100 text-yellow-800", textColor: "text-yellow-800" },
    { key: "interested", label: "Interested", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: safeStatusColors.interested?.tab || "bg-purple-100 text-purple-800", textColor: "text-purple-800" },
    { key: "quoted", label: "Quoted", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: safeStatusColors.quoted?.tab || "bg-cyan-100 text-cyan-800", textColor: "text-cyan-800" },
    { key: "converted", label: "Converted", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: safeStatusColors.converted?.tab || "bg-green-100 text-green-800", textColor: "text-green-800" },
    { key: "lost", label: "Loss", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: safeStatusColors.lost?.tab || "bg-red-100 text-red-800", textColor: "text-red-800" },
    { key: "not-interested", label: "Not Interested", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: safeStatusColors["not-interested"]?.tab || "bg-gray-100 text-gray-800", textColor: "text-gray-800" },
  ];

  return (
    <>
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, contact, city, destination, or sales rep..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onFilterClick}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusButtons.map(({ key, label, activeBg, inactiveBg, textColor }) => (
          <button
            key={key}
            onClick={() => onFilterStatusChange(key)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors shadow-sm ${
              filterStatus === key
                ? `${activeBg} text-white`
                : `${inactiveBg} border border-gray-300 ${textColor} hover:bg-slate-200`
            }`}
          >
            {label}
            <span className="ml-2 text-xs bg-opacity-20 bg-gray-200 px-2 py-1 rounded-full">
              {loading ? 0 : (statusCounts[key] || 0)}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};

export default LeadFilters;

