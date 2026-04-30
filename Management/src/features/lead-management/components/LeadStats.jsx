import { useState, useMemo } from "react";
import {
  Users, UserCheck, UserX, TrendingUp, BarChart3,
  ChevronRight, X, Search, Loader2
} from "lucide-react";
import { leadAPI } from "../../../services/api";
import toast from "react-hot-toast";

const LeadStats = ({ summary, salesReps, onAssignSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalLeads, setModalLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRep, setSelectedRep] = useState("");
  const [assigningLeads, setAssigningLeads] = useState({});

  // Fallback if summary is not yet loaded
  const stats = summary || { total: 0, assigned: 0, unassigned: 0, converted: 0, conversionRate: "0.0" };

  const handleStatClick = async (type) => {
    // We now fetch these lists from server, or we can just disable click-to-view for now
    // if performance allows, we can add it back with an API call:
    try {
      let filtered = [];
      const res = await leadAPI.getAllLeads({ limit: 50, status: type === 'converted' ? 'converted' : undefined });
      const apiLeads = res.data?.leads || res.data || [];
      if (type === "total") filtered = apiLeads;
      else if (type === "assigned") filtered = apiLeads.filter((l) => l.assignedTo || l.salesRep);
      else if (type === "unassigned") filtered = apiLeads.filter((l) => !l.assignedTo && !l.salesRep);

      setModalType(type);
      setModalLeads(filtered);
      setShowModal(true);
      setSearchTerm("");
      setSelectedRep("");
    } catch (e) {
      toast.error("Failed to load leads list");
    }
  };

  const handleAssign = async (leadId, repId) => {
    if (!repId) return;
    setAssigningLeads((prev) => ({ ...prev, [leadId]: true }));
    try {
      await leadAPI.assignLead(leadId, repId);
      toast.success("Lead assigned successfully");
      onAssignSuccess?.();
      setModalLeads((prev) => prev.filter((l) => (l._id || l.id) !== leadId));
    } catch (err) {
      toast.error("Failed to assign lead");
    } finally {
      setAssigningLeads((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  const filteredModalLeads = modalLeads.filter((lead) => {
    const search = searchTerm.toLowerCase();
    return (
      (lead.name || "").toLowerCase().includes(search) ||
      (lead.email || "").toLowerCase().includes(search) ||
      (lead.phone || "").includes(search)
    );
  });

  const statCards = [
    {
      key: "total",
      label: "Total Leads",
      value: stats.total,
      icon: Users,
      color: "text-gray-600",
      bg: "bg-gray-50",
      border: "border-gray-200"
    },
    {
      key: "assigned",
      label: "Assigned",
      value: stats.assigned,
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200"
    },
    {
      key: "unassigned",
      label: "Unassigned",
      value: stats.unassigned,
      icon: UserX,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200"
    },
    {
      key: "conversion",
      label: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      clickable: false
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isClickable = stat.clickable !== false && stat.key !== "conversion";

          return (
            <div
              key={stat.key}
              onClick={() => isClickable && handleStatClick(stat.key)}
              className={`bg-white rounded-xl border ${stat.border} p-3 sm:p-5 ${isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""
                }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                {isClickable && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="mt-4">
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {modalType} Leads
                </h3>
                <p className="text-sm text-gray-500">{filteredModalLeads.length} leads</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-180px)]">
              {filteredModalLeads.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>No leads found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredModalLeads.map((lead) => {
                    const leadId = lead._id || lead.id;
                    const isAssigning = assigningLeads[leadId];

                    return (
                      <div key={leadId} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                            <p className="text-sm text-gray-500 truncate">
                              {lead.phone} • {lead.destination || "No destination"}
                            </p>
                          </div>

                          {modalType === "unassigned" && (
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={selectedRep}
                                onChange={(e) => setSelectedRep(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Rep</option>
                                {salesReps.map((rep) => (
                                  <option key={rep.id} value={rep.id}>{rep.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssign(leadId, selectedRep)}
                                disabled={!selectedRep || isAssigning}
                                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isAssigning ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Assign"
                                )}
                              </button>
                            </div>
                          )}

                          {modalType !== "unassigned" && (
                            <span className="text-sm text-gray-500">
                              {lead.salesRep || lead.adviser || "Unassigned"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadStats;
