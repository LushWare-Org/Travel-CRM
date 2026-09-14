const DAY_MS = 24 * 60 * 60 * 1000;
export const STALE_AFTER_DAYS = 90;

export function classifyTripRecency(lead, now = new Date()) {
  const ms = now.getTime();

  const end = toTime(lead?.endDate);
  if (end !== null) return end >= ms ? 'LIVE' : 'PAST';

  const start = toTime(lead?.travelDate);
  if (start !== null) return start >= ms ? 'LIVE' : 'PAST';
  if (lead?.lifecycleStatus === 'CONFIRMED') return 'PAST';

  const touched = toTime(lead?.updatedAt);
  if (touched === null) return 'LIVE';
  return ms - touched <= STALE_AFTER_DAYS * DAY_MS ? 'LIVE' : 'PAST';
}

export function isSamePerson(names = []) {
  const known = names
    .map((n) => (n || '').trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(Boolean);
  return new Set(known).size <= 1;
}

function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}
