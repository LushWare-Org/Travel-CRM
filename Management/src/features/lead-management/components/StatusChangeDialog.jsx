import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { LIFECYCLE_STATUS_LABELS, LIFECYCLE_STATUS_COLORS, LIFECYCLE_STATUS_INFO } from './LeadStatusBadge';

const ALLOWED_TRANSITIONS = {
  NEW:                ['DRAFTING', 'CLOSED_LOST'],
  DRAFTING:           ['QUOTED', 'CLOSED_LOST'],
  QUOTED:             ['REVISION', 'APPROVED', 'CLOSED_LOST'],
  REVISION:           ['DRAFTING', 'QUOTED', 'APPROVED', 'CLOSED_LOST'],
  APPROVED:           ['BOOKING_IN_PROGRESS', 'CLOSED_LOST'],
  BOOKING_IN_PROGRESS: ['CONFIRMED', 'BOOKING_FAILED'],
  BOOKING_FAILED:     ['BOOKING_IN_PROGRESS', 'REVISION', 'CLOSED_LOST'],
  CONFIRMED:          ['CANCELLED'],
  CLOSED_LOST:        [],
  CANCELLED:          [],
};

function getGatekeeperReason(status, financials = {}) {
  const cp = financials?.clientPricing || {};
  const act = financials?.actual || {};

  if (status === 'QUOTED' || status === 'APPROVED') {
    if (!cp.quotedSellingPrice || cp.quotedSellingPrice <= 0) {
      return status === 'QUOTED'
        ? 'Requires quoted selling price > 0'
        : null;
    }
  }

  if (status === 'APPROVED') {
    if (!cp.depositPaid || cp.depositPaid <= 0) {
      return 'Requires deposit paid > 0';
    }
  }

  if (status === 'CONFIRMED') {
    if (!act.actualFlightCost || act.actualFlightCost <= 0) {
      return 'Requires actual flight cost > 0';
    }
    if (!act.actualHotelCost || act.actualHotelCost <= 0) {
      return 'Requires actual hotel cost > 0';
    }
  }

  return null;
}

const StatusChangeDialog = ({
  isOpen,
  onClose,
  lead,
  statusLabels,
  statusColors,
  onStatusChange,
}) => {
  const [lostReason, setLostReason] = useState('');

  if (!isOpen || !lead) return null;

  const currentStatus = lead.lifecycleStatus || lead.status?.toUpperCase() || 'NEW';
  const allowedStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
  const financials = lead.financials || {};

  const handleChange = (status) => {
    if (status === 'CLOSED_LOST' && !lostReason.trim()) return;
    onStatusChange(lead, status, status === 'CLOSED_LOST' ? lostReason.trim() : undefined);
    setLostReason('');
  };

  // If lead is in a terminal state, show message
  if (allowedStatuses.length === 0 && currentStatus !== 'NEW') {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl w-full max-w-sm shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
              <p className="text-sm text-gray-500">{lead.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">{LIFECYCLE_STATUS_LABELS[currentStatus] || currentStatus} is a terminal state</p>
            <p className="text-sm text-gray-500 mt-1">No further status changes are possible</p>
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <button onClick={onClose} className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Status Options */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {allowedStatuses.map((status) => {
            const isCurrent = currentStatus === status;
            const label = LIFECYCLE_STATUS_LABELS[status] || status;
            const info = LIFECYCLE_STATUS_INFO[status] || '';
            const gatekeeper = getGatekeeperReason(status, financials);
            const disabled = !!gatekeeper || isCurrent;

            return (
              <button
                key={status}
                onClick={() => !disabled && handleChange(status)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  disabled
                    ? 'bg-gray-50 border-2 border-gray-100 opacity-60 cursor-not-allowed'
                    : 'border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  isCurrent ? 'bg-gray-900' : 'bg-gray-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-700">
                      {label}
                    </p>
                    {isCurrent && (
                      <span className="text-xs text-gray-500 font-medium">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{info}</p>
                  {gatekeeper && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {gatekeeper}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {allowedStatuses.includes('CLOSED_LOST') && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Loss Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
                placeholder="Why was this lead lost?"
                rows={2}
              />
              {lostReason.trim().length === 0 && (
                <p className="text-xs text-red-500 mt-1">Loss reason is required</p>
              )}
            </div>
          )}
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
