import { X } from 'lucide-react';

const StatusChangeDialog = ({ 
  isOpen, 
  onClose, 
  currentStatus, 
  statusOptions, 
  statusColors, 
  statusLabels,
  onStatusSelect 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Change Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">Select a new status for this lead:</p>
          
          <div className="space-y-2">
            {statusOptions.map((option) => {
              const optionColors = statusColors?.[option.value] || {};
              const isSelected = currentStatus === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusSelect(option.value);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${optionColors.badge || 'bg-gray-100 text-gray-800'}`}>
                      {option.label}
                    </span>
                    {isSelected && (
                      <span className="text-blue-600 font-semibold">Current</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeDialog;



