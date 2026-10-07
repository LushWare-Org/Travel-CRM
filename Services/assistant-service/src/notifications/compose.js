import { bandOf } from '../insights/score.js';
import { BUSINESS_NOTIFICATION_RULES } from './rules.js';

export const SUPPRESSION_WINDOW_MS = 7 * 86_400_000;

const number = (value) => Number(value) || 0;

function passesFloor(signal, floor = {}) {
  if (floor.minCount !== undefined && number(signal?.count) < floor.minCount) return false;
  if (floor.minValue !== undefined && number(signal?.value) < floor.minValue) return false;
  return true;
}

function isSuppressed(candidate, state, now) {
  if (!state || candidate.severity === 'critical') return false;
  if (state.lastMaterialValue !== candidate.materialValue) return false;
  if (state.dismissedAt) return true;
  if (!state.acknowledgedAt) return false;
  return now.getTime() - new Date(state.acknowledgedAt).getTime() < SUPPRESSION_WINDOW_MS;
}

function materialNumber(value) {
  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function composeNotifications({
  signals = {},
  scope = 'org',
  currency = 'USD',
  priorState = new Map(),
  now = new Date(),
  unavailableSignals = [],
} = {}) {
  const unavailable = new Set(unavailableSignals);
  const notifications = [];

  for (const rule of BUSINESS_NOTIFICATION_RULES) {
    if (rule.scope === 'org' && scope === 'own') continue;
    if (unavailable.has(rule.signal)) continue;
    const signal = signals[rule.signal];
    if (!signal || !passesFloor(signal, rule.floor)) continue;

    const built = rule.build(signal, { currency });
    if (!built) continue;

    const materialValue = rule.materialValue(signal);
    const key = rule.id;
    const state = priorState.get(key);
    const candidate = {
      id: rule.id,
      key,
      category: rule.category,
      severity: rule.severity,
      section: rule.severity === 'info' ? 'current_state' : 'attention',
      text: built.text,
      facts: built.facts,
      materialValue,
      ...(built.target ? { target: built.target } : {}),
      firstSeenAt: state?.firstSeenAt ? new Date(state.firstSeenAt).toISOString() : now.toISOString(),
      unread: !state?.lastSeenAt,
    };

    if (!isSuppressed(candidate, state, now)) notifications.push(candidate);
  }

  notifications.sort((left, right) => {
    const band = bandOf(left.severity) - bandOf(right.severity);
    if (band !== 0) return band;
    const material = materialNumber(right.materialValue) - materialNumber(left.materialValue);
    if (material !== 0) return material;
    return new Date(right.firstSeenAt).getTime() - new Date(left.firstSeenAt).getTime();
  });

  const unreadCounts = { critical: 0, warning: 0, info: 0 };
  for (const notification of notifications) {
    if (notification.unread) unreadCounts[notification.severity] += 1;
  }

  return { notifications, unreadCounts };
}
