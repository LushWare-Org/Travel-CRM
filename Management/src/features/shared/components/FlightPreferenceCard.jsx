import { Settings2, Pencil } from 'lucide-react';

/**
 * A saved flight-preference summary card. Clicking anywhere on the card (or
 * the pencil icon specifically) opens the edit modal via onEdit — the pencil
 * is a discoverability affordance, not the only click target.
 */
export default function FlightPreferenceCard({ prefs, onEdit, onRemove }) {
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
      className="bg-blue-50 rounded-xl border border-blue-200 p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-100/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {prefs.origin || '?'} → {prefs.destination || '?'}
            </div>
            <div className="text-xs text-gray-500">
              {prefs.cabinClass || 'Economy'}{prefs.airlinePreference ? ` · ${prefs.airlinePreference}` : ''}{prefs.departureTime ? ` · ${prefs.departureTime}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            title="Edit preferences"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
            className="text-xs text-red-600 hover:text-red-700 font-medium px-2"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
