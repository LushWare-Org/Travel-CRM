import React from "react";
import { Download, Send } from "lucide-react";
import { STATUS_COLORS } from "../utils/constants";

/**
 * Invoice details modal component
 */
const InvoiceDetailsModal = ({ invoice, onClose, onDownload, onSend }) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Invoice {invoice.id}
            </h2>
            <p className="text-gray-600 mt-1">
              Invoice details and payment information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-500 font-medium">BILL TO</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {invoice.customerName}
              </p>
              <p className="text-xs text-gray-600">{invoice.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-medium mb-1">
                Invoice Date: {invoice.issuedDate}
              </p>
              <p className="text-xs text-gray-500 font-medium mb-1">
                Due Date: {invoice.dueDate}
              </p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  STATUS_COLORS[invoice.status].badge
                } mt-2`}
              >
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Invoice Items
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-700 font-medium">
                    Description
                  </th>
                  <th className="text-center py-2 text-gray-700 font-medium">
                    Qty
                  </th>
                  <th className="text-right py-2 text-gray-700 font-medium">
                    Rate
                  </th>
                  <th className="text-right py-2 text-gray-700 font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{item.description}</td>
                    <td className="py-2 text-center text-gray-700">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right text-gray-700">
                      ${item.rate}
                    </td>
                    <td className="py-2 text-right text-gray-900 font-semibold">
                      ${item.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">Subtotal:</span>
                <span className="text-gray-900 font-semibold">
                  ${invoice.amount}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">Tax:</span>
                <span className="text-gray-900 font-semibold">
                  ${invoice.tax}
                </span>
              </div>
              <div className="flex justify-between py-3 bg-gray-50 px-3 rounded-lg">
                <span className="text-gray-900 font-bold">Total:</span>
                <span className="text-lg font-bold text-blue-600">
                  ${invoice.total}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {invoice.paymentDate && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-900 mb-2">
                Payment Information
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                <div>
                  <p className="text-gray-600">Payment Date:</p>
                  <p className="font-semibold">{invoice.paymentDate}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Method:</p>
                  <p className="font-semibold">{invoice.paymentMethod}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Notes
            </label>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {invoice.notes}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => onDownload(invoice)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={() => onSend(invoice)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsModal;
