import React from "react";
import { Plus, Trash2 } from "lucide-react";

/**
 * Invoice items list component for managing line items
 */
const InvoiceItemsList = ({ items, onAdd, onRemove, onUpdate }) => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Items (Add line items for the invoice)
      </h3>
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mb-2 font-medium text-gray-700">
        <span>Description</span>
        <span>Quantity</span>
        <span>Rate</span>
        <span>Amount</span>
        <span></span>
      </div>
      {items.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mb-2"
        >
          <input
            type="text"
            value={item.description}
            onChange={(e) => onUpdate(index, "description", e.target.value)}
            placeholder="Enter item description"
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdate(index, "quantity", e.target.value)}
            placeholder="Qty"
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="number"
            value={item.rate}
            onChange={(e) => onUpdate(index, "rate", e.target.value)}
            placeholder="Rate"
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <span className="px-3 py-2 bg-gray-100 rounded-lg">
            ${item.amount}
          </span>
          <button
            onClick={() => onRemove(index)}
            className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
            title="Remove Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Item
      </button>
    </div>
  );
};

export default InvoiceItemsList;
