import React from 'react';
import { Eye, Edit, Trash2, Download, Send, Copy, CheckCircle, XCircle, Clock, FileX } from 'lucide-react';

const QuotationsTable = ({ 
  quotations, 
  onView, 
  onEdit, 
  onDelete, 
  onDownload, 
  onSend,
  onDuplicate,
  onConvertToInvoice 
}) => {
  const getStatusConfig = (status) => {
    const configs = {
      draft: { 
        icon: FileX, 
        label: 'Draft', 
        classes: 'bg-gray-100 text-gray-800',
        iconColor: 'text-gray-500'
      },
      sent: { 
        icon: Send, 
        label: 'Sent', 
        classes: 'bg-blue-100 text-blue-800',
        iconColor: 'text-blue-500'
      },
      accepted: { 
        icon: CheckCircle, 
        label: 'Accepted', 
        classes: 'bg-green-100 text-green-800',
        iconColor: 'text-green-500'
      },
      rejected: { 
        icon: XCircle, 
        label: 'Rejected', 
        classes: 'bg-red-100 text-red-800',
        iconColor: 'text-red-500'
      },
      expired: { 
        icon: Clock, 
        label: 'Expired', 
        classes: 'bg-orange-100 text-orange-800',
        iconColor: 'text-orange-500'
      },
    };
    return configs[status] || configs.draft;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (quotations.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileX className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No quotations</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new quotation.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quotation ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead / Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Package
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valid Until
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quotations.map((quotation) => {
              const statusConfig = getStatusConfig(quotation.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <tr key={quotation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{quotation.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{quotation.leadName}</div>
                      <div className="text-gray-500 text-xs">Lead ID: {quotation.leadId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={quotation.packageName}>
                      {quotation.packageName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(quotation.total)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(quotation.validUntil)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.classes}`}>
                      <StatusIcon className={`w-3 h-3 mr-1 ${statusConfig.iconColor}`} />
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(quotation)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {quotation.status === 'draft' && (
                        <button
                          onClick={() => onEdit(quotation)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDownload(quotation)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {(quotation.status === 'draft' || quotation.status === 'sent') && (
                        <button
                          onClick={() => onSend(quotation)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                          title="Send to Customer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDuplicate(quotation)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {quotation.status === 'accepted' && (
                        <button
                          onClick={() => onConvertToInvoice(quotation)}
                          className="text-emerald-600 hover:text-emerald-900 p-1 rounded hover:bg-emerald-50 text-xs px-2 py-1 border border-emerald-300"
                          title="Convert to Invoice"
                        >
                          Invoice
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(quotation)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotationsTable;
