export const LIFECYCLE_STATUS_COLORS = {
  NEW: 'bg-blue-100 text-blue-700 border-blue-200',
  DRAFTING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  QUOTED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  REVISION: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BOOKING_IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
  CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
  CLOSED_LOST: 'bg-red-100 text-red-700 border-red-200',
  BOOKING_FAILED: 'bg-orange-100 text-orange-700 border-orange-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const LIFECYCLE_STATUS_LABELS = {
  NEW: 'New',
  DRAFTING: 'Drafting',
  QUOTED: 'Quoted',
  REVISION: 'Revision',
  APPROVED: 'Approved',
  BOOKING_IN_PROGRESS: 'Booking in Progress',
  CONFIRMED: 'Confirmed',
  CLOSED_LOST: 'Closed Lost',
  BOOKING_FAILED: 'Booking Failed',
  CANCELLED: 'Cancelled',
};

export const LIFECYCLE_STATUS_INFO = {
  NEW: 'Fresh lead, not yet drafted',
  DRAFTING: 'Actively customizing itinerary and costs',
  QUOTED: 'Formal proposal sent to client',
  REVISION: 'Client requested changes to the quote',
  APPROVED: 'Client accepted terms, ready for live booking',
  BOOKING_IN_PROGRESS: 'Rep is securing live inventory',
  CONFIRMED: 'All inventory booked, invoice generated',
  CLOSED_LOST: 'Lead did not convert — reason required',
  BOOKING_FAILED: 'Booking attempt failed — needs intervention',
  CANCELLED: 'Cancelled after confirmation',
};

export default function LeadStatusBadge({ status, className = '' }) {
  const color = LIFECYCLE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  const label = LIFECYCLE_STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color} ${className}`}>
      {label}
    </span>
  );
}
