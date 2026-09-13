import type { DocumentType } from './types';

// Grouped by meaning, not one hue per status - same convention as
// LeadStatusBadge (features/lead-management): muted = not yet formalized /
// no financial event, warning = needs attention / awaiting action,
// success = positive/settled milestone, destructive = terminal-negative.
const STATUS_STYLES: Record<DocumentType, Record<string, string>> = {
  quotation: {
    draft: 'bg-muted text-muted-foreground border-border',
    sent: 'bg-warning/10 text-warning border-warning/20',
    viewed: 'bg-warning/10 text-warning border-warning/20',
    accepted: 'bg-success/10 text-success border-success/20',
    converted: 'bg-success/10 text-success border-success/20',
    rejected: 'bg-destructive/10 text-destructive border-destructive/20',
    expired: 'bg-muted text-muted-foreground border-border',
  },
  invoice: {
    draft: 'bg-muted text-muted-foreground border-border',
    sent: 'bg-warning/10 text-warning border-warning/20',
    viewed: 'bg-warning/10 text-warning border-warning/20',
    paid: 'bg-success/10 text-success border-success/20',
    partial: 'bg-warning/10 text-warning border-warning/20',
    overdue: 'bg-destructive/10 text-destructive border-destructive/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
    refunded: 'bg-muted text-muted-foreground border-border',
  },
  receipt: {
    paid_in_advance: 'bg-success/10 text-success border-success/20',
    paid_in_full: 'bg-success/10 text-success border-success/20',
    partial_payment: 'bg-warning/10 text-warning border-warning/20',
    refunded: 'bg-muted text-muted-foreground border-border',
    cancelled: 'bg-muted text-muted-foreground border-border',
  },
  voucher: {
    draft: 'bg-muted text-muted-foreground border-border',
    sent: 'bg-warning/10 text-warning border-warning/20',
    viewed: 'bg-warning/10 text-warning border-warning/20',
    confirmed: 'bg-success/10 text-success border-success/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  'payment-history': {
    pending: 'bg-warning/10 text-warning border-warning/20',
    verified: 'bg-success/10 text-success border-success/20',
    reconciled: 'bg-success/10 text-success border-success/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

const STATUS_LABELS: Record<string, string> = {
  paid_in_advance: 'Paid in Advance',
  paid_in_full: 'Paid in Full',
  partial_payment: 'Partial Payment',
};

interface StatusBadgeProps {
  documentType: DocumentType;
  status?: string;
  className?: string;
}

export default function StatusBadge({ documentType, status, className = '' }: StatusBadgeProps) {
  const color = (status && STATUS_STYLES[documentType][status]) || 'bg-muted text-muted-foreground border-border';
  const label = (status && STATUS_LABELS[status]) || (status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Draft');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color} ${className}`}>
      {label}
    </span>
  );
}
