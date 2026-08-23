import type { TravelerForm, TravelerType } from './types';

export const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'];

export const TRIP_TYPES: { id: 'oneWay' | 'roundTrip'; label: string }[] = [
  { id: 'oneWay', label: 'One Way' },
  { id: 'roundTrip', label: 'Round Trip' },
];

export const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'price', label: 'Price (lowest)' },
  { id: 'departure', label: 'Departure (earliest)' },
  { id: 'duration', label: 'Duration (shortest)' },
  { id: 'stops', label: 'Stops (fewest)' },
];

// Grouped by meaning, same convention as StatusBadge (BillingInvoicing) and
// LeadStatusBadge: cancelled/failed are terminal-negative, confirmed/ticketed
// are the positive milestone, quoted/pending are still in motion.
export const STATUS_TABS: { id: 'all' | 'confirmed' | 'pending' | 'cancelled'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'pending', label: 'Pending' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const todayStr = (): string => new Date().toISOString().split('T')[0];

export const emptyTraveler = (type: TravelerType = 'adult'): TravelerForm => ({
  type,
  title: 'Mr',
  firstName: '',
  lastName: '',
  dob: '',
  gender: '',
  passportNumber: '',
  passportExpiry: '',
  nationality: '',
  frequentFlyerNumber: '',
});

export function fmtDate(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function fmtDuration(mins?: number): string {
  if (mins == null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? `${m}m` : ''}`;
}

export function fmtMoney(amount?: number, currency?: string): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
}

export function segmentStops(segments?: { stops?: number }[]): number {
  return segments?.[0]?.stops ?? (segments?.length || 1) - 1;
}
