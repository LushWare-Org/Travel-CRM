import React from 'react';
import { X } from 'lucide-react';

const UserFormDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title, 
  subtitle,
  children,
  submitLabel = 'Save',
  submitColor = 'blue',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
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
          {children}
          
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 text-base"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-semibold disabled:cursor-not-allowed text-base shadow-md hover:shadow-lg ${colorClasses[submitColor]} disabled:shadow-none`}
            >
              {isLoading ? 'Processing...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserFormDialog;
