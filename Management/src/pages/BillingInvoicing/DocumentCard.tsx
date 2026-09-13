import { Eye, Download, Send, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../utils/currency.js';
import StatusBadge from './StatusBadge';
import type { DocumentType } from './types';

interface DocumentCardProps {
  documentType: DocumentType;
  typeLabel: string;
  documentNumber: string;
  status?: string;
  customerName?: string;
  customerEmail?: string;
  amount?: number;
  dateValue?: string;
  formatDate: (value?: string) => string;
  leadId?: string;
  onNavigateToLead: (leadId: string) => void;
  onView: () => void;
  onDownload: () => void;
  onSend?: () => void;
}

export default function DocumentCard({
  documentType,
  typeLabel,
  documentNumber,
  status,
  customerName,
  customerEmail,
  amount,
  dateValue,
  formatDate,
  leadId,
  onNavigateToLead,
  onView,
  onDownload,
  onSend,
}: DocumentCardProps) {
  return (
    <div
      className="group cursor-pointer rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
      onClick={() => leadId && onNavigateToLead(leadId)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{typeLabel}</p>
          <p className="flex items-center gap-1 font-mono text-sm font-semibold text-foreground group-hover:text-primary">
            {documentNumber}
            {leadId && <ExternalLink className="h-3 w-3 opacity-50" />}
          </p>
        </div>
        <StatusBadge documentType={documentType} status={status} />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {(customerName || 'N').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{customerName || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">{customerEmail || ''}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div>
          {amount !== undefined && (
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">{formatCurrency(amount)}</p>
          )}
          <p className="font-mono text-xs tabular-nums text-muted-foreground">{formatDate(dateValue)}</p>
        </div>

        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onView}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          {onSend && (
            <button
              type="button"
              onClick={onSend}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Send Email"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
