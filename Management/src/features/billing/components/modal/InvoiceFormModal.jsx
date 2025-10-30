import React from "react";
import InvoiceForm from "../form/InvoiceForm";

/**
 * Invoice form modal component
 */
const InvoiceFormModal = ({
  isOpen,
  title,
  description,
  formData,
  onSave,
  onCancel,
  today,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <InvoiceForm
            formData={formData}
            onSave={onSave}
            onCancel={onCancel}
            today={today}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceFormModal;
