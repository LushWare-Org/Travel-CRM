import React from "react";
import { useInvoiceForm } from "../../hooks";
import InvoiceItemsList from "./InvoiceItemsList";

/**
 * Invoice form component for creating/editing invoices
 */
const InvoiceForm = ({ formData, onSave, onCancel, today }) => {
  const {
    localData,
    handleInputChange,
    handleTaxChange,
    handleStatusChange,
    addItem,
    removeItem,
    updateItem,
    handlePaidAmountChange,
  } = useInvoiceForm(formData);

  const handleSubmit = () => {
    onSave(localData);
  };

  return (
    <div className="space-y-4">
      {/* Customer Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Customer Name
          </label>
          <input
            type="text"
            name="customerName"
            value={localData.customerName}
            onChange={handleInputChange}
            placeholder="Enter customer name"
            className="px-3 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={localData.email}
            onChange={handleInputChange}
            placeholder="Enter customer email"
            className="px-3 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
      </div>

      {/* Package Name */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Package Name
        </label>
        <input
          type="text"
          name="packageName"
          value={localData.packageName}
          onChange={handleInputChange}
          placeholder="Enter package name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Issued Date
          </label>
          <input
            type="date"
            name="issuedDate"
            value={localData.issuedDate}
            onChange={handleInputChange}
            className="px-3 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Due Date
          </label>
          <input
            type="date"
            name="dueDate"
            value={localData.dueDate}
            onChange={handleInputChange}
            className="px-3 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Status
        </label>
        <select
          name="status"
          value={localData.status}
          onChange={handleStatusChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="pending">Pending (Awaiting payment)</option>
          <option value="paid">Paid (Full payment received)</option>
          <option value="partial">Partial (Partial payment received)</option>
        </select>
      </div>

      {/* Payment Information */}
      {(localData.status === "paid" || localData.status === "partial") && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Payment Date
            </label>
            <input
              type="date"
              name="paymentDate"
              value={localData.paymentDate || ""}
              onChange={handleInputChange}
              className="px-3 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Payment Method
            </label>
            <input
              type="text"
              name="paymentMethod"
              value={localData.paymentMethod || ""}
              onChange={handleInputChange}
              placeholder="e.g., Credit Card, Bank Transfer"
              className="px-3 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
        </div>
      )}

      {/* Paid Amount for Partial Payments */}
      {localData.status === "partial" && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Paid Amount
          </label>
          <input
            type="number"
            name="paidAmount"
            value={localData.paidAmount || 0}
            onChange={handlePaidAmountChange}
            placeholder="Enter paid amount"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      )}

      {/* Tax */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Tax Amount
        </label>
        <input
          type="number"
          value={localData.tax || 0}
          onChange={handleTaxChange}
          placeholder="Enter tax amount"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Invoice Items */}
      <InvoiceItemsList
        items={localData.items}
        onAdd={addItem}
        onRemove={removeItem}
        onUpdate={updateItem}
      />

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={localData.notes}
          onChange={handleInputChange}
          placeholder="Enter any additional notes"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows="3"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
        >
          {formData.id.startsWith("INV-00") ? "Create" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default InvoiceForm;
