import { Search, X, Filter } from "lucide-react";

const LeadFilters = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  statusCounts,
  onAdvancedFilterClick,
}) => {
  // Lifecycle status configuration matching the 10-state system
  const statuses = [
    { key: "all", label: "All", shortLabel: "All", color: "bg-gray-500", lightBg: "bg-gray-100", textColor: "text-gray-600" },
    { key: "NEW", label: "New", shortLabel: "New", color: "bg-blue-500", lightBg: "bg-blue-100", textColor: "text-blue-600" },
    { key: "DRAFTING", label: "Drafting", shortLabel: "Draft", color: "bg-indigo-500", lightBg: "bg-indigo-100", textColor: "text-indigo-600" },
    { key: "QUOTED", label: "Quoted", shortLabel: "Quot.", color: "bg-cyan-500", lightBg: "bg-cyan-100", textColor: "text-cyan-600" },
    { key: "APPROVED", label: "Approved", shortLabel: "Appr.", color: "bg-emerald-500", lightBg: "bg-emerald-100", textColor: "text-emerald-600" },
    { key: "BOOKING_IN_PROGRESS", label: "Booking", shortLabel: "Book", color: "bg-purple-500", lightBg: "bg-purple-100", textColor: "text-purple-600" },
    { key: "CONFIRMED", label: "Confirmed", shortLabel: "Conf.", color: "bg-green-500", lightBg: "bg-green-100", textColor: "text-green-600" },
    { key: "CLOSED_LOST", label: "Lost", shortLabel: "Lost", color: "bg-red-500", lightBg: "bg-red-100", textColor: "text-red-600" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative flex-1">
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status Tabs - Grid on mobile, inline on desktop */}
          <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-1.5 sm:overflow-x-auto sm:pb-0 sm:scrollbar-hide">
            {statuses.map((status) => {
              const isActive = filterStatus === status.key;
              const count = statusCounts[status.key] || 0;

            return (
              <button
                key={status.key}
                onClick={() => setFilterStatus(status.key)}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${isActive
                    ? `${status.color} text-white shadow-md`
                    : `${status.lightBg} ${status.textColor} hover:opacity-80`
                  }`}
              >
                {/* Color dot indicator - hidden on mobile for space */}
                {!isActive && status.key !== "all" && (
                  <span className={`hidden sm:block w-2 h-2 rounded-full ${status.color}`} />
                )}
                <span className="sm:hidden">{status.shortLabel}</span>
                <span className="hidden sm:inline">{status.label}</span>
                <span
                  className={`px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${isActive
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
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap sm:shrink-0"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
        </div>
      </div>
    </div>
  );
};

export default LeadFilters;
