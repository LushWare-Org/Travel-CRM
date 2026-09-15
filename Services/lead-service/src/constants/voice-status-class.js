export const STATUS_CLASS = {
  PENDING_VERIFICATION: 'enquiry_received',
  NEW: 'enquiry_received',
  DRAFTING: 'being_prepared',
  QUOTED: 'quote_sent',
  REVISION: 'being_revised',
  APPROVED: 'approved',
  BOOKING_IN_PROGRESS: 'booking_in_progress',
  CONFIRMED: 'confirmed',
  BOOKING_FAILED: 'needs_attention',
};

export function toStatusClass(lifecycleStatus) {
  return STATUS_CLASS[lifecycleStatus] ?? 'in_progress';
}
