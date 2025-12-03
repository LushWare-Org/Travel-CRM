import React from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

const UserFormDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title, 
  subtitle,
  children,
  submitLabel = 'Save',
  submitColor = 'blue',
  isLoading = false,
  isSubmitting = false,
  error = null,
  successMessage = null
}) => {
  if (!isOpen) return null;

  const isProcessing = isLoading || isSubmitting;

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
    cyan: 'bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400',
    green: 'bg-green-600 hover:bg-green-700 disabled:bg-green-400',
    purple: 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Error Message - Form Validation Errors Only */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 font-medium text-sm">{error}</p>
            </div>
          )}

          {/* Success Message - Form Success Only */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 font-medium text-sm">{successMessage}</p>
            </div>
          )}

          {children}
          
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 text-base"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={isProcessing}
              className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-semibold disabled:cursor-not-allowed text-base shadow-md hover:shadow-lg ${colorClasses[submitColor] || colorClasses.blue} disabled:shadow-none`}
            >
              {isProcessing ? 'Processing...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserFormDialog;
