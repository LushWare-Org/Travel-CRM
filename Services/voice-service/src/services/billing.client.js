import AppError from '../utils/appError.js';

const BASE = () => process.env.BILLING_SERVICE_URL || 'http://localhost:3006';
const LOOKUP_TIMEOUT_MS = 3000;
const RESEND_TIMEOUT_MS = 12000;
const RESEND_PATH_BY_TYPE = {
  quotation: 'quotations',
  invoice: 'invoices',
  receipt: 'receipts',
  voucher: 'vouchers',
};

async function call(path, { method = 'GET', requestId, timeoutMs } = {}) {
  const token = process.env.INTERNAL_EVENTS_TOKEN;
  if (!token) throw new AppError('INTERNAL_EVENTS_TOKEN is not configured', 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE()}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-token': token,
        ...(requestId ? { 'x-request-id': requestId } : {}),
      },
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new AppError(data?.message || `billing-service ${res.status}`, 502);
    return data?.data ?? data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Which already-sent document (across all four types) to resend, with no
 * money field in the response — see getLatestSentDocumentForVoice. Returns
 * `{ latest: null }` when nothing has ever been sent to this lead.
 */
export function getLatestSentDocument(leadId, requestId) {
  return call(`/api/v1/billing/internal/leads/${leadId}/latest-document`, { requestId, timeoutMs: LOOKUP_TIMEOUT_MS });
}

/**
 * Re-sends an existing document PDF. Never creates a new one — each type's
 * own resend-voice endpoint refuses a document that has never been sent
 * before, which is the actual enforcement of "only ever resend something
 * already sent." This client is just the transport.
 */
export function resendDocument(type, documentId, requestId) {
  const segment = RESEND_PATH_BY_TYPE[type];
  if (!segment) throw new AppError(`Unknown document type: ${type}`, 400);
  return call(`/api/v1/billing/${segment}/${documentId}/resend-voice`, {
    method: 'POST', requestId, timeoutMs: RESEND_TIMEOUT_MS,
  });
}
