import { useState } from 'react';
import {
  MessageSquare,
  Edit,
  FileText,
  Receipt,
  FileCheck,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Package,
  Clock,
  Users,
  FolderOpen,
} from "lucide-react";

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
}) => {
  const paginationStart = (currentPage - 1) * leadsPerPage + 1;
  const paginationEnd = Math.min(currentPage * leadsPerPage, totalLeads);

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPackageDisplay = (lead) => {
    if (lead.customizedPackage) {
      const name = lead.customizedPackage.name || lead.packageName || "Custom Package";
      return { name, isCustom: true };
    }
    if (lead.package) {
      const name = lead.package.name || lead.packageName || "Package";
      return { name, isCustom: false };
    }
    if (lead.packageName) {
      return { name: lead.packageName, isCustom: false };
    }
    return null;
  };

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">No leads to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lead Cards Grid */}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusClick?.(lead);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-transform hover:scale-105 ${statusColor}`}
                  >
                    {statusLabel}
                  </button>
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
                <div className="grid grid-cols-5 gap-2">
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
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4">
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
};

export default LeadTable;
