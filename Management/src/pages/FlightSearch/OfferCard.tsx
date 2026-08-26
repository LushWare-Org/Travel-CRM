import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtTime, fmtDuration, fmtMoney } from './helpers';
import type { FlightOffer } from './types';

export function OfferSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="ml-auto h-4 w-16 rounded bg-muted" />
      </div>
      <div className="mb-2 flex items-center gap-4">
        <div className="h-5 w-16 rounded bg-muted" />
        <div className="h-0.5 flex-1 bg-muted/60" />
        <div className="h-5 w-16 rounded bg-muted" />
      </div>
      <div className="h-3 w-40 rounded bg-muted/60" />
    </div>
  );
}

interface OfferCardProps {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
  paxCount: number;
}

export default function OfferCard({ offer, onSelect, paxCount }: OfferCardProps) {
  const segs = offer.segments || [];
  const firstSeg = segs[0];
  const lastSeg = segs[segs.length - 1];
  const totalDuration = segs.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {offer.airlineCode}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{offer.airline}</div>
            <div className="text-xs text-muted-foreground">{offer.cabinClass}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {offer.refundable && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Refundable</span>
            )}
            {firstSeg?.stops === 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Direct</span>
            )}
          </div>
        </div>

        <div className="mb-2 flex items-center gap-3">
          <div className="text-right">
            <div className="font-mono text-lg font-bold tabular-nums text-foreground">{fmtTime(firstSeg?.departureAt)}</div>
            <div className="text-xs font-medium text-muted-foreground">{firstSeg?.origin}</div>
          </div>
          <div className="flex flex-1 flex-col items-center px-2">
            <div className="mb-0.5 text-xs text-muted-foreground">{fmtDuration(totalDuration)}</div>
            <div className="relative h-0.5 w-full bg-border">
              <div className="absolute -top-0.5 left-0 h-1.5 w-2 rounded-full bg-primary" />
              <div className="absolute -top-0.5 right-0 h-1.5 w-2 rounded-full bg-primary" />
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {segs.length === 1 ? 'Nonstop' : `${segs.length - 1} stop${segs.length > 2 ? 's' : ''}`}
            </div>
          </div>
          <div>
            <div className="font-mono text-lg font-bold tabular-nums text-foreground">{fmtTime(lastSeg?.arrivalAt)}</div>
            <div className="text-xs font-medium text-muted-foreground">{lastSeg?.destination}</div>
          </div>
        </div>

        {segs.length > 1 && (
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer text-primary hover:text-primary/80">
              {segs.length} segments — view details
            </summary>
            <div className="mt-2 space-y-1 border-l-2 border-border pl-2">
              {segs.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-muted-foreground">#{seg.sequence}</span>
                  <span className="font-medium text-foreground">{seg.origin} → {seg.destination}</span>
                  <span className="font-mono text-muted-foreground">{seg.marketingCarrier}{seg.flightNumber?.replace(seg.marketingCarrier ?? '', '')}</span>
                  <span className="font-mono tabular-nums">{fmtDuration(seg.durationMinutes)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="shrink-0 text-right lg:border-l lg:border-border lg:pl-5">
        <div className="font-mono text-2xl font-bold tabular-nums text-foreground">{fmtMoney(offer.fareTotal, offer.currency)}</div>
        <div className="mb-3 text-xs text-muted-foreground">
          {paxCount} traveler{paxCount > 1 ? 's' : ''}
        </div>
        <Button onClick={() => onSelect(offer)}>
          Select <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
