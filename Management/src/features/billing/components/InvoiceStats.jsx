import React from "react";
import { DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";

/**
 * Invoice statistics component
 */
const InvoiceStats = ({ stats }) => {
  const { totalRevenue, paidCount, pendingAmount, overdueCount } = stats;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
        <div className="bg-green-500 p-2 rounded-lg">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">Total Revenue</p>
          <p className="text-lg font-bold text-gray-900">
            ${totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
        <div className="bg-green-500 p-2 rounded-lg">
          <CheckCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">Paid Invoices</p>
          <p className="text-lg font-bold text-gray-900">{paidCount}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
        <div className="bg-orange-500 p-2 rounded-lg">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">Pending</p>
          <p className="text-lg font-bold text-gray-900">
            ${pendingAmount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
        <div className="bg-red-500 p-2 rounded-lg">
          <AlertCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">Overdue</p>
          <p className="text-lg font-bold text-gray-900">{overdueCount}</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceStats;
