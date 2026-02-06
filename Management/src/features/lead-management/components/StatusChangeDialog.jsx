import { X, Check, AlertCircle } from 'lucide-react';

const StatusChangeDialog = ({
  isOpen,
  onClose,
  lead,
  statusLabels,
  statusColors,
  onStatusChange,
}) => {
  if (!isOpen || !lead) return null;

  const currentStatus = lead.status || 'new';
  const statuses = Object.keys(statusLabels);

  const statusInfo = {
    new: { description: 'Fresh lead, not yet contacted' },
    contacted: { description: 'Initial contact has been made' },
    interested: { description: 'Lead has shown interest' },
    quoted: { description: 'Quotation has been sent' },
    converted: { description: 'Successfully converted to customer' },
    lost: { description: 'Lead did not convert' },
    not_interested: { description: 'Lead is not interested' },
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
            <p className="text-sm text-gray-500">{lead.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Status Options */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {statuses.map((status) => {
            const isActive = currentStatus === status;
            const label = statusLabels[status];
            const info = statusInfo[status];

            return (
              <button
                key={status}
                onClick={() => onStatusChange(lead, status)}
                disabled={isActive}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${isActive
                    ? 'bg-gray-100 border-2 border-gray-300'
                    : 'border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${isActive ? 'bg-gray-900' : 'bg-gray-300'
                  }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-500">{info?.description}</p>
                </div>
                {isActive && (
                  <span className="text-xs text-gray-500 font-medium">Current</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeDialog;
