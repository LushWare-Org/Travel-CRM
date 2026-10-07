import { domainAuthHeader } from '../utils/cloudRunAuth.js';
import { forwardActorHeaders } from '../middleware/auth.js';

export function analyticsServiceUrl() {
  return process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009';
}

/**
 * Fetch the bounded business signal envelope under the original actor's
 * identity. Redirects are refused so forwarded identity headers cannot leave
 * the configured service origin.
 */
export async function fetchBusinessSignals(req, signal) {
  const baseUrl = analyticsServiceUrl();
  const auth = await domainAuthHeader(baseUrl);
  const url = new URL('/api/v1/analytics/business/signals', baseUrl).toString();
  const response = await fetch(url, {
    headers: {
      ...forwardActorHeaders(req),
      'content-type': 'application/json',
      ...auth,
    },
    redirect: 'error',
    signal,
  });

  if (!response.ok) throw new Error(`Business signals unavailable (${response.status})`);
  const envelope = await response.json();
  if (!envelope?.success || !envelope?.data?.signals) throw new Error('Business signals response is malformed');
  return envelope.data;
}
