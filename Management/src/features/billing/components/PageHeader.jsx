import React from "react";
import { Plus } from "lucide-react";

/**
 * Page header component with title and action button
 */
const PageHeader = ({ onNewInvoice }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm z-10">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Billing & Invoicing
            </h1>
            <p className="text-gray-600 mt-1">
              Manage invoices, payments, and financial reports
            </p>
          </div>
        </div>
        <button
          onClick={onNewInvoice}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
