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
  LayoutGrid,
  List,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { leadAPI, adminAPI, authAPI } from "../services/api";
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
import { LIFECYCLE_STATUS_COLORS, LIFECYCLE_STATUS_LABELS } from "../features/lead-management/components/LeadStatusBadge";

// Lifecycle status maps (10 states) plus old-status fallbacks
const statusColors = {
  ...LIFECYCLE_STATUS_COLORS,
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  interested: "bg-purple-100 text-purple-700",
  quoted: "bg-cyan-100 text-cyan-700",
  converted: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  not_interested: "bg-gray-100 text-gray-600",
};

const statusLabels = {
  ...LIFECYCLE_STATUS_LABELS,
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
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTravelDateStart, setFilterTravelDateStart] = useState("");
  const [filterTravelDateEnd, setFilterTravelDateEnd] = useState("");
  const [filterPlatforms, setFilterPlatforms] = useState([]);
  
  const [statsSummary, setStatsSummary] = useState(null);
  const [statusCounts, setStatusCounts] = useState({ all: 0 });
  
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
  const [sectionLead, setSectionLead] = useState(null);
  const [showSectionView, setShowSectionView] = useState(false);
  
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
  
  const currentUser = authAPI.getStoredUser();
  const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'super-admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'super_admin';

  const handleDeleteLead = async (leadId) => {
    try {
      const response = await leadAPI.deleteLead(leadId);
      if (response.success) {
        toast.success("Lead deleted successfully");
        fetchLeads();
        fetchLeadStats();
      } else {
        toast.error(response.message || "Failed to delete lead");
      }
    } catch (err) {
      toast.error(err.message || "Error deleting lead");
    }
  };
  
  // Mobile responsive view mode auto-detection
  const [viewMode, setViewMode] = useState(window.innerWidth < 1024 ? 'grid' : 'table');

  const leadsPerPage = 12;

  // Handle window resize for responsive view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setViewMode('grid');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debounce Search Term to prevent spamming the API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Refetch leads when filters or page change
  useEffect(() => {
    fetchLeads();
    fetchLeadStats();
  }, [debouncedSearch, filterStatus, filterTravelDateStart, filterTravelDateEnd, filterPlatforms, currentPage]);

  useEffect(() => {
    fetchSalesReps();
    fetchAssignmentSettings();
    fetchLeadStats();
  }, []);

  const fetchLeadStats = async () => {
    try {
      const response = await leadAPI.getLeadStats();
      if (response.success) {
        setStatsSummary(response.summary || null);
        const transformedCounts = { all: response.summary?.total || 0 };
        (response.data || []).forEach(item => {
          transformedCounts[item._id] = item.count;
        });
        setStatusCounts(transformedCounts);
      }
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        limit: leadsPerPage,
        page: currentPage,
      };
      
      if (debouncedSearch) params.query = debouncedSearch; // The backend uses ?query= for search
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterTravelDateStart) params['travelDate[gte]'] = filterTravelDateStart;
      if (filterTravelDateEnd) params['travelDate[lte]'] = filterTravelDateEnd;
      if (filterPlatforms.length > 0) params.platform = filterPlatforms.join(',');
      
      // Note: backend search uses leadAPI.searchLeads for query, but standard filters for standard endpoint.
      // If there is a search term, use the search endpoint, else standard endpoint.
      let response;
      if (debouncedSearch) {
        response = await leadAPI.searchLeads(debouncedSearch);
        // The search endpoint might not have full pagination built the same way
      } else {
        response = await leadAPI.getAllLeads(params);
      }

      if (response.success) {
        const leadsData = Array.isArray(response.data) ? response.data : response.data?.leads || [];
        setLeads(leadsData);
        
        // Handle pagination metadata from server
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1);
          setTotalLeads(response.pagination.total || leadsData.length);
        } else {
          // Fallback if search endpoint doesn't return pagination
          setTotalPages(1);
          setTotalLeads(response.count || leadsData.length);
        }
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
    // ... existing logic ...
    try {
      const response = await adminAPI.getSalesReps();
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
    } catch (err) {}
  };

  const fetchAssignmentSettings = async () => {
    // ... existing logic ...
    try {
      const response = await adminAPI.getSettings();
      if (response.success && response.data) {
        const data = response.data;
        setAssignmentSettings({
          mode: data.assignmentMode || "manual",
          strategy: data.autoStrategy === 'load_based' ? 'load-based' : 'round-robin',
          requireActiveLogin: data.requireActiveLogin48h || false,
        });
      }
    } catch (err) {}
  };

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

  const handleStatusChange = async (lead, newStatus, reason) => {
    try {
      const leadId = lead._id || lead.id;
      const payload = { lifecycleStatus: newStatus };
      if (reason) payload.lostReason = reason;
      await leadAPI.updateLead(leadId, payload);
      toast.success("Status updated successfully");
      fetchLeads();
      fetchLeadStats();
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
    setShowStatusDialog(false);
    setStatusLead(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="pl-10 md:pl-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Lead Management</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Track and manage your leads efficiently
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={fetchLeads}
                disabled={loading}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setShowSettingsDialog(true)}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">{assignmentSettings.mode === "auto"
                  ? `Auto: ${assignmentSettings.strategy}`
                  : "Manual"}</span>
              </button>
              <button
                onClick={() => setShowNewDialog(true)}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">New Lead</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <LeadStats
          summary={statsSummary}
          salesReps={salesReps}
          onAssignSuccess={() => { fetchLeads(); fetchLeadStats(); }}
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
        {!loading && !error && leads.length > 0 && (
          <LeadTable
            viewMode={viewMode}
            leads={leads}
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
            totalLeads={totalLeads}
            highlightedLeadId={highlightedLeadId}
            canDelete={canDelete}
            onDeleteClick={handleDeleteLead}
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

        {!loading && !error && leads.length === 0 && (
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
