import { useState, useEffect, useMemo } from "react";
import toast from 'react-hot-toast';
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Search, Filter, MoreVertical, Phone, Mail, MapPin, Calendar, MessageSquare, Clock, X, Edit, Loader2, Save, Trash2 } from "lucide-react";
import { leadAPI, adminAPI, quotationAPI } from "../services/api";
import { 
  NewLeadDialog, 
  EditLeadDialog, 
  RemarksDialog, 
  FilterDialog, 
  SettingsDialog, 
  LeadStats,
  LeadFilters,
  LeadTable
} from "../features/lead-management/components";

const LeadManagement = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showRemarksDialog, setShowRemarksDialog] = useState(false);
  const [remarksLead, setRemarksLead] = useState(null);
  const [leadEditForm, setLeadEditForm] = useState(null);
  const [filterTravelDateStart, setFilterTravelDateStart] = useState("");
  const [filterTravelDateEnd, setFilterTravelDateEnd] = useState("");
  const [filterPlatforms, setFilterPlatforms] = useState([]);

  // Assignment settings state (admin)
  const [settings, setSettings] = useState(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ assignmentMode: 'manual', autoStrategy: 'round_robin' });
  const [salesReps, setSalesReps] = useState([]);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 10;

  // Fetch leads on component mount and when filters change
  useEffect(() => {
    fetchLeads();
    setCurrentPage(1); // Reset to first page when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, searchTerm]);

  // Fetch assignment settings (admin)
  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getSettings();
        if (res.success) {
          setSettings(res.data);
          setSettingsForm({
            assignmentMode: res.data.assignmentMode,
            autoStrategy: res.data.autoStrategy,
          });
        }
      } catch (e) {
        // Non-admins will get 403; ignore silently in UI
      }
    })();
  }, []);

  // Fetch sales reps and admins (admin-only; ignore errors if not admin)
  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getSalesRepsAndAdmins();
        if (res.status === 'success' && res.data?.users) {
          setSalesReps(res.data.users.map(u => ({ id: u._id || u.id, name: u.name })));
        }
      } catch (e) {
        // ignore silently if unauthorized
      }
    })();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Always fetch ALL leads without status filter for accurate counts
      const params = {
        limit: 1000, // Fetch all leads (adjust if you have more than 1000)
        page: 1
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await leadAPI.getAllLeads(params);
      
      if (response.success) {
        // Handle both array and object response structures
        const leadsData = Array.isArray(response.data) ? response.data : (response.data?.leads || response.data?.data || []);
        setLeads(leadsData);
      } else {
        setLeads([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch leads');
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Status colors configuration
  const statusColors = {
    new: { 
      id: "bg-blue-100 text-blue-800", 
      border: "border-l-4 border-blue-500", 
      badge: "bg-blue-100 text-blue-800",
      tab: "bg-blue-100 text-blue-800"
    },
    contacted: { 
      id: "bg-yellow-100 text-yellow-800", 
      border: "border-l-4 border-yellow-500", 
      badge: "bg-yellow-100 text-yellow-800",
      tab: "bg-yellow-100 text-yellow-800"
    },
    interested: { 
      id: "bg-purple-100 text-purple-800", 
      border: "border-l-4 border-purple-500", 
      badge: "bg-purple-100 text-purple-800",
      tab: "bg-purple-100 text-purple-800"
    },
    converted: { 
      id: "bg-green-100 text-green-800", 
      border: "border-l-4 border-green-500", 
      badge: "bg-green-100 text-green-800",
      tab: "bg-green-100 text-green-800"
    },
    quoted: { 
      id: "bg-cyan-100 text-cyan-800", 
      border: "border-l-4 border-cyan-500", 
      badge: "bg-cyan-100 text-cyan-800",
      tab: "bg-cyan-100 text-cyan-800"
    },
    lost: { 
      id: "bg-red-100 text-red-800", 
      border: "border-l-4 border-red-500", 
      badge: "bg-red-100 text-red-800",
      tab: "bg-red-100 text-red-800"
    },
    "not-interested": { 
      id: "bg-gray-100 text-gray-800", 
      border: "border-l-4 border-gray-500", 
      badge: "bg-gray-100 text-gray-800",
      tab: "bg-gray-100 text-gray-800"
    },
  };

  const statusLabels = {
    new: "New",
    contacted: "Contacted",
    interested: "Interested",
    quoted: "Quoted",
    converted: "Converted",
    lost: "Loss",
    "not-interested": "Not Interested",
  };

  const platforms = ["Website Form", "Social Media", "Phone Call", "Referral", "Email", "Walk-in"];

  // Calculate absolute status counts from all leads (no filters applied)
  const statusCounts = useMemo(() => {
    return {
      all: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
      interested: leads.filter((l) => l.status === 'interested').length,
      quoted: leads.filter((l) => l.status === 'quoted').length,
      converted: leads.filter((l) => l.status === 'converted').length,
      lost: leads.filter((l) => l.status === 'lost').length,
      'not-interested': leads.filter((l) => l.status === 'not-interested').length,
    };
  }, [leads]);

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (lead.name || '').toLowerCase().includes(searchLower) ||
      (lead.email || '').toLowerCase().includes(searchLower) ||
      (lead.phone || '').includes(searchTerm) ||
      (lead.city || '').toLowerCase().includes(searchLower) ||
      (lead.destination || '').toLowerCase().includes(searchLower) ||
      (lead.salesRep || '').toLowerCase().includes(searchLower) ||
      (lead.adviser || '').toLowerCase().includes(searchLower);
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchesTravelDate =
      (!filterTravelDateStart || (lead.travelDate || '') >= filterTravelDateStart) &&
      (!filterTravelDateEnd || (lead.travelDate || '') <= filterTravelDateEnd);
    const matchesPlatform = filterPlatforms.length === 0 || filterPlatforms.includes(lead.platform);
    return matchesSearch && matchesStatus && matchesTravelDate && matchesPlatform;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstLead, indexOfLastLead);

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };





  const handlePlatformFilterChange = (platform) => {
    setFilterPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const clearFilters = () => {
    setFilterTravelDateStart("");
    setFilterTravelDateEnd("");
    setFilterPlatforms([]);
    setShowFilterDialog(false);
  };

  const saveSettings = async () => {
    try {
      const res = await adminAPI.updateSettings(settingsForm);
      if (res.success) {
        setSettings(res.data);
        setShowSettingsDialog(false);
      }
    } catch (e) {
      alert(e.message || 'Failed to update settings');
    }
  };

  const applyFilters = () => {
    setShowFilterDialog(false);
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
              <p className="text-gray-600 mt-1">Capture, track, and convert leads efficiently</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings && (
              <button
                onClick={() => setShowSettingsDialog(true)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                title="Assignment Settings"
              >
                {settings.assignmentMode === 'auto' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Auto Assign: {settings.autoStrategy.replace('_',' ')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-500"></span>
                    Manual Assign
                  </span>
                )}
              </button>
            )}
          <button
            onClick={() => setShowNewLeadDialog(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
          </div>
        </div>

        {/* Stats */}
        <LeadStats totalLeads={leads.length} />
      </div>

      {/* Content */}
      <div className="p-8">
        <LeadFilters
          searchTerm={searchTerm || ''}
          onSearchChange={setSearchTerm}
          onFilterClick={() => setShowFilterDialog(true)}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          statusCounts={statusCounts || {}}
          loading={loading}
          statusColors={statusColors}
          statusLabels={statusLabels}
        />

        {!loading && !error && (
          <LeadTable
            leads={currentLeads || []}
            loading={false}
            error={null}
            statusColors={statusColors}
            statusLabels={statusLabels}
          onLeadClick={(lead) => {
            setSelectedLead(lead);
            setLeadEditForm({
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              city: lead.city,
              whatsapp: lead.whatsapp,
              salesRep: lead.salesRep || lead.adviser,
              destination: lead.destination,
              platform: lead.platform,
              travelDate: lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '',
              time: lead.time,
              status: lead.status,
            });
          }}
          onRemarksClick={(lead) => {
            setRemarksLead(lead);
            setShowRemarksDialog(true);
          }}
          onEditClick={(lead) => {
            setSelectedLead(lead);
            setLeadEditForm({
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              city: lead.city,
              whatsapp: lead.whatsapp,
              salesRep: lead.salesRep || lead.adviser,
              destination: lead.destination,
              platform: lead.platform,
              travelDate: lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '',
              time: lead.time,
              status: lead.status,
            });
          }}
          onQuotationClick={(lead) => {
            toast.success('Quotation feature coming soon!');
            // TODO: Implement quotation dialog/functionality
          }}
          onInvoiceClick={(lead) => {
            toast.success('Invoice feature coming soon!');
            // TODO: Implement invoice dialog/functionality
          }}
          onReceiptClick={(lead) => {
            toast.success('Receipt feature coming soon!');
            // TODO: Implement receipt dialog/functionality
          }}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          leadsPerPage={leadsPerPage}
          totalLeads={filteredLeads.length}
          />
        )}
        
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading leads...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchLeads}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Edit Lead Dialog */}
        <EditLeadDialog
          isOpen={!!(selectedLead && leadEditForm)}
          onClose={() => {
            setSelectedLead(null);
            setLeadEditForm(null);
          }}
          lead={selectedLead}
          salesReps={salesReps}
          onSuccess={fetchLeads}
        />

        {/* New Lead Dialog */}
        <NewLeadDialog
          isOpen={showNewLeadDialog}
          onClose={() => setShowNewLeadDialog(false)}
          salesReps={salesReps}
          onSuccess={fetchLeads}
        />

        {/* Remarks Dialog */}
        <RemarksDialog
          isOpen={showRemarksDialog}
          onClose={() => {
            setShowRemarksDialog(false);
            setRemarksLead(null);
          }}
          lead={remarksLead}
        />

        {/* Filter Dialog */}
        <FilterDialog
          isOpen={showFilterDialog}
          onClose={() => setShowFilterDialog(false)}
          travelDateStart={filterTravelDateStart}
          travelDateEnd={filterTravelDateEnd}
          platforms={platforms}
          filterPlatforms={filterPlatforms}
          onTravelDateStartChange={setFilterTravelDateStart}
          onTravelDateEndChange={setFilterTravelDateEnd}
          onPlatformFilterChange={handlePlatformFilterChange}
          onClear={clearFilters}
          onApply={applyFilters}
        />

        {/* Settings Dialog (Admin) */}
        <SettingsDialog
          isOpen={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          settings={settings}
          settingsForm={settingsForm}
          onSettingsFormChange={setSettingsForm}
          onSave={saveSettings}
        />
      </div>
    </div>
  );
};

export default LeadManagement;