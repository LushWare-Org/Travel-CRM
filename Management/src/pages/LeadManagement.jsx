import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Search, Filter, MoreVertical, Phone, Mail, MapPin, Calendar, MessageSquare, Clock, X, Edit } from "lucide-react";

const LeadManagement = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [showEditLeadDialog, setShowEditLeadDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newRemark, setNewRemark] = useState({ text: "", date: "" });
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    whatsapp: "",
    adviser: "",
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
    adviser: "",
    destination: "",
    platform: "",
    travelDate: "",
    time: "",
    remarks: [{ text: "", date: "" }],
  });
  const [filterTravelDateStart, setFilterTravelDateStart] = useState("");
  const [filterTravelDateEnd, setFilterTravelDateEnd] = useState("");
  const [filterPlatforms, setFilterPlatforms] = useState([]);

  const [leads, setLeads] = useState([
    {
      id: 1,
      name: "John Smith",
      email: "john@example.com",
      phone: "+1-555-0101",
      city: "New York",
      whatsapp: "+1-555-0101",
      adviser: "Sarah Johnson",
      destination: "Paris, France",
      platform: "Website Form",
      travelDate: "2024-12-15",
      time: "10:30 AM",
      remarks: [
        { text: "Interested in romantic getaway", date: "2024-10-15" },
        { text: "Prefers 5-star hotels", date: "2024-10-16" },
        { text: "Flexible with dates", date: "2024-10-17" },
      ],
      status: "new",
      createdDate: "2024-10-15",
      lastContact: "2024-10-18",
      interactions: 3,
    },
    {
      id: 2,
      name: "Emma Wilson",
      email: "emma@example.com",
      phone: "+1-555-0102",
      city: "Los Angeles",
      whatsapp: "+1-555-0102",
      adviser: "Mike Chen",
      destination: "Bali, Indonesia",
      platform: "Social Media",
      travelDate: "2024-11-20",
      time: "2:00 PM",
      remarks: [
        { text: "Family trip with 2 kids", date: "2024-10-10" },
        { text: "Budget conscious", date: "2024-10-11" },
        { text: "Needs child-friendly activities", date: "2024-10-12" },
      ],
      status: "contacted",
      createdDate: "2024-10-10",
      lastContact: "2024-10-19",
      interactions: 5,
    },
    {
      id: 3,
      name: "Robert Brown",
      email: "robert@example.com",
      phone: "+1-555-0103",
      city: "Chicago",
      whatsapp: "+1-555-0103",
      adviser: "Sarah Johnson",
      destination: "Dubai, UAE",
      platform: "Phone Call",
      travelDate: "2025-01-10",
      time: "11:00 AM",
      remarks: [
        { text: "Corporate team building event", date: "2024-09-28" },
        { text: "Group of 25 people", date: "2024-09-29" },
        { text: "Luxury accommodation required", date: "2024-09-30" },
      ],
      status: "interested",
      createdDate: "2024-09-28",
      lastContact: "2024-10-17",
      interactions: 8,
    },
    {
      id: 4,
      name: "Lisa Anderson",
      email: "lisa@example.com",
      phone: "+1-555-0104",
      city: "Miami",
      whatsapp: "+1-555-0104",
      adviser: "Mike Chen",
      destination: "Tokyo, Japan",
      platform: "Referral",
      travelDate: "2024-12-01",
      time: "9:00 AM",
      remarks: [
        { text: "Honeymoon package confirmed", date: "2024-09-15" },
        { text: "Cherry blossom season preferred", date: "2024-09-16" },
      ],
      status: "converted",
      createdDate: "2024-09-15",
      lastContact: "2024-10-18",
      interactions: 12,
    },
    {
      id: 5,
      name: "David Martinez",
      email: "david@example.com",
      phone: "+1-555-0105",
      city: "Houston",
      whatsapp: "+1-555-0105",
      adviser: "Sarah Johnson",
      destination: "Maldives",
      platform: "Website Form",
      travelDate: "2024-11-25",
      time: "3:30 PM",
      remarks: [
        { text: "Anniversary celebration", date: "2024-09-01" },
        { text: "Private villa preferred", date: "2024-09-02" },
        { text: "Water sports enthusiast", date: "2024-09-03" },
      ],
      status: "lost",
      createdDate: "2024-09-01",
      lastContact: "2024-10-10",
      interactions: 4,
    },
  ]);

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
    lost: { 
      id: "bg-red-100 text-red-800", 
      border: "border-l-4 border-red-500", 
      badge: "bg-red-100 text-red-800",
      tab: "bg-red-100 text-red-800"
    },
  };

  const statusLabels = {
    new: "New",
    contacted: "Contacted",
    interested: "Interested",
    converted: "Converted",
    lost: "Loss",
  };

  const platforms = ["Website Form", "Social Media", "Phone Call", "Referral", "Email", "Walk-in"];

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower) ||
      lead.phone.includes(searchTerm) ||
      lead.city.toLowerCase().includes(searchLower) ||
      lead.destination.toLowerCase().includes(searchLower);
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchesTravelDate =
      (!filterTravelDateStart || lead.travelDate >= filterTravelDateStart) &&
      (!filterTravelDateEnd || lead.travelDate <= filterTravelDateEnd);
    const matchesPlatform = filterPlatforms.length === 0 || filterPlatforms.includes(lead.platform);
    return matchesSearch && matchesStatus && matchesTravelDate && matchesPlatform;
  });

  const handleAddLead = () => {
    if (newLeadForm.name && newLeadForm.email && newLeadForm.phone) {
      const newId = leads.length + 1;
      const newLead = {
        id: newId,
        name: newLeadForm.name.trim(),
        email: newLeadForm.email,
        phone: newLeadForm.phone,
        city: newLeadForm.city,
        whatsapp: newLeadForm.whatsapp,
        adviser: newLeadForm.adviser,
        destination: newLeadForm.destination,
        platform: newLeadForm.platform,
        travelDate: newLeadForm.travelDate,
        time: newLeadForm.time,
        status: "new",
        createdDate: new Date().toISOString().split("T")[0],
        lastContact: new Date().toISOString().split("T")[0],
        remarks: newLeadForm.remarks.filter((r) => r.text.trim() !== ""),
        interactions: 0,
      };
      setLeads([...leads, newLead]);
      setShowNewLeadDialog(false);
      setNewLeadForm({
        name: "",
        email: "",
        phone: "",
        city: "",
        whatsapp: "",
        adviser: "",
        destination: "",
        platform: "",
        travelDate: "",
        time: "",
        remarks: [{ text: "", date: "" }],
      });
    }
  };

  const handleEditLead = () => {
    if (editLeadForm.name && editLeadForm.email && editLeadForm.phone) {
      const updatedLead = {
        ...editLeadForm,
        name: editLeadForm.name.trim(),
        remarks: editLeadForm.remarks.filter((r) => r.text.trim() !== ""),
        lastContact: new Date().toISOString().split("T")[0],
      };
      setLeads(
        leads.map((l) =>
          l.id === editLeadForm.id ? { ...l, ...updatedLead } : l
        )
      );
      setSelectedLead(updatedLead);
      setShowEditLeadDialog(false);
      setEditLeadForm({
        id: null,
        name: "",
        email: "",
        phone: "",
        city: "",
        whatsapp: "",
        adviser: "",
        destination: "",
        platform: "",
        travelDate: "",
        time: "",
        remarks: [{ text: "", date: "" }],
      });
    }
  };

  const handleAddRemark = () => {
    if (newRemark.text.trim() && selectedLead) {
      const updatedRemarks = [...selectedLead.remarks, { text: newRemark.text.trim(), date: newRemark.date || "" }];
      setLeads(
        leads.map((l) =>
          l.id === selectedLead.id ? { ...l, remarks: updatedRemarks } : l
        )
      );
      setSelectedLead({ ...selectedLead, remarks: updatedRemarks });
      setNewRemark({ text: "", date: "" });
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
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      whatsapp: lead.whatsapp,
      adviser: lead.adviser,
      destination: lead.destination,
      platform: lead.platform,
      travelDate: lead.travelDate,
      time: lead.time,
      remarks: lead.remarks.length > 0 ? [...lead.remarks] : [{ text: "", date: "" }],
      status: lead.status,
    });
    setShowEditLeadDialog(true);
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
    <div className="min-h-screen bg-gray-50">
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
              placeholder="Search by name, email, contact, city, or destination..."
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
            { key: "converted", label: "Converted", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors.converted.tab, textColor: "text-green-800" },
            { key: "lost", label: "Loss", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: statusColors.lost.tab, textColor: "text-red-800" },
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
                {key === "all" ? leads.length : leads.filter((l) => l.status === key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Leads Table */}
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Contact No.</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">City</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[180px]">E-mail ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Whatsapp</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Adviser</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">Travel Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[100px]">Time</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[200px]">Remarks 1</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[200px]">Remarks 2</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[200px]">Remarks 3</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.map((lead) => {
                const colors = statusColors[lead.status];
                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50 transition-all duration-200 cursor-pointer ${colors.border}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className={`px-4 py-3 text-sm font-bold border-r border-gray-200 ${colors.id}`}>
                      {lead.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 font-semibold">{lead.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.city}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.whatsapp}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.adviser}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.destination}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.platform}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.travelDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{lead.time}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {lead.remarks[0] ? `${lead.remarks[0].text}${lead.remarks[0].date ? ` (${lead.remarks[0].date})` : ""}` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {lead.remarks[1] ? `${lead.remarks[1].text}${lead.remarks[1].date ? ` (${lead.remarks[1].date})` : ""}` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {lead.remarks[2] ? `${lead.remarks[2].text}${lead.remarks[2].date ? ` (${lead.remarks[2].date})` : ""}` : ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.badge}`}>
                        {statusLabels[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <button className="p-2 hover:bg-opacity-80 rounded-lg transition-colors bg-gray-100">
                        <MoreVertical className="w-4 h-4" />
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

        {/* Lead Detail Modal */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedLead.name}</h2>
                  <p className="text-gray-600 mt-1">Lead details and communication history</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Assignment */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Current Status</label>
                    <select
                      value={selectedLead.status}
                      onChange={(e) =>
                        setLeads(
                          leads.map((l) =>
                            l.id === selectedLead.id ? { ...l, status: e.target.value } : l
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Loss</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Adviser</label>
                    <select
                      value={selectedLead.adviser}
                      onChange={(e) =>
                        setLeads(
                          leads.map((l) =>
                            l.id === selectedLead.id ? { ...l, adviser: e.target.value } : l
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Sarah Johnson">Sarah Johnson</option>
                      <option value="Mike Chen">Mike Chen</option>
                      <option value="Lisa Anderson">Lisa Anderson</option>
                      <option value="David Brown">David Brown</option>
                    </select>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${selectedLead.email}`} className="hover:text-blue-600">Email: {selectedLead.email}</a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${selectedLead.phone}`} className="hover:text-blue-600">Phone No: {selectedLead.phone}</a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-green-500" />
                    <a href={`https://wa.me/${selectedLead.whatsapp.replace(/[^0-9]/g, "")}`} className="hover:text-blue-600">WhatsApp No: {selectedLead.whatsapp}</a>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">City</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedLead.city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Destination</p>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {selectedLead.destination}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Platform</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedLead.platform}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Travel Date</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedLead.travelDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Time</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedLead.time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Interactions</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      {selectedLead.interactions}
                    </p>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Remarks</label>
                  <div className="space-y-2 mb-4">
                    {selectedLead.remarks.map((remark, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        {remark.text}
                        {remark.date && <span className="text-xs text-gray-500 block mt-1">({remark.date})</span>}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <textarea
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        value={newRemark.text}
                        onChange={(e) => setNewRemark({ ...newRemark, text: e.target.value })}
                        placeholder="Add new remark..."
                      />
                      <input
                        type="date"
                        value={newRemark.date}
                        onChange={(e) => setNewRemark({ ...newRemark, date: e.target.value })}
                        className="w-40 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleAddRemark}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Add Remark
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => openEditLeadDialog(selectedLead)}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Lead
                  </button>
                  <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium">
                    Send Follow-up Email
                  </button>
                  <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                    Call Now
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
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={newLeadForm.city}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter city"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adviser</label>
                    <select
                      value={newLeadForm.adviser}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, adviser: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Adviser</option>
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Add Lead
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
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={editLeadForm.city}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter city"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adviser</label>
                    <select
                      value={editLeadForm.adviser}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, adviser: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Adviser</option>
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Save Changes
                  </button>
                </div>
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
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
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