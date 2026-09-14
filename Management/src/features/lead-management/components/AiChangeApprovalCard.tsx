import { useState } from 'react';
import { ArrowRight, Check, Undo2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { leadAPI } from '@/services/api';
import toast from '@/lib/toast';

interface ChangeSide {
  nights: number;
  hotel: string | null;
  destination: string | null;
}

export interface PendingAiChange {
  before: ChangeSide;
  after: ChangeSide;
  summary: string;
  changedAt: string;
}

interface AiChangeApprovalCardProps {
  leadId: string;
  selectionId: string;
  packageName?: string | null;
  change: PendingAiChange;
  onResolved?: () => void;
}

/** One row of the diff, rendered only when the value actually changed. */
function DiffRow({ label, before, after }: { label: string; before: string; after: string }) {
  if (before === after) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground line-through">{before}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
        {after}
      </span>
    </div>
  );
}

const nights = (n: number) => `${n} night${n === 1 ? '' : 's'}`;
const orNone = (v: string | null) => v || 'not set';

/**
 * Shown in a lead's AI tab when the voice agent has edited the itinerary and
 * a rep has not yet reviewed it. Approving clears the review flag; it does
 * not send anything to the customer — re-quoting stays the rep's own separate
 * action. Discarding reverts the draft to the original package.
 */
export default function AiChangeApprovalCard({
  leadId, selectionId, packageName, change, onResolved,
}: AiChangeApprovalCardProps) {
  const [busy, setBusy] = useState<'approve' | 'discard' | null>(null);

  const act = async (kind: 'approve' | 'discard') => {
    setBusy(kind);
    try {
      if (kind === 'approve') {
        await leadAPI.approveAiChange(leadId, selectionId);
        toast.success('Change approved');
      } else {
        await leadAPI.refreshPackageSelection(leadId, selectionId, true);
        toast.success('Change discarded — the itinerary is back to the original package');
      }
      onResolved?.();
    } catch (err: any) {
      toast.error(err?.message || `Could not ${kind} the change`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden />
        <h3 className="text-sm font-semibold">The voice agent changed this itinerary</h3>
        {packageName && <span className="text-sm text-muted-foreground">· {packageName}</span>}
      </header>

      <p className="mb-3 text-sm font-medium">{change.summary}</p>

      <div className="mb-4 space-y-1.5">
        <DiffRow label="Nights" before={nights(change.before.nights)} after={nights(change.after.nights)} />
        <DiffRow label="Hotel" before={orNone(change.before.hotel)} after={orNone(change.after.hotel)} />
        <DiffRow label="Destination" before={orNone(change.before.destination)} after={orNone(change.after.destination)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act('approve')} disabled={busy !== null}>
          {busy === 'approve' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => act('discard')} disabled={busy !== null}>
          {busy === 'discard' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Undo2 className="mr-1 h-4 w-4" />}
          Discard
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Approving records that you have reviewed this. It does not send anything to the customer —
        use the quotation button when you are ready to send updated pricing.
      </p>
    </section>
  );
}
