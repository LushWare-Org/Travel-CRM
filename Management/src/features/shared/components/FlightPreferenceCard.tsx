import { Settings2, Pencil } from 'lucide-react';
import type { FlightLegPrefs } from '../utils/flightLegDefaults';

interface FlightPreferenceCardProps {
  prefs: FlightLegPrefs | null | undefined;
  onEdit?: () => void;
  onRemove?: () => void;
}

/**
 * A saved flight-preference summary card. Clicking anywhere on the card (or
 * the pencil icon specifically) opens the edit modal via onEdit — the pencil
 * is a discoverability affordance, not the only click target.
 */
export default function FlightPreferenceCard({ prefs, onEdit, onRemove }: FlightPreferenceCardProps) {
  if (!prefs) return null;
  return (
    <div
      onClick={onEdit}
      role="button"
      tabIndex={0}
      aria-label={`Edit flight preferences: ${prefs.origin || '?'} to ${prefs.destination || '?'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit?.();
        }
      }}
      className="bg-primary/5 rounded-xl border border-primary/20 p-3 cursor-pointer hover:border-primary/40 hover:bg-primary/10 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {prefs.origin || '?'} → {prefs.destination || '?'}
            </div>
            <div className="text-xs text-muted-foreground">
              {prefs.cabinClass || 'Economy'}{prefs.airlinePreference ? ` · ${prefs.airlinePreference}` : ''}{prefs.departureTime ? ` · ${prefs.departureTime}` : ''}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {Number(prefs.estimatedUnitPrice) > 0
                ? `$${Number(prefs.estimatedUnitPrice).toFixed(2)} per person`
                : <span className="text-warning">No cost set — $0 in pricing</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Edit preferences"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
            className="text-xs text-destructive hover:text-destructive/80 font-medium px-2"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
