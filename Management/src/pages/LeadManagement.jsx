import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Settings,
  Loader2,
  AlertCircle,
  Users,
  TrendingUp,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { leadAPI, adminAPI } from "../services/api";
import toast from "react-hot-toast";
import LeadStats from "../features/lead-management/components/LeadStats";
import LeadFilters from "../features/lead-management/components/LeadFilters";
import LeadTable from "../features/lead-management/components/LeadTable";
import NewLeadDialog from "../features/lead-management/components/NewLeadDialog";
import EditLeadDialog from "../features/lead-management/components/EditLeadDialog";
import RemarksDialog from "../features/lead-management/components/RemarksDialog";
import FilterDialog from "../features/lead-management/components/FilterDialog";
import SettingsDialog from "../features/lead-management/components/SettingsDialog";
import StatusChangeDialog from "../features/lead-management/components/StatusChangeDialog";
import QuotationDialog from "../features/lead-management/components/QuotationDialog";
import InvoiceDialog from "../features/lead-management/components/InvoiceDialog";
import ReceiptDialog from "../features/lead-management/components/ReceiptDialog";
import VoucherDialog from "../features/lead-management/components/VoucherDialog";
import LeadSectionView from "../features/lead-management/components/LeadSectionView";
import ActiveSalesRepsDialog from "../features/lead-management/components/ActiveSalesRepsDialog";

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  interested: "bg-purple-100 text-purple-700",
  quoted: "bg-cyan-100 text-cyan-700",
  converted: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  not_interested: "bg-gray-100 text-gray-600",
};

const statusLabels = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  quoted: "Quoted",
  converted: "Converted",
  lost: "Lost",
  not_interested: "Not Interested",
};

