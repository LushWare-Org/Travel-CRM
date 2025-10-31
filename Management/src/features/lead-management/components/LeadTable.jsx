import { MessageSquare, Edit } from 'lucide-react';

const LeadTable = ({ 
  leads, 
  loading, 
  error, 
  statusColors, 
  statusLabels,
  onLeadClick,
  onRemarksClick,
  onItineraryClick,
  onEditClick,
  currentPage,
  totalPages,
  onPageChange,
  leadsPerPage,
  totalLeads
}) => {
  const paginationStart = (currentPage - 1) * leadsPerPage + 1;
  const paginationEnd = Math.min(currentPage * leadsPerPage, totalLeads);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="text-gray-600">Loading leads...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No leads found</p>
        <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <>
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
            {leads.map((lead) => {
              const colors = (statusColors && statusColors[lead.status]) || {};
              
              return (
                <tr
                  key={lead._id || lead.id}
                  className={`hover:bg-gray-50 transition-all duration-200 cursor-pointer ${colors?.border || ''}`}
                  onClick={() => onLeadClick(lead)}
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
                      onClick={() => onRemarksClick(lead)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <MessageSquare className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                      <span className="text-gray-700 font-medium">{lead.remarks?.length || 0}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors?.badge || 'bg-gray-100 text-gray-800'}`}>
                      {(statusLabels && statusLabels[lead.status]) || lead.status || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700" onClick={(e) => { e.stopPropagation(); }}>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onEditClick(lead)}
                        className="px-3 py-2 hover:bg-blue-100 rounded-lg transition-colors bg-gray-100"
                        title="Edit Lead"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => onItineraryClick(lead)}
                        className="px-3 py-2 hover:bg-purple-100 rounded-lg transition-colors bg-gray-100 text-purple-700 font-medium"
                        title="Itinerary"
                      >
                        Itinerary
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {totalLeads > 0 && (
        <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            Showing {paginationStart} to {paginationEnd} of {totalLeads} leads
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
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
                  onClick={() => onPageChange(pageNum)}
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
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadTable;

