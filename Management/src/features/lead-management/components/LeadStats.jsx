import { useState, useEffect } from 'react';
import { X, Eye, UserPlus, Check, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const LeadStats = ({ totalLeads, leads = [], onViewLead = null, salesReps = [], onAssignLead = null }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null); 
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedSalesRep, setSelectedSalesRep] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [assigningLeadId, setAssigningLeadId] = useState(null);
  const [selectedAssignLead, setSelectedAssignLead] = useState(null);
  const [selectedLeadsForBulkAssign, setSelectedLeadsForBulkAssign] = useState(new Set());
  const [isAssigningBulk, setIsAssigningBulk] = useState(false);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const safeLeads = leads.length > 0 ? leads : [];
  const thisMonthLeads = leads.length > 0 ? safeLeads : [];

  // Calculate conversion rate for this month
  const convertedThisMonth = thisMonthLeads.filter(lead => lead.status === 'converted').length;
  const conversionRate = thisMonthLeads.length > 0 
    ? ((convertedThisMonth / thisMonthLeads.length) * 100).toFixed(1)
    : '0.0';

  // Assigned and unassigned leads
  const assignedLeads = leads.filter(lead => lead.assignedTo && (lead.assignedTo._id || lead.assignedTo));
  const unassignedLeads = leads.filter(lead => !lead.assignedTo || (!lead.assignedTo._id && !lead.assignedTo));
  useEffect(() => {
    if (!showModal || !modalType) return;
    if (modalType === 'total') {
      setFilteredLeads(leads);
    } else if (modalType === 'assigned') {
      setFilteredLeads(leads.filter(lead => lead.assignedTo && (lead.assignedTo._id || lead.assignedTo)));
    } else if (modalType === 'unassigned') {
      setFilteredLeads(leads.filter(lead => !lead.assignedTo || (!lead.assignedTo._id && !lead.assignedTo)));
    }
  }, [leads, modalType, showModal]);

  // Calculate average response time (time from lead creation to first remark or status change)
  const calculateResponseTime = (lead) => {
    const leadDate = new Date(lead.createdAt || lead.leadDateTime);
    if (!leadDate || isNaN(leadDate.getTime())) return null;

    const responseTimes = [];

    // Check statusHistory for first status change (most accurate)
    if (lead.statusHistory && lead.statusHistory.length > 0) {
      const firstStatusChange = lead.statusHistory
        .map(s => new Date(s.changedAt))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a - b)[0];
      
      if (firstStatusChange && firstStatusChange > leadDate) {
        responseTimes.push((firstStatusChange - leadDate) / (1000 * 60 * 60 * 24));
      }
    }

    // Check if there are remarks
    if (lead.remarks && lead.remarks.length > 0) {
      const firstRemark = lead.remarks
        .map(r => new Date(r.date || r.addedAt))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a - b)[0];
      
      if (firstRemark && firstRemark > leadDate) {
        responseTimes.push((firstRemark - leadDate) / (1000 * 60 * 60 * 24));
      }
    }

    // If no statusHistory or remarks, check if status changed from 'new' (using updatedAt as proxy)
    if (responseTimes.length === 0 && lead.status && lead.status !== 'new' && lead.updatedAt) {
      const updatedDate = new Date(lead.updatedAt);
      if (!isNaN(updatedDate.getTime()) && updatedDate > leadDate) {
        responseTimes.push((updatedDate - leadDate) / (1000 * 60 * 60 * 24));
      }
    }

    // Return the earliest response time
    return responseTimes.length > 0 ? Math.min(...responseTimes) : null;
  };

  // Calculate average response time for this month's leads
  const responseTimes = thisMonthLeads
    .map(calculateResponseTime)
    .filter(time => time !== null && time >= 0);

  const avgResponseTime = responseTimes.length > 0
    ? (responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(1)
    : '0.0';

  const formatResponseTime = (days) => {
    const numDays = parseFloat(days);
    if (numDays < 1) {
      const hours = Math.round(numDays * 24);
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else if (numDays < 7) {
      return numDays === 1 ? '1 day' : `${numDays} days`;
    } else {
      const weeks = (numDays / 7).toFixed(1);
      return weeks === '1.0' ? '1 week' : `${weeks} weeks`;
    }
  };

  const handleTotalLeadsClick = () => {
    setModalType('total');
    setFilteredLeads(leads);
    setSearchTerm('');
    setSelectedSalesRep('all');
    setShowModal(true);
  };

  const handleAssignedLeadsClick = () => {
    setModalType('assigned');
    setFilteredLeads(assignedLeads);
    setSearchTerm('');
    setSelectedSalesRep('all');
    setShowModal(true);
  };

  const handleUnassignedLeadsClick = () => {
    setModalType('unassigned');
    setFilteredLeads(unassignedLeads);
    setSearchTerm('');
    setSelectedSalesRep('all');
    setShowModal(true);
  };

  const getModalTitle = () => {
    switch(modalType) {
      case 'total':
        return 'All Leads';
      case 'assigned':
        return 'Assigned Leads';
      case 'unassigned':
        return 'Unassigned Leads';
      default:
        return 'Leads';
    }
  };

  const displayedLeads = filteredLeads
    .filter(lead => {
      // Filter by sales rep
      if (selectedSalesRep !== 'all') {
        const leadRepId = lead.assignedTo?._id || lead.assignedTo;
        if (leadRepId !== selectedSalesRep) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        return (
          lead.name?.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.phone?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

  const getLeadsCountPerRep = () => {
    const counts = {};
    filteredLeads.forEach(lead => {
      const repId = lead.assignedTo?._id || lead.assignedTo;
      if (repId) {
        counts[repId] = (counts[repId] || 0) + 1;
      }
    });
    return counts;
  };

  const getTotalLeadsPerRep = () => {
    const counts = {};
    leads.forEach(lead => {
      const repId = lead.assignedTo?._id || lead.assignedTo;
      if (repId) {
        counts[repId] = (counts[repId] || 0) + 1;
      }
    });
    return counts;
  };

  const leadsPerRep = getLeadsCountPerRep();
  const totalLeadsPerRep = getTotalLeadsPerRep();

  // Bulk assignment
  const handleBulkAssign = async (salesRepId, salesRepName) => {
    if (!onAssignLead || selectedLeadsForBulkAssign.size === 0) {
      toast.error('Please select leads to assign');
      return;
    }

    setIsAssigningBulk(true);
    try {
      const leadsToAssign = displayedLeads.filter(lead => 
        selectedLeadsForBulkAssign.has(lead._id || lead.id)
      );

      let successCount = 0;
      for (const lead of leadsToAssign) {
        try {
          await onAssignLead(lead, salesRepId, salesRepName);
          successCount++;
        } catch (error) {
          console.error(`Failed to assign ${lead.name}:`, error);
        }
      }

      if (successCount > 0) {
        setSelectedLeadsForBulkAssign(new Set());
          toast.success((t) => (
          <div className="text-sm">
            <div className="text-green-600">{successCount} leads assigned to <span className="font-bold">{salesRepName}</span></div>
          </div>
        ), { duration: 3000 });

        const assignedLeadIds = new Set(leadsToAssign.map(l => l._id || l.id));
        setFilteredLeads(prev => prev.filter(lead => !assignedLeadIds.has(lead._id || lead.id)));
      } else {
        toast.error('Failed to assign leads');
      }
    } catch (error) {
      toast.error(error.message || 'Bulk assignment failed');
    } finally {
      setIsAssigningBulk(false);
    }
  };

  const [batchSize, setBatchSize] = useState(4);
  const toggleLeadSelection = (leadId) => {
    const newSelected = new Set(selectedLeadsForBulkAssign);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeadsForBulkAssign(newSelected);
  };

  // Select/Deselect all visible leads
  const toggleSelectAll = () => {
    if (selectedLeadsForBulkAssign.size === displayedLeads.length) {
      setSelectedLeadsForBulkAssign(new Set());
    } else {
      const allIds = new Set(displayedLeads.map(l => l._id || l.id));
      setSelectedLeadsForBulkAssign(allIds);
    }
  };

  const autoSelectBatch = (size) => {
    const unselectedLeads = displayedLeads.filter(lead => 
      !selectedLeadsForBulkAssign.has(lead._id || lead.id)
    );
    
    if (unselectedLeads.length === 0) {
      toast.info('All displayed leads are already selected or assigned');
      return;
    }

    const leadsToSelect = unselectedLeads.slice(0, Math.min(size, unselectedLeads.length));
    const newSelected = new Set(selectedLeadsForBulkAssign);
    leadsToSelect.forEach(lead => {
      newSelected.add(lead._id || lead.id);
    });
    setSelectedLeadsForBulkAssign(newSelected);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div 
          className="bg-gray-50 rounded-lg p-3"
        >
          <p className="text-xs text-gray-600 font-medium">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalLeads}</p>
        </div>
        <div 
          onClick={handleAssignedLeadsClick}
          className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 hover:shadow-md transition-all duration-200"
        >
          <p className="text-xs text-gray-600 font-medium">Assigned Leads</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{assignedLeads.length}</p>
        </div>
        <div 
          onClick={handleUnassignedLeadsClick}
          className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-orange-100 hover:shadow-md transition-all duration-200"
        >
          <p className="text-xs text-gray-600 font-medium">Unassigned Leads</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{unassignedLeads.length}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-medium">This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{thisMonthLeads.length}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-medium">Conversion Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{conversionRate}%</p>
        </div>
      </div>
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{getModalTitle()}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-4">
              {/* Batch Selection Controls */}
              {modalType === 'unassigned' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase">Batch Size:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={batchSize}
                      onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 4))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm [&::-webkit-outer-spin-button]:block [&::-webkit-inner-spin-button]:block [&::-webkit-outer-spin-button]:opacity-100 [&::-webkit-inner-spin-button]:opacity-100"
                    />
                  </div>
                  <button
                    onClick={() => autoSelectBatch(batchSize)}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Select {batchSize}
                  </button>
                  {selectedLeadsForBulkAssign.size > 0 && (
                    <button
                      onClick={() => setSelectedLeadsForBulkAssign(new Set())}
                      className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Clear ({selectedLeadsForBulkAssign.size})
                    </button>
                  )}
                  <div className="relative ml-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-8 h-4" />
                    <input
                      type="text"
                      placeholder="Search name, email or phone"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search leads"
                      className="pl-9 pr-9 h-9 rounded-lg border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent shadow-sm w-72"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Selection Status - Only for Unassigned */}
              {modalType === 'unassigned' && selectedLeadsForBulkAssign.size > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-green-900">
                  {selectedLeadsForBulkAssign.size} leads ready to assign
                  </p>
                </div>
              )}
              <div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-0">Filter by Sales Rep:</p>
                  {modalType === 'assigned' && (
                    <div className="relative md:ml-4 md:flex-shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search name, email or phone"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search leads"
                        className="pl-9 pr-9 h-9 rounded-lg border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent shadow-sm w-72 md:w-96"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => setSelectedSalesRep('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSalesRep === 'all'
                        ? 'bg-blue-600 text-white'
                        : modalType === 'unassigned' && selectedLeadsForBulkAssign.size > 0
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                    disabled={modalType === 'unassigned' && selectedLeadsForBulkAssign.size > 0}
                  >
                    All ({filteredLeads.length})
                  </button>
                  {salesReps.filter(rep => rep.role === 'salesRep').map(rep => (
                    <button
                      key={rep.id}
                      onClick={() => {
                        if (modalType === 'unassigned' && selectedLeadsForBulkAssign.size > 0) {
                          handleBulkAssign(rep.id, rep.name);
                        } else {
                          // Just filter the view
                          setSelectedSalesRep(rep.id);
                        }
                      }}
                      disabled={isAssigningBulk || (modalType === 'unassigned' && selectedLeadsForBulkAssign.size === 0 && selectedSalesRep !== rep.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        modalType === 'unassigned' && selectedLeadsForBulkAssign.size > 0
                          ? 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                          : selectedSalesRep === rep.id
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {isAssigningBulk && selectedLeadsForBulkAssign.size > 0 ? `${rep.name}...` : `${rep.name} (${totalLeadsPerRep[rep.id] || 0})`}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Modal Content - Table Format */}
            <div className="overflow-auto flex-1">
              {displayedLeads.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-100 sticky top-0 border-b border-gray-200">
                    <tr>
                      {modalType === 'unassigned' && (
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedLeadsForBulkAssign.size === displayedLeads.length && displayedLeads.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                            title="Select/Deselect all"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedLeads.map((lead) => {
                      const leadId = lead._id || lead.id;
                      const isSelected = selectedLeadsForBulkAssign.has(leadId);
                      return (
                      <tr 
                        key={leadId} 
                        className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
                      >
                        {modalType === 'unassigned' && (
                          <td className="px-4 py-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleLeadSelection(leadId);
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer" onClick={() => onViewLead && onViewLead(lead)}>
                          {lead.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap cursor-pointer" onClick={() => onViewLead && onViewLead(lead)}>
                          {lead.assignedTo ? (lead.assignedTo.name || lead.salesRep || lead.adviser || '-') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 cursor-pointer" onClick={() => onViewLead && onViewLead(lead)}>{lead.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 cursor-pointer" onClick={() => onViewLead && onViewLead(lead)}>{lead.phone}</td>
                        <td className="px-6 py-4 text-sm cursor-pointer" onClick={() => onViewLead && onViewLead(lead)}>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                            lead.status === 'interested' ? 'bg-purple-100 text-purple-800' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {lead.status?.charAt(0).toUpperCase() + lead.status?.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {onViewLead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewLead(lead);
                                }}
                                className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="View/Edit Lead"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  <p>No leads found</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 text-sm text-gray-600 text-right">
              Showing: <span className="font-semibold text-gray-900">{displayedLeads.length}</span> / Total: <span className="font-semibold text-gray-900">{filteredLeads.length}</span> leads
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {selectedAssignLead && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedAssignLead(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Assign Lead</h3>
              <button
                onClick={() => setSelectedAssignLead(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assignment Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Lead: {selectedAssignLead.name}</p>
                <p className="text-xs text-gray-500">{selectedAssignLead.email}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Sales Rep</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {salesReps.filter(rep => rep.role === 'salesRep').map(rep => (
                    <button
                      key={rep.id}
                      onClick={() => handleAssignLead(selectedAssignLead, rep.id, rep.name)}
                      disabled={assigningLeadId === (selectedAssignLead._id || selectedAssignLead.id)}
                      className={`w-full px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                        assigningLeadId === (selectedAssignLead._id || selectedAssignLead.id)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 hover:from-blue-100 hover:to-blue-200 border border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{rep.name}</span>
                        <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded">
                          {leadsPerRep[rep.name] || 0} leads
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadStats;

