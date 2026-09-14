import { useState } from 'react';
import { History, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RelatedLead {
  id: string;
  name: string | null;
  destination: string | null;
  lifecycleStatus: string;
  travelDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  aiHandled: boolean;
  recency: 'LIVE' | 'PAST';
}

interface RelatedLeadsCardProps {
  related: RelatedLead[];
  onOpenLead?: (id: string) => void;
}

export function formatTripDates(travelDate: string | null, endDate: string | null) {
  if (!travelDate && !endDate) return 'No dates';
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  if (travelDate && endDate) return `${fmt(travelDate)} – ${fmt(endDate)}`;
  return fmt((travelDate || endDate) as string);
}

export default function RelatedLeadsCard({ related, onOpenLead }: RelatedLeadsCardProps) {
  const [open, setOpen] = useState(false);
  if (!related.length) return null;

  const live = related.filter((r) => r.recency === 'LIVE').length;
  const past = related.length - live;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2 text-sm">
          <History className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-semibold">
            Repeat caller — {related.length} other {related.length === 1 ? 'lead' : 'leads'} on this number
          </span>
          <span className="text-muted-foreground">
            {live} still running · {past} finished
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>

      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {related.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.destination || 'No destination'}</span>
                  <span
                    className={
                      r.recency === 'LIVE'
                        ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground'
                    }
                  >
                    {r.recency === 'LIVE' ? 'Still running' : 'Finished'}
                  </span>
                  {r.aiHandled && <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />}
                </div>
                <p className="text-muted-foreground">
                  {formatTripDates(r.travelDate, r.endDate)} · {r.lifecycleStatus}
                </p>
              </div>
              {onOpenLead && (
                <Button variant="outline" size="sm" onClick={() => onOpenLead(r.id)}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Open
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
