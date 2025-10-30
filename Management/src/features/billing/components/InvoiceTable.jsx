import React from "react";
import { Eye, Edit, Download, Send, MoreVertical } from "lucide-react";
import { STATUS_COLORS } from "../utils/constants";

/**
 * Invoice table component
 */
const InvoiceTable = ({
  invoices,
  onView,
  onEdit,
  onDownload,
  onSend,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Invoice List</h2>
        <p className="text-sm text-gray-600 mt-1">
          All invoices and payment records
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Invoice ID
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Customer
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Package
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Amount
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Due Date
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="font-semibold text-gray-900">
                    {invoice.id}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {invoice.customerName}
                    </p>
                    <p className="text-xs text-gray-500">{invoice.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {invoice.packageName}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-bold text-gray-900">
                    ${invoice.total}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      STATUS_COLORS[invoice.status].badge
                    }`}
                  >
                    {invoice.status.charAt(0).toUpperCase() +
                      invoice.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700">{invoice.dueDate}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => onView(invoice)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="View Invoice"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(invoice)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Edit Invoice"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDownload(invoice)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSend(invoice)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Send Email"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="More Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceTable;
