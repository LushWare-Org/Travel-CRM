export const TIME_RANGES = ['daily', 'weekly', 'monthly', 'annual'];

// Controls both the lookback window and the trend-chart bucket granularity
// for a given `timeRange` filter value coming from the Management frontend.
const CONFIG = {
  daily: { truncUnit: 'day', lookbackDays: 14 },
  weekly: { truncUnit: 'week', lookbackDays: 12 * 7 },
  monthly: { truncUnit: 'month', lookbackDays: 6 * 31 },
  annual: { truncUnit: 'month', lookbackDays: 366 },
};

export function resolveTimeRange(timeRange = 'monthly', now = new Date()) {
  const config = CONFIG[timeRange] || CONFIG.monthly;
  const end = new Date(now);
  const start = new Date(end);
  start.setDate(start.getDate() - config.lookbackDays);
  return { start, end, truncUnit: config.truncUnit };
}

export function formatBucketLabel(date, truncUnit) {
  const d = new Date(date);
  if (truncUnit === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
}
