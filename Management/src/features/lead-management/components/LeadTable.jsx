import {
  MessageSquare,
  Edit,
  FileText,
  Receipt,
  FileCheck,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Package,
  Users,
  FolderOpen,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { quotationAPI, invoiceAPI, receiptAPI } from "../../../services/api";

const LeadTable = ({
  leads,
  loading,
  error,
  statusColors,
  statusLabels,
  onLeadClick,
  onRemarksClick,
  onEditClick,
  onQuotationClick,
  onInvoiceClick,
  onReceiptClick,
  onVoucherClick,
  currentPage,
  totalPages,
  onPageChange,
  leadsPerPage,
  totalLeads,
  highlightedLeadId,
  onStatusClick,
  onSectionClick,
  onDeleteClick,
  canDelete,
  viewMode = 'grid',
}) => {
  const paginationStart = (currentPage - 1) * leadsPerPage + 1;
  const paginationEnd = Math.min(currentPage * leadsPerPage, totalLeads);

  const handleStatusClick = (e, lead) => {
    e.stopPropagation();
    if (onStatusClick) {
      onStatusClick(lead);
    }
  };

  const handleQuotationClick = (e, lead) => {
    e.stopPropagation();
    if (onQuotationClick) {
      onQuotationClick(lead);
    }
  };

  const handleInvoiceClick = (e, lead) => {
    e.stopPropagation();
    if (onInvoiceClick) {
      onInvoiceClick(lead);
    }
  };

  const handleReceiptClick = (e, lead) => {
    e.stopPropagation();
    if (onReceiptClick) {
      onReceiptClick(lead);
    }
  };

  const handleVoucherClick = (e, lead) => {
    e.stopPropagation();
    if (onVoucherClick) {
      onVoucherClick(lead);
    }
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    try {
      const d = new Date(date);
      const dateStr = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return (
        <div className="text-xs">
          <div className="font-medium">{dateStr}</div>
          <div className="text-gray-500">{timeStr}</div>
        </div>
      );
    } catch (error) {
      return "N/A";
    }
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPackageDisplay = (lead) => {
    // Check for customized package first
    if (lead.customizedPackage?.name) {
      return {
        name: lead.customizedPackage.name,
        badge: (
          <span
            className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-semibold"
            title="Customized Package"
          >
            ✨ Custom
          </span>
        ),
        isCustom: true
      };
    }

    // Check for regular package
    if (lead.package?.name || lead.packageName) {
      return {
        name: lead.package?.name || lead.packageName,
        badge: null,
        isCustom: false
      };
    }

    // Check for manual itinerary
    if (lead.manualItinerary?._id || lead.manualItinerary) {
      return {
        name: "Manual Itinerary",
        badge: (
          <span
            className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold"
            title="Manual Itinerary"
          >
            📋 Manual
          </span>
        ),
        isCustom: false
      };
    }

    // No package or itinerary
    return {
      name: "N/A",
      badge: null,
      isCustom: false
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-gray-600">Loading leads...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="text-lg">No leads found</p>
        <p className="mt-2 text-sm">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {leads.map((lead) => {
            const leadId = lead._id || lead.id;
            const isHighlighted = highlightedLeadId && leadId === highlightedLeadId;
            const packageInfo = getPackageDisplay(lead);
            const statusColor = statusColors[lead.status] || statusColors.new;
            const statusLabel = statusLabels[lead.status] || "New";

            return (
              <div
                key={leadId}
                onClick={() => onEditClick?.(lead)}
                className={`bg-white rounded-xl border-2 transition-all cursor-pointer group ${isHighlighted
                  ? "border-blue-500 ring-2 ring-blue-100 shadow-lg"
                  : "border-gray-100 hover:border-gray-200 hover:shadow-lg"
                  }`}
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-gray-900 text-lg truncate group-hover:text-blue-600 transition-colors">
                          {lead.name}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 font-mono">
                        ID: {leadId?.slice(-8)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusClick?.(lead);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-transform hover:scale-105 ${statusColor}`}
                      >
                        {statusLabel}
                      </button>
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
                              onDeleteClick?.(lead);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    {lead.phone && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {lead.destination && (
                      <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate text-xs font-medium">{lead.destination}</span>
                      </div>
                    )}
                    {lead.travelDate && (
                      <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate text-xs font-medium">{formatDate(lead.travelDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Package & Rep */}
                  <div className="mt-3 space-y-2">
                    {packageInfo && (
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-600 truncate">{packageInfo.name}</span>
                        {packageInfo.isCustom && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs rounded font-medium shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className={`truncate ${lead.salesRep || lead.adviser ? "text-gray-600" : "text-amber-600 font-medium"}`}>
                        {lead.salesRep || lead.adviser || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {/* Remarks indicator */}
                  {lead.remarks?.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemarksClick?.(lead);
                      }}
                      className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{lead.remarks.length} remark{lead.remarks.length > 1 ? 's' : ''}</span>
                    </button>
                  )}
                </div>

                {/* Document Actions Section */}
                <div className="px-5 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-3">Documents</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {/* Quotation */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuotationClick?.(lead);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2.5 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group/btn"
                      title="Create Quotation"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover/btn:bg-blue-200 transition-colors">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-[10px] font-medium text-blue-600">Quote</span>
                    </button>

                    {/* Invoice */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInvoiceClick?.(lead);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2.5 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all group/btn"
                      title="Create Invoice"
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover/btn:bg-purple-200 transition-colors">
                        <Receipt className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-[10px] font-medium text-purple-600">Invoice</span>
                    </button>

                    {/* Receipt */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReceiptClick?.(lead);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2.5 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 transition-all group/btn"
                      title="Create Receipt"
                    >
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center group-hover/btn:bg-amber-200 transition-colors">
                        <FileCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-[10px] font-medium text-amber-600">Receipt</span>
                    </button>

                    {/* Voucher */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onVoucherClick?.(lead);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2.5 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-all group/btn"
                      title="Create Voucher"
                    >
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center group-hover/btn:bg-emerald-200 transition-colors">
                        <Ticket className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-[10px] font-medium text-emerald-600">Voucher</span>
                    </button>

                    {/* View All Docs */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSectionClick?.(lead);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all group/btn"
                      title="View All Documents"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover/btn:bg-gray-200 transition-colors">
                        <FolderOpen className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-600">All</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{paginationStart}</span> to{" "}
              <span className="font-medium">{paginationEnd}</span> of{" "}
              <span className="font-medium">{totalLeads}</span> leads
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[40px] h-10 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNum
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 px-4 py-3 text-xs font-bold tracking-wider text-left text-gray-700 uppercase border-r border-gray-300 bg-gray-50">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">
                Contact No.
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">
                Departure
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[180px]">
                E-mail ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">
                Sales Rep
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">
                Whatsapp
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[110px]">
                Travelers
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">
                Package
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">
                Destination
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">
                Platform
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">
                Travel Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">
                End Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[100px]">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">
                Remarks
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[140px]">
                Created Date/Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 sticky right-[250px] bg-gray-50 z-10 min-w-[120px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 min-w-[250px] shadow-[-2px_0_4px_rgba(0,0,0,0.1)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map((lead) => {
              const statusColor = (statusColors && statusColors[lead.status]) || "bg-gray-100 text-gray-800";
              const leadId = (lead._id || lead.id)?.toString();
              const isHighlighted =
                highlightedLeadId && leadId === highlightedLeadId.toString();

              return (
                <tr
                  key={lead._id || lead.id}
                  id={isHighlighted ? `lead-${leadId}` : undefined}
                  className={`transition-all duration-200 cursor-pointer group ${isHighlighted
                    ? "bg-yellow-100 border-2 border-yellow-400 shadow-lg"
                    : ""
                    }`}
                  onClick={() => onLeadClick(lead)}
                >
                  <td
                    className="px-4 py-3 text-sm font-bold border-r border-gray-200 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                  >
                    {(lead._id || lead.id).toString().substring(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">
                    {lead.name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.phone || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.city || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.email || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.salesRep || lead.adviser || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.whatsapp || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.numberOfTravelers || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm border-r border-gray-200">
                    {(() => {
                      const packageInfo = getPackageDisplay(lead);
                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-gray-700">
                            {packageInfo.name}
                          </span>
                          {packageInfo.badge}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.destination || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.platform || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.travelDate
                      ? new Date(lead.travelDate).toISOString().split("T")[0]
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.endDate
                      ? new Date(lead.endDate).toISOString().split("T")[0]
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                    {lead.time || "N/A"}
                  </td>
                  <td
                    className="px-4 py-3 text-sm border-r border-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <button
                      onClick={() => onRemarksClick(lead)}
                      className="flex items-center gap-2 px-3 py-2 transition-colors rounded-lg hover:bg-gray-100 group"
                    >
                      <MessageSquare className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                      <span className="font-medium text-gray-700">
                        {lead.remarks?.length || 0}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm border-r border-gray-200">
                    {formatDateTime(lead.createdAt || lead.leadDateTime)}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap border-r border-gray-200 sticky right-[250px] bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${statusColor}`}
                      onClick={(e) => handleStatusClick(e, lead)}
                      title="Click to change status"
                    >
                      {(statusLabels && statusLabels[lead.status]) ||
                        lead.status ||
                        "N/A"}
                    </button>
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-gray-700 sticky right-0 bg-white group-hover:bg-gray-50 z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => onEditClick(lead)}
                        className="px-2 py-2 transition-colors bg-gray-100 rounded-lg hover:bg-blue-100"
                        title="Edit Lead"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={(e) => handleQuotationClick(e, lead)}
                        className="px-2 py-2 transition-colors bg-gray-100 rounded-lg hover:bg-green-100"
                        title="Quotation"
                      >
                        <FileText className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={(e) => handleInvoiceClick(e, lead)}
                        className="px-2 py-2 transition-colors bg-gray-100 rounded-lg hover:bg-purple-100"
                        title="Invoice"
                      >
                        <Receipt className="w-4 h-4 text-purple-600" />
                      </button>
                      <button
                        onClick={(e) => handleReceiptClick(e, lead)}
                        className="px-2 py-2 transition-colors bg-gray-100 rounded-lg hover:bg-orange-100"
                        title="Payment Receipt"
                      >
                        <FileCheck className="w-4 h-4 text-orange-600" />
                      </button>
                      <button
                        onClick={(e) => handleVoucherClick(e, lead)}
                        className="px-2 py-2 transition-colors bg-gray-100 rounded-lg hover:bg-indigo-100"
                        title="Travel Voucher"
                      >
                        <Ticket className="w-4 h-4 text-indigo-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSectionClick) onSectionClick(lead);
                        }}
                        className="px-2 py-2 transition-colors bg-gray-100 rounded-lg hover:bg-blue-200"
                        title="View Documents"
                      >
                        <FileText className="w-4 h-4 text-blue-700" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
                              onDeleteClick?.(lead);
                            }
                          }}
                          className="px-2 py-2 transition-colors bg-gray-100 rounded-lg hover:bg-red-200"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 mt-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            Showing {paginationStart} to {paginationEnd} of {totalLeads} leads
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className={`px-4 py-2 rounded-lg transition-colors ${currentPage === pageNum
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
