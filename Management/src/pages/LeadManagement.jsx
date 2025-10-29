import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Search, Filter, MoreVertical, Phone, Mail, MapPin, Calendar, MessageSquare, Clock, X, Edit, Loader2, Save, Trash2 } from "lucide-react";
import { leadAPI } from "../services/api";

const LeadManagement = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [showEditLeadDialog, setShowEditLeadDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showRemarksDialog, setShowRemarksDialog] = useState(false);
  const [remarksLead, setRemarksLead] = useState(null);
  const [newRemark, setNewRemark] = useState({ text: "", date: "" });
  const [leadEditForm, setLeadEditForm] = useState(null);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    whatsapp: "",
    salesRep: "",
    destination: "",
    platform: "",
    travelDate: "",
    time: "",
    remarks: [{ text: "", date: "" }],
  });
  const [editLeadForm, setEditLeadForm] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
    city: "",
    whatsapp: "",
    salesRep: "",
    destination: "",
    platform: "",
    travelDate: "",
    time: "",
    status: "",
    remarks: [{ text: "", date: "" }],
  });
  const [filterTravelDateStart, setFilterTravelDateStart] = useState("");
  const [filterTravelDateEnd, setFilterTravelDateEnd] = useState("");
  const [filterPlatforms, setFilterPlatforms] = useState([]);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 10;

  // Fetch leads on component mount and when filters change
  useEffect(() => {
    fetchLeads();
    setCurrentPage(1); // Reset to first page when filters change
  }, [filterStatus, searchTerm]);

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
        setLeads(response.data);
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

  const handleAddLead = async () => {
    if (!newLeadForm.name || !newLeadForm.email || !newLeadForm.phone) {
      alert("Please fill in required fields: Name, Email, and Phone");
      return;
    }

    try {
      setIsSubmitting(true);
      const leadData = {
        name: newLeadForm.name.trim(),
        email: newLeadForm.email.trim(),
        phone: newLeadForm.phone.trim(),
        city: newLeadForm.city || undefined,
        whatsapp: newLeadForm.whatsapp || undefined,
        salesRep: newLeadForm.salesRep || undefined,
        destination: newLeadForm.destination || undefined,
        platform: newLeadForm.platform || "Manual Entry",
        source: "manual",
        travelDate: newLeadForm.travelDate || undefined,
        time: newLeadForm.time || undefined,
        remarks: newLeadForm.remarks.filter((r) => r.text.trim() !== "").map(r => ({
          text: r.text.trim(),
          date: r.date || new Date().toISOString().split("T")[0]
        })),
        status: "new"
      };

      await leadAPI.createLead(leadData);
      await fetchLeads(); // Refresh the list
      setShowNewLeadDialog(false);
      setNewLeadForm({
        name: "",
        email: "",
        phone: "",
        city: "",
        whatsapp: "",
        salesRep: "",
        destination: "",
        platform: "",
        travelDate: "",
        time: "",
        remarks: [{ text: "", date: "" }],
      });
    } catch (error) {
      alert(`Failed to create lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLead = async () => {
    if (!editLeadForm.name || !editLeadForm.email || !editLeadForm.phone) {
      alert("Please fill in required fields: Name, Email, and Phone");
      return;
    }

    try {
      setIsSubmitting(true);
      const leadData = {
        name: editLeadForm.name.trim(),
        email: editLeadForm.email.trim(),
        phone: editLeadForm.phone.trim(),
        city: editLeadForm.city || undefined,
        whatsapp: editLeadForm.whatsapp || undefined,
        salesRep: editLeadForm.salesRep || undefined,
        destination: editLeadForm.destination || undefined,
        platform: editLeadForm.platform || undefined,
        travelDate: editLeadForm.travelDate || undefined,
        time: editLeadForm.time || undefined,
        remarks: editLeadForm.remarks.filter((r) => r.text.trim() !== "").map(r => ({
          text: r.text.trim(),
          date: r.date || new Date().toISOString().split("T")[0]
        })),
        status: editLeadForm.status
      };

      await leadAPI.updateLead(editLeadForm.id, leadData);
      await fetchLeads(); // Refresh the list
      
      // Update selected lead if it's the one being edited
      if (selectedLead && selectedLead._id === editLeadForm.id) {
        const response = await leadAPI.getLead(editLeadForm.id);
        setSelectedLead(response.data);
      }
      
      setShowEditLeadDialog(false);
      setEditLeadForm({
        id: null,
        name: "",
        email: "",
        phone: "",
        city: "",
        whatsapp: "",
        salesRep: "",
        destination: "",
        platform: "",
        travelDate: "",
        time: "",
        status: "",
        remarks: [{ text: "", date: "" }],
      });
    } catch (error) {
      alert(`Failed to update lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRemark = async () => {
    if (!newRemark.text.trim() || !selectedLead) {
      return;
    }

    try {
      setIsSubmitting(true);
      await leadAPI.addRemark(selectedLead._id, {
        text: newRemark.text.trim(),
        date: newRemark.date || new Date().toISOString().split("T")[0]
      });

      // Refresh the selected lead
      const response = await leadAPI.getLead(selectedLead._id);
      setSelectedLead(response.data);
      setNewRemark({ text: "", date: "" });
      
      // Refresh the list
      await fetchLeads();
    } catch (error) {
      alert(`Failed to add remark: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRemarkField = (form, setForm) => {
    setForm({
      ...form,
      remarks: [...form.remarks, { text: "", date: "" }],
    });
  };

  const updateRemark = (form, setForm, index, field, value) => {
    const updatedRemarks = [...form.remarks];
    updatedRemarks[index] = { ...updatedRemarks[index], [field]: value };
    setForm({
      ...form,
      remarks: updatedRemarks,
    });
  };

  const removeRemark = (form, setForm, index) => {
    const updatedRemarks = form.remarks.filter((_, i) => i !== index);
    setForm({
      ...form,
      remarks: updatedRemarks.length > 0 ? updatedRemarks : [{ text: "", date: "" }],
    });
  };

  const openEditLeadDialog = (lead) => {
    setEditLeadForm({
      id: lead._id || lead.id, // Support both API (_id) and legacy (id) formats
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      whatsapp: lead.whatsapp,
      salesRep: lead.salesRep || lead.adviser, // Support both old and new field names
      destination: lead.destination,
      platform: lead.platform,
      travelDate: lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '',
      time: lead.time,
      remarks: lead.remarks && lead.remarks.length > 0 ? [...lead.remarks] : [{ text: "", date: "" }],
      status: lead.status,
    });
    setShowEditLeadDialog(true);
  };

  const handleSaveLeadEdit = async () => {
    if (!selectedLead || !leadEditForm) return;
    
    try {
      setIsSubmitting(true);
      await leadAPI.updateLead(selectedLead._id, leadEditForm);
      await fetchLeads();
      setSelectedLead(null);
      setLeadEditForm(null);
    } catch (error) {
      alert(`Failed to update lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeadEdit = () => {
    setSelectedLead(null);
    setLeadEditForm(null);
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
          <button
            onClick={() => setShowNewLeadDialog(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{leads.length}</p>
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
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, contact, city, destination, or sales rep..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilterDialog(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: "all", label: "All Leads", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: "bg-white", textColor: "text-gray-700" },
            { key: "new", label: "New", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors.new.tab, textColor: "text-blue-800" },
            { key: "contacted", label: "Contacted", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors.contacted.tab, textColor: "text-yellow-800" },
            { key: "interested", label: "Interested", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors.interested.tab, textColor: "text-purple-800" },
            { key: "quoted", label: "Quoted", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors.quoted.tab, textColor: "text-cyan-800" },
            { key: "converted", label: "Converted", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors.converted.tab, textColor: "text-green-800" },
            { key: "lost", label: "Loss", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors.lost.tab, textColor: "text-red-800" },
            { key: "not-interested", label: "Not Interested", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors["not-interested"].tab, textColor: "text-gray-800" },
          ].map(({ key, label, activeBg, inactiveBg, textColor }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
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

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading leads...</span>
          </div>
        )}

        {/* Error State */}
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

        {/* Leads Table */}
        {!loading && !error && (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Contact No.</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">Departure</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[180px]">E-mail ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Whatsapp</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Sales Rep</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">Travel Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[100px]">Time</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">Remarks</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!loading && !error && currentLeads.map((lead) => {
                const colors = statusColors[lead.status];
                
                return (
                  <tr
                    key={lead._id || lead.id}
                    className={`hover:bg-gray-50 transition-all duration-200 cursor-pointer ${colors?.border || ''}`}
                    onClick={() => {
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
                  >
                    <td className={`px-4 py-3 text-sm font-bold border-r border-gray-200 ${colors?.id || ''}`}>
                      {(lead._id || lead.id).toString().substring(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 font-semibold">{lead.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.phone || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.city || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.email || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.whatsapp || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.salesRep || lead.adviser || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.destination || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.platform || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.time || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm border-r border-gray-200" onClick={(e) => { e.stopPropagation(); }}>
                      <button
                        onClick={() => {
                          setRemarksLead(lead);
                          setShowRemarksDialog(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                      >
                        <MessageSquare className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                        <span className="text-gray-700 font-medium">{lead.remarks?.length || 0}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors?.badge || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[lead.status] || lead.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
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
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors bg-gray-100"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No leads found</p>
              <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
        )}
        
        {/* Pagination Controls */}
        {!loading && !error && filteredLeads.length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * leadsPerPage + 1} to {Math.min(currentPage * leadsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Lead Detail Modal - Editable */}
        {selectedLead && leadEditForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Edit Lead - {leadEditForm.name}</h2>
                  <p className="text-gray-600 mt-1">Update lead information</p>
                </div>
                <button onClick={handleCancelLeadEdit} className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group">
                  <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={leadEditForm.name}
                      onChange={(e) => setLeadEditForm({...leadEditForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact No. *</label>
                    <input
                      type="tel"
                      value={leadEditForm.phone}
                      onChange={(e) => setLeadEditForm({...leadEditForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
                    <input
                      type="text"
                      value={leadEditForm.city}
                      onChange={(e) => setLeadEditForm({...leadEditForm, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail ID *</label>
                    <input
                      type="email"
                      value={leadEditForm.email}
                      onChange={(e) => setLeadEditForm({...leadEditForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={leadEditForm.whatsapp}
                      onChange={(e) => setLeadEditForm({...leadEditForm, whatsapp: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep</label>
                    <select
                      value={leadEditForm.salesRep}
                      onChange={(e) => setLeadEditForm({...leadEditForm, salesRep: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Sales Rep</option>
                      <option value="Sarah Johnson">Sarah Johnson</option>
                      <option value="Mike Chen">Mike Chen</option>
                      <option value="Lisa Anderson">Lisa Anderson</option>
                      <option value="David Brown">David Brown</option>
                    </select>
                  </div>
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                    <input
                      type="text"
                      value={leadEditForm.destination}
                      onChange={(e) => setLeadEditForm({...leadEditForm, destination: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                    <select
                      value={leadEditForm.platform}
                      onChange={(e) => setLeadEditForm({...leadEditForm, platform: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Platform</option>
                      <option value="Website Form">Website Form</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Referral">Referral</option>
                      <option value="Email">Email</option>
                      <option value="Walk-in">Walk-in</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Travel Date</label>
                      <input
                        type="date"
                      value={leadEditForm.travelDate}
                      onChange={(e) => setLeadEditForm({...leadEditForm, travelDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="text"
                      value={leadEditForm.time}
                      onChange={(e) => setLeadEditForm({...leadEditForm, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={leadEditForm.status}
                    onChange={(e) => setLeadEditForm({...leadEditForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="quoted">Quoted</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                    <option value="not-interested">Not Interested</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4">
                  <a
                    href={`mailto:${leadEditForm.email}`}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                  <a
                    href={`https://wa.me/${leadEditForm.whatsapp?.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    WhatsApp
                  </a>
                  <button
                    onClick={handleSaveLeadEdit}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Lead Dialog */}
        {showNewLeadDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add New Lead</h2>
                  <p className="text-sm text-gray-600 mt-1">Fill in all lead information</p>
                </div>
                <button
                  onClick={() => setShowNewLeadDialog(false)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                >
                  <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact No. *</label>
                    <input
                      type="tel"
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
                    <input
                      type="text"
                      value={newLeadForm.city}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter departure city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail ID *</label>
                    <input
                      type="email"
                      value={newLeadForm.email}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={newLeadForm.whatsapp}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep</label>
                    <select
                        value={newLeadForm.salesRep}
                          onChange={(e) => setNewLeadForm({ ...newLeadForm, salesRep: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Sales Rep</option>
                      <option value="Sarah Johnson">Sarah Johnson</option>
                      <option value="Mike Chen">Mike Chen</option>
                      <option value="Lisa Anderson">Lisa Anderson</option>
                      <option value="David Brown">David Brown</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                    <input
                      type="text"
                      value={newLeadForm.destination}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, destination: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Paris, France"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                    <select
                      value={newLeadForm.platform}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, platform: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Platform</option>
                      <option value="Website Form">Website Form</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Referral">Referral</option>
                      <option value="Email">Email</option>
                      <option value="Walk-in">Walk-in</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Travel Date</label>
                    <input
                      type="date"
                      value={newLeadForm.travelDate}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, travelDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="text"
                      value={newLeadForm.time}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 10:30 AM or 14:00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <div className="space-y-2">
                    {newLeadForm.remarks.map((remark, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={remark.text}
                          onChange={(e) => updateRemark(newLeadForm, setNewLeadForm, index, "text", e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Remark ${index + 1}`}
                        />
                        <input
                          type="date"
                          value={remark.date}
                          onChange={(e) => updateRemark(newLeadForm, setNewLeadForm, index, "date", e.target.value)}
                          className="w-40 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {newLeadForm.remarks.length > 1 && (
                          <button
                            onClick={() => removeRemark(newLeadForm, setNewLeadForm, index)}
                            className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addRemarkField(newLeadForm, setNewLeadForm)}
                      className="w-full px-3 py-2 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Remark
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewLeadDialog(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddLead}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Lead"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Lead Dialog */}
        {showEditLeadDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit Lead</h2>
                  <p className="text-sm text-gray-600 mt-1">Update lead information</p>
                </div>
                <button
                  onClick={() => setShowEditLeadDialog(false)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                >
                  <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={editLeadForm.name}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact No. *</label>
                    <input
                      type="tel"
                      value={editLeadForm.phone}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
                    <input
                      type="text"
                      value={editLeadForm.city}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter departure city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail ID *</label>
                    <input
                      type="email"
                      value={editLeadForm.email}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={editLeadForm.whatsapp}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep</label>
                    <select
                        value={editLeadForm.salesRep}
                          onChange={(e) => setEditLeadForm({ ...editLeadForm, salesRep: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Sales Rep</option>
                      <option value="Sarah Johnson">Sarah Johnson</option>
                      <option value="Mike Chen">Mike Chen</option>
                      <option value="Lisa Anderson">Lisa Anderson</option>
                      <option value="David Brown">David Brown</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                    <input
                      type="text"
                      value={editLeadForm.destination}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, destination: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Paris, France"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                    <select
                      value={editLeadForm.platform}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, platform: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Platform</option>
                      <option value="Website Form">Website Form</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Referral">Referral</option>
                      <option value="Email">Email</option>
                      <option value="Walk-in">Walk-in</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Travel Date</label>
                    <input
                      type="date"
                      value={editLeadForm.travelDate}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, travelDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="text"
                      value={editLeadForm.time}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 10:30 AM or 14:00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editLeadForm.status}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="quoted">Quoted</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Loss</option>
                    <option value="not-interested">Not Interested</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <div className="space-y-2">
                    {editLeadForm.remarks.map((remark, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={remark.text}
                          onChange={(e) => updateRemark(editLeadForm, setEditLeadForm, index, "text", e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Remark ${index + 1}`}
                        />
                        <input
                          type="date"
                          value={remark.date}
                          onChange={(e) => updateRemark(editLeadForm, setEditLeadForm, index, "date", e.target.value)}
                          className="w-40 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {editLeadForm.remarks.length > 1 && (
                          <button
                            onClick={() => removeRemark(editLeadForm, setEditLeadForm, index)}
                            className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addRemarkField(editLeadForm, setEditLeadForm)}
                      className="w-full px-3 py-2 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Remark
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowEditLeadDialog(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditLead}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remarks Dialog */}
        {showRemarksDialog && remarksLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Remarks - {remarksLead.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {remarksLead.remarks?.length || 0} total remarks
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRemarksDialog(false);
                    setRemarksLead(null);
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                >
                  <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {remarksLead.remarks && remarksLead.remarks.length > 0 ? (
                  remarksLead.remarks.map((remark, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-900 mb-2">{remark.text}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {remark.date ? new Date(remark.date).toLocaleDateString() : 'No date'}
                        </span>
                        <span className="text-xs font-medium text-gray-600">
                          Remark #{index + 1}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No remarks available</p>
                    <p className="text-sm mt-2">No remarks have been added to this lead yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Dialog */}
        {showFilterDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Filter Leads</h2>
                  <p className="text-sm text-gray-600 mt-1">Select filters to refine lead list</p>
                </div>
                <button
                  onClick={() => setShowFilterDialog(false)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                >
                  <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel Date Range</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filterTravelDateStart}
                        onChange={(e) => setFilterTravelDateStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={filterTravelDateEnd}
                        onChange={(e) => setFilterTravelDateEnd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <div className="grid grid-cols-2 gap-2">
                    {platforms.map((platform) => (
                      <label key={platform} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={filterPlatforms.includes(platform)}
                          onChange={() => handlePlatformFilterChange(platform)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        {platform}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={clearFilters}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadManagement;