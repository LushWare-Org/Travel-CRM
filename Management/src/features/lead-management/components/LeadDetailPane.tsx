import { X } from 'lucide-react';
import { LEAD_COPILOT_FIELDS, leadEvidenceId } from '@travel-crm/contracts';
import { Button } from '@/components/ui/button';
import { LIFECYCLE_STATUS_LABELS } from './LeadStatusBadge';

interface LeadDetailPaneProps {
  /** The selected lead record, or null when nothing is selected. */
  lead: Record<string, unknown> | null;
  onClose?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  id: 'Lead ID',
  lifecycleStatus: 'Lifecycle status',
  assignedToId: 'Assigned to',
  name: 'Name',
  destination: 'Destination',
  budget: 'Budget',
  createdAt: 'Created',
  updatedAt: 'Updated',
};

// The adapter's allowlist is the pane's contract: every allowlisted field
// renders, each publishing the same evidence id the server cites.
function formatField(field: string, lead: Record<string, unknown>): string {
  const raw = lead[field];
  if (raw === undefined || raw === null || raw === '') return '—';

  if (field === 'lifecycleStatus') {
    const status = String(raw);
    return LIFECYCLE_STATUS_LABELS[status as keyof typeof LIFECYCLE_STATUS_LABELS] ?? status;
  }
  if (field === 'budget') {
    const amount = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(amount) ? amount.toLocaleString() : String(raw);
  }
  if (field === 'createdAt' || field === 'updatedAt') {
    const parsed = new Date(String(raw));
    return Number.isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleString();
  }
  return String(raw);
}

/**
 * The persistent lead-detail surface. It renders the adapter's allowlisted
 * fields and publishes `data-copilot-evidence-id` for each, which is what the
 * briefing's Evidence Lens resolves against — the record is the source view.
 */
export default function LeadDetailPane({ lead, onClose }: LeadDetailPaneProps) {
  const leadId = lead ? String(lead.id ?? lead._id ?? '') : '';

  if (!lead || leadId.length === 0) {
    return (
      <aside aria-label="Lead detail" data-copilot-record="empty" className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Select a lead to see its details and evidence.</p>
      </aside>
    );
  }

  return (
    <aside aria-label="Lead detail" data-copilot-record="lead" className="rounded-lg border border-border bg-card">
      <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-bold text-foreground">Lead detail</h2>
          <p className="truncate text-sm text-foreground">{String(lead.name ?? 'Unnamed lead')}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close lead detail" className="shrink-0">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </header>

      <dl className="divide-y divide-border">
        {LEAD_COPILOT_FIELDS.map((field) => (
          <div key={field} className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-2 px-4 py-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {FIELD_LABELS[field] ?? field}
            </dt>
            <dd
              data-copilot-evidence-id={leadEvidenceId(leadId, field)}
              tabIndex={-1}
              className="min-w-0 break-words font-mono text-xs tabular-nums text-foreground outline-none"
            >
              {formatField(field, lead)}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