const LeadManagement = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTravelDateStart, setFilterTravelDateStart] = useState("");
  const [filterTravelDateEnd, setFilterTravelDateEnd] = useState("");
  const [filterPlatforms, setFilterPlatforms] = useState([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRemarksDialog, setShowRemarksDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showActiveSalesRepsDialog, setShowActiveSalesRepsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [statusLead, setStatusLead] = useState(null);
  const [billingLead, setBillingLead] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [salesReps, setSalesReps] = useState([]);
  const [assignmentSettings, setAssignmentSettings] = useState({
    mode: "manual",
    strategy: "round-robin",
    requireActiveLogin: false,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const highlightedLeadId = searchParams.get("leadId");
  const hasJumpedToLead = useRef(false);
  const [sectionLead, setSectionLead] = useState(null);
  const [showSectionView, setShowSectionView] = useState(false);

  const leadsPerPage = 12;

  useEffect(() => {
    fetchLeads();
    fetchSalesReps();
    fetchAssignmentSettings();
  }, []);

  useEffect(() => {
    if (highlightedLeadId && leads.length > 0 && !hasJumpedToLead.current) {
      const leadIndex = filteredLeads.findIndex(
        (lead) =>
          (lead._id || lead.id)?.toString() === highlightedLeadId.toString()
      );

      if (leadIndex !== -1) {
        const targetPage = Math.floor(leadIndex / leadsPerPage) + 1;
        setCurrentPage(targetPage);
        hasJumpedToLead.current = true;
      }
    }
  }, [highlightedLeadId, leads, leadsPerPage]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        limit: 1000,
        page: 1,
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await leadAPI.getAllLeads(params);
      if (response.success) {
        const leadsData = Array.isArray(response.data)
          ? response.data
          : response.data?.leads || response.data?.data || [];
        setLeads(leadsData);
      } else {
        setLeads([]);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch leads");
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesReps = async () => {
    try {
      const response = await adminAPI.getSalesReps();
      // Handle both response formats: { success: true, data } and { status: 'success', data: { users } }
      if (response.success || response.status === 'success') {
        const repsData = Array.isArray(response.data)
          ? response.data
          : (response.data?.users || []);
        const formattedReps = repsData.map((rep) => ({
          id: rep._id || rep.id,
          _id: rep._id || rep.id,
          name: rep.name || rep.fullName || "Unknown",
          email: rep.email || "",
          isActive: rep.isActive !== false,
          isLoggedIn: rep.isLoggedIn || false,
        }));
        setSalesReps(formattedReps);
      }
    } catch (err) {
      console.error("Error fetching sales reps:", err);
    }
  };

  const fetchAssignmentSettings = async () => {
    try {
      const response = await adminAPI.getSettings();
      if (response.success && response.data) {
        // Map backend field names to frontend field names
        const data = response.data;
        setAssignmentSettings({
          mode: data.assignmentMode || "manual",
          strategy: data.autoStrategy === 'load_based' ? 'load-based' : 'round-robin',
          requireActiveLogin: data.requireActiveLogin48h || false,
        });
      }
    } catch (err) {
      console.error("Error fetching assignment settings:", err);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    const leadId = (lead._id || lead.id)?.toString() || "";
    const matchesSearch =
      (lead.name || "").toLowerCase().includes(searchLower) ||
      (lead.email || "").toLowerCase().includes(searchLower) ||
      (lead.phone || "").includes(searchTerm) ||
      (lead.city || "").toLowerCase().includes(searchLower) ||
      (lead.destination || "").toLowerCase().includes(searchLower) ||
      (lead.salesRep || "").toLowerCase().includes(searchLower) ||
      (lead.adviser || "").toLowerCase().includes(searchLower) ||
      leadId.toLowerCase().includes(searchLower) ||
      leadId.substring(0, 8).toLowerCase().includes(searchLower);
    const matchesStatus =
      filterStatus === "all" || lead.status === filterStatus;
    const matchesTravelDate =
      (!filterTravelDateStart ||
        (lead.travelDate || "") >= filterTravelDateStart) &&
      (!filterTravelDateEnd || (lead.travelDate || "") <= filterTravelDateEnd);
    const matchesPlatform =
      filterPlatforms.length === 0 || filterPlatforms.includes(lead.platform);
    const isHighlightedLead =
      highlightedLeadId && leadId === highlightedLeadId.toString();
    return (
      (matchesSearch &&
        matchesStatus &&
        matchesTravelDate &&
        matchesPlatform) ||
      isHighlightedLead
    );
  });

  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * leadsPerPage,
    currentPage * leadsPerPage
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLeadSuccess = () => {
    fetchLeads();
    if (highlightedLeadId) {
      setSearchParams({});
    }
  };

  const handleStatusChange = async (lead, newStatus) => {
    try {
      const leadId = lead._id || lead.id;
      await leadAPI.updateLeadStatus(leadId, newStatus);
      toast.success("Status updated successfully");
      fetchLeads();
    } catch (err) {
      toast.error("Failed to update status");
    }
    setShowStatusDialog(false);
    setStatusLead(null);
  };

  const statusCounts = useMemo(() => {
    const counts = { all: leads.length };
    Object.keys(statusLabels).forEach((status) => {
      counts[status] = leads.filter((l) => l.status === status).length;
    });
    return counts;
  }, [leads]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Lead Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Track and manage your leads efficiently
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchLeads}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowSettingsDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                {assignmentSettings.mode === "auto"
                  ? `Auto: ${assignmentSettings.strategy}`
                  : "Manual"}
              </button>
              <button
                onClick={() => setShowNewDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Lead
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <LeadStats
          leads={leads}
          salesReps={salesReps}
          onAssignSuccess={fetchLeads}
        />

        {/* Filters */}
        <LeadFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          statusCounts={statusCounts}
          onAdvancedFilterClick={() => setShowFilterDialog(true)}
        />

        {/* Lead Cards Grid */}
        {!loading && !error && filteredLeads.length > 0 && (
          <LeadTable
            leads={paginatedLeads}
            loading={loading}
            error={error}
            statusColors={statusColors}
            statusLabels={statusLabels}
            onLeadClick={(lead) => {
              setSelectedLead(lead);
              setShowEditDialog(true);
            }}
            onRemarksClick={(lead) => {
              setSelectedLead(lead);
              setShowRemarksDialog(true);
            }}
            onEditClick={(lead) => {
              setSelectedLead(lead);
              setShowEditDialog(true);
            }}
            onStatusClick={(lead) => {
              setStatusLead(lead);
              setShowStatusDialog(true);
            }}
            onQuotationClick={(lead) => {
              setBillingLead(lead);
              setShowQuotationDialog(true);
            }}
            onInvoiceClick={(lead) => {
              setBillingLead(lead);
              setShowInvoiceDialog(true);
            }}
            onReceiptClick={(lead) => {
              setBillingLead(lead);
              setShowReceiptDialog(true);
            }}
            onVoucherClick={(lead) => {
              setBillingLead(lead);
              setShowVoucherDialog(true);
            }}
            onSectionClick={(lead) => {
              setSectionLead(lead);
              setShowSectionView(true);
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            leadsPerPage={leadsPerPage}
            totalLeads={filteredLeads.length}
            highlightedLeadId={highlightedLeadId}
          />
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="mt-3 text-gray-600">Loading leads...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-red-200">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchLeads}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && filteredLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <Users className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No leads found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your filters"
                : "Create your first lead to get started"}
            </p>
            {!searchTerm && filterStatus === "all" && (
              <button
                onClick={() => setShowNewDialog(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create Lead
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <NewLeadDialog
        isOpen={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        salesReps={salesReps}
        assignmentSettings={assignmentSettings}
        onSuccess={handleLeadSuccess}
      />

      <EditLeadDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        salesReps={salesReps}
        onSuccess={handleLeadSuccess}
      />

      <RemarksDialog
        isOpen={showRemarksDialog}
        onClose={() => {
          setShowRemarksDialog(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onSuccess={handleLeadSuccess}
      />

      <FilterDialog
        isOpen={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        filterTravelDateStart={filterTravelDateStart}
        setFilterTravelDateStart={setFilterTravelDateStart}
        filterTravelDateEnd={filterTravelDateEnd}
        setFilterTravelDateEnd={setFilterTravelDateEnd}
        filterPlatforms={filterPlatforms}
        setFilterPlatforms={setFilterPlatforms}
      />

      <SettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        assignmentSettings={assignmentSettings}
        setAssignmentSettings={setAssignmentSettings}
        salesReps={salesReps}
        onViewActiveSalesReps={() => {
          setShowSettingsDialog(false);
          setShowActiveSalesRepsDialog(true);
        }}
      />

      <ActiveSalesRepsDialog
        isOpen={showActiveSalesRepsDialog}
        onClose={() => setShowActiveSalesRepsDialog(false)}
        requireActiveLogin48h={assignmentSettings.requireActiveLogin}
      />

      <StatusChangeDialog
        isOpen={showStatusDialog}
        onClose={() => {
          setShowStatusDialog(false);
          setStatusLead(null);
        }}
        lead={statusLead}
        statusLabels={statusLabels}
        statusColors={statusColors}
        onStatusChange={handleStatusChange}
      />

      {showQuotationDialog && billingLead && (
        <QuotationDialog
          isOpen={showQuotationDialog}
          onClose={() => {
            setShowQuotationDialog(false);
            setBillingLead(null);
          }}
          lead={billingLead}
          onSuccess={handleLeadSuccess}
        />
      )}

      {showInvoiceDialog && billingLead && (
        <InvoiceDialog
          isOpen={showInvoiceDialog}
          onClose={() => {
            setShowInvoiceDialog(false);
            setBillingLead(null);
          }}
          lead={billingLead}
          onSuccess={handleLeadSuccess}
        />
      )}

      {showReceiptDialog && billingLead && (
        <ReceiptDialog
          isOpen={showReceiptDialog}
          onClose={() => {
            setShowReceiptDialog(false);
            setBillingLead(null);
          }}
          lead={billingLead}
          onSuccess={handleLeadSuccess}
        />
      )}

      {showVoucherDialog && billingLead && (
        <VoucherDialog
          isOpen={showVoucherDialog}
          onClose={() => {
            setShowVoucherDialog(false);
            setBillingLead(null);
          }}
          lead={billingLead}
          onSuccess={handleLeadSuccess}
        />
      )}

      {showSectionView && sectionLead && (
        <LeadSectionView
          lead={sectionLead}
          onClose={() => {
            setShowSectionView(false);
            setSectionLead(null);
          }}
        />
      )}
    </div>
  );
};

export default LeadManagement;
