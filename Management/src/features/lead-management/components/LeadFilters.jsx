import { Search, X, Filter } from "lucide-react";

const LeadFilters = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  statusCounts,
  onAdvancedFilterClick,
}) => {
  // Status configuration with colors matching the lead cards
  const statuses = [
    { key: "all", label: "All", color: "bg-gray-500", lightBg: "bg-gray-100", textColor: "text-gray-600" },
    { key: "new", label: "New", color: "bg-blue-500", lightBg: "bg-blue-100", textColor: "text-blue-600" },
    { key: "contacted", label: "Contacted", color: "bg-cyan-500", lightBg: "bg-cyan-100", textColor: "text-cyan-600" },
    { key: "interested", label: "Interested", color: "bg-purple-500", lightBg: "bg-purple-100", textColor: "text-purple-600" },
    { key: "quoted", label: "Quoted", color: "bg-amber-500", lightBg: "bg-amber-100", textColor: "text-amber-600" },
    { key: "converted", label: "Converted", color: "bg-emerald-500", lightBg: "bg-emerald-100", textColor: "text-emerald-600" },
    { key: "lost", label: "Lost", color: "bg-red-500", lightBg: "bg-red-100", textColor: "text-red-600" },
    { key: "not_interested", label: "Not Interested", color: "bg-gray-400", lightBg: "bg-gray-100", textColor: "text-gray-500" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Status Tabs with Colors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {statuses.map((status) => {
            const isActive = filterStatus === status.key;
            const count = statusCounts[status.key] || 0;

            return (
              <button
                key={status.key}
                onClick={() => setFilterStatus(status.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive
                    ? `${status.color} text-white shadow-md`
                    : `${status.lightBg} ${status.textColor} hover:opacity-80`
                  }`}
              >
                {/* Color dot indicator */}
                {!isActive && status.key !== "all" && (
                  <span className={`w-2 h-2 rounded-full ${status.color}`} />
                )}
                <span>{status.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-semibold ${isActive
                      ? "bg-white/25 text-white"
                      : "bg-white text-gray-600"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Advanced Filters */}
        <button
          onClick={onAdvancedFilterClick}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>
    </div>
  );
};

export default LeadFilters;
