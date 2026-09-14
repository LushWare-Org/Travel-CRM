import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import { searchPackages } from '../services/package.client.js';
import {
  getTripBrief, getPaymentBrief, attachPackage, adjustItinerary, previewPricing,
} from '../services/lead.client.js';
import { getLatestSentDocument, resendDocument } from '../services/billing.client.js';

function extractToolContext(body) {
  const callId = body?.call?.call_id ?? body?.call_id ?? body?.args?.call_id ?? null;
  const args = body?.args && typeof body.args === 'object' ? body.args : (body || {});
  return { callId, args };
}

async function resolveLeadId(callId) {
  if (!callId) return null;
  const call = await prisma.voiceCall.findUnique({ where: { retellCallId: callId } });
  return call?.leadId ?? null;
}

async function logEvent(callId, functionName, args, result, succeeded, startedAt, log) {
  if (!callId) return;
  const call = await prisma.voiceCall.findUnique({ where: { retellCallId: callId } });
  if (!call) return;
  const count = await prisma.voiceCallEvent.count({ where: { voiceCallId: call.id } });
  await prisma.voiceCallEvent.create({
    data: {
      voiceCallId: call.id,
      sequence: count,
      functionName,
      args,
      result,
      succeeded,
      latencyMs: Date.now() - startedAt,
    },
  }).catch((err) => {
    // Audit logging must never fail the tool call itself, but a silent
    // failure here is exactly the bug this comment now guards against —
    // log it loudly instead of swallowing it a second time.
    log?.error({ err, callId, functionName }, 'Failed to log VoiceCallEvent');
  });
}

function wrap(functionName, handler) {
  return asyncHandler(async (req, res) => {
    const startedAt = Date.now();
    const { callId, args } = extractToolContext(req.body);
    let result;
    let succeeded = true;
    try {
      result = await handler({ callId, args, requestId: req.requestId, log: req.log });
    } catch (err) {
      succeeded = false;
      req.log.error({ err, functionName, callId }, 'Voice tool call failed');
      result = { error: true, message: 'Could not complete that right now.' };
    }
    await logEvent(callId, functionName, args, result, succeeded, startedAt, req.log);
    res.json(result);
  });
}

// ─── ANSWER tier ─────────────────────────────────────────────────

export const searchPackagesTool = wrap('search_packages', async ({ args, requestId }) => {
  const results = await searchPackages(args?.query, requestId);
  return { count: results.length, packages: results };
});

export const getTripStatusTool = wrap('get_trip_status', async ({ callId, requestId }) => {
  const leadId = await resolveLeadId(callId);
  if (!leadId) return { available: false };
  const brief = await getTripBrief(leadId, requestId);
  return { available: true, ...brief };
});

// Money — the tool's own Retell-side description instructs the agent to call
// this ONLY when the caller explicitly asks about price, payment, invoice or
// balance (see docs/voice-agent-prompt.md). This endpoint's own contract is
// the other half of that rule: it returns figures only when a quotation has
// already been generated (loadPaymentBrief on lead-service is gated on
// selection.currentQuoteId), never a number that hasn't already reached the
// customer on a real document.
export const getPaymentStatusTool = wrap('get_payment_status', async ({ callId, requestId }) => {
  const leadId = await resolveLeadId(callId);
  if (!leadId) return { available: false };
  const brief = await getPaymentBrief(leadId, requestId);
  return { available: true, ...brief };
});

// ─── PREPARE tier ────────────────────────────────────────────────

// Server-side enforcement of the prompt's own confirmation rule — a prompt
// instruction alone didn't stop the agent from mutating the wrong caller's
// trip if it skipped the confirmation step, since every tool call in a call
// only ever reaches the one lead bound to it (see resolveLeadId). Requiring
// trip_confirmed as a real argument means the LLM must explicitly assert
// confirmation happened on every single mutating call, not just once at the
// top of the conversation — Retell's own tool schema also marks it required.
function requireTripConfirmed(args) {
  return args?.trip_confirmed === true;
}

export const attachPackageTool = wrap('attach_package', async ({ callId, args, requestId }) => {
  const leadId = await resolveLeadId(callId);
  if (!leadId) return { attached: false, reason: 'no_active_lead' };
  if (!requireTripConfirmed(args)) return { attached: false, reason: 'trip_not_confirmed' };
  const packageId = typeof args?.package_id === 'string' ? args.package_id : null;
  if (!packageId) return { attached: false, reason: 'missing_package_id' };
  const result = await attachPackage(leadId, packageId, requestId);
  return { attached: true, ...result };
});

export const adjustItineraryTool = wrap('adjust_itinerary', async ({ callId, args, requestId }) => {
  const leadId = await resolveLeadId(callId);
  if (!leadId) return { adjusted: false, reason: 'no_active_lead' };
  if (!requireTripConfirmed(args)) return { adjusted: false, reason: 'trip_not_confirmed' };
  const changes = {
    ...(Number.isFinite(args?.add_nights) ? { addNights: Number(args.add_nights) } : {}),
    ...(Number.isFinite(args?.remove_nights) ? { removeNights: Number(args.remove_nights) } : {}),
    ...(typeof args?.hotel_name === 'string' && args.hotel_name.trim() ? { hotelName: args.hotel_name.trim() } : {}),
    ...(typeof args?.destination === 'string' && args.destination.trim() ? { destination: args.destination.trim() } : {}),
  };
  if (!Object.keys(changes).length) return { adjusted: false, reason: 'no_changes_given' };
  const result = await adjustItinerary(leadId, changes, requestId);
  return { adjusted: true, ...result };
});

// The result is never spoken by design (see docs/voice-agent-prompt.md and
// the design doc's money rule) — this tool exists only so a rep opens the
// lead with fresh numbers already computed, never to answer a caller's
// question directly.
export const previewPriceTool = wrap('preview_price', async ({ callId, requestId }) => {
  const leadId = await resolveLeadId(callId);
  if (!leadId) return { available: false };
  // The computed figures are fetched (so the write side effect — none here,
  // since preview persists nothing — and the VoiceCallEvent audit trail both
  // run) but deliberately never included in the response below. The LLM
  // never sees the numbers at all, which is a stronger guarantee than a
  // prompt instruction alone: even a prompt failure cannot leak what was
  // never sent back to it.
  await previewPricing(leadId, requestId);
  return { available: true, computed: true, note: 'internal use only — never speak this figure' };
});

// Resends whichever document (quotation/invoice/receipt/voucher) was most
// recently sent to this lead — never creates a fresh one. Each type's own
// billing-service endpoint is the actual enforcement of "only ever resend
// something already sent" (it 409s otherwise); this handler just finds which
// one to target and relays the result. The caller has no way to name a
// specific type via speech reliably, so "resend that" always means the most
// recent thing sent — matching the design doc's Phase 4 scope.
export const resendDocumentTool = wrap('resend_document', async ({ callId, requestId }) => {
  const leadId = await resolveLeadId(callId);
  if (!leadId) return { sent: false, reason: 'no_active_lead' };

  const { latest } = await getLatestSentDocument(leadId, requestId);
  if (!latest) return { sent: false, reason: 'nothing_sent_yet' };

  const result = await resendDocument(latest.type, latest.id, requestId);
  const sent = result?.email === 'sent' || result?.whatsapp === 'sent';
  return { sent, documentType: latest.type, email: result?.email ?? null, whatsapp: result?.whatsapp ?? null };
});
