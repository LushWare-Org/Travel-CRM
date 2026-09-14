import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { inboundCallSchema, postCallSchema } from '../validators/retell.schema.js';
import { resolveCallerIdentity, buildDynamicVariables } from '../services/callerIdentity.service.js';
import { toStoredTranscript, toIntakeTranscript } from '../services/transcript.service.js';
import { lookupLeadsByPhone, submitIntake } from '../services/lead.client.js';
import { notifyRepsOfCallback } from '../services/notify.service.js';
import { isOverDailyCap } from '../services/callVolume.service.js';
import { normalizePhone, maskPhone } from '../utils/phone.js';

const PENDING_ADOPTION_WINDOW_MS = 6 * 60 * 60 * 1000;

function findAdoptableCall(callId, fromNumber) {
  const adoptAfter = new Date(Date.now() - PENDING_ADOPTION_WINDOW_MS);
  return prisma.voiceCall.findFirst({
    where: {
      OR: [
        { retellCallId: callId },
        {
          retellCallId: { startsWith: 'pending:' },
          fromNumber,
          disposition: 'IN_PROGRESS',
          startedAt: { gte: adoptAfter },
        },
      ],
    },
    orderBy: { startedAt: 'desc' },
  });
}

export const handleInboundCall = asyncHandler(async (req, res) => {
  const parsed = inboundCallSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('Invalid inbound call payload', 400);

  const { from_number: fromNumber, to_number: toNumber } = parsed.data.call_inbound;

  const voiceNumber = await prisma.voiceNumber.findFirst({
    where: { e164: normalizePhone(toNumber), isActive: true },
  });
  if (!voiceNumber) {
    req.log.warn({ toNumber: maskPhone(toNumber) }, 'Call to an unmapped or inactive number');
    throw new AppError('Number not configured', 404);
  }

  const normalizedFrom = normalizePhone(fromNumber);
  const volume = await isOverDailyCap(normalizedFrom);
  if (volume.overCap) {
    // Retell's inbound webhook has no documented field to refuse or hang up a
    // call already ringing (checked against the SDK's own types — see
    // callVolume.service.js), so the call is still answered. What this DOES
    // do is stop it from amplifying into lead-service: no lookup call spent
    // on a number that has already looked suspicious this many times today.
    req.log.warn(
      { fromNumber: maskPhone(fromNumber), count: volume.count, cap: volume.cap },
      'Caller over the daily call cap — skipping identity lookup'
    );
  }

  let lookup = { matches: [], samePerson: true };
  if (!volume.overCap) {
    try {
      lookup = (await lookupLeadsByPhone(normalizedFrom, req.requestId)) ?? lookup;
    } catch (err) {
      // A lookup failure must never stop the phone from being answered — the
      // caller is simply treated as unknown.
      req.log.error({ err }, 'Caller lookup failed; treating caller as unknown');
    }
  }

  const matches = lookup?.matches ?? [];
  const identity = resolveCallerIdentity(lookup);

  await prisma.voiceCall.create({
    data: {
      retellCallId: `pending:${toNumber}:${fromNumber}:${Date.now()}`,
      numberId: voiceNumber.id,
      direction: 'INBOUND',
      fromNumber: normalizedFrom,
      toNumber: normalizePhone(toNumber),
      matchOutcome: identity.outcome,
      leadId: identity.leadId,
    },
  });

  req.log.info(
    { fromNumber: maskPhone(fromNumber), outcome: identity.outcome, matches: matches.length },
    'Inbound call resolved'
  );

  res.json({
    call_inbound: {
      override_agent_id: voiceNumber.retellAgentId,
      dynamic_variables: buildDynamicVariables({ identity, voiceNumber }),
    },
  });
});

// ─── POST /api/v1/webhooks/voice/post-call ─────────────────────
// Fires when the call ends. Persists the record, then hands a bounded
// transcript to lead-service intake.
export const handlePostCall = asyncHandler(async (req, res) => {
  const parsed = postCallSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('Invalid post-call payload', 400);

  const { event, call } = parsed.data;
  const fromNumber = normalizePhone(call.from_number);

  // Retell sends more than one event to this URL over a call's life —
  // observed directly from Retell's own "Test webhook" button, which fired a
  // `call_started` event here with the real call_id already known and an
  // empty transcript. Adopting the pending row's real id AS SOON AS it is
  // known (not only at call end) is what makes the real call_id available to
  // live in-call tool calls, which happen mid-conversation, long before this
  // webhook's `call_analyzed` event ever fires.
  if (event === 'call_started') {
    const adoptable = await findAdoptableCall(call.call_id, fromNumber);
    if (adoptable && adoptable.retellCallId !== call.call_id) {
      await prisma.voiceCall.update({ where: { id: adoptable.id }, data: { retellCallId: call.call_id } });
    }
    return res.json({ received: true });
  }

  const startedAt = call.start_timestamp ? new Date(call.start_timestamp) : new Date();
  const stored = toStoredTranscript(call.transcript_object ?? []);
  const existing = await findAdoptableCall(call.call_id, fromNumber);

  const data = {
    retellCallId: call.call_id,
    direction: call.direction === 'outbound' ? 'OUTBOUND' : 'INBOUND',
    fromNumber,
    toNumber: normalizePhone(call.to_number),
    startedAt,
    endedAt: call.end_timestamp ? new Date(call.end_timestamp) : new Date(),
    durationSec: call.duration_ms != null ? Math.round(call.duration_ms / 1000) : null,
    disposition: stored.length ? 'COMPLETED' : 'ABANDONED',
    transcript: stored,
    summary: call.call_analysis?.call_summary ?? null,
    sentiment: call.call_analysis?.user_sentiment ?? null,
    costCents: call.call_cost?.combined_cost != null ? Math.round(call.call_cost.combined_cost * 100) : null,
  };

  const voiceCall = existing
    ? await prisma.voiceCall.update({ where: { id: existing.id }, data })
    : await prisma.voiceCall.create({ data });

  // Intake needs a contact method; the carrier-supplied number always is one.
  if (fromNumber && stored.length) {
    const custom = call.call_analysis?.custom_analysis_data;
    const slots = extractSlots(custom);
    const email = extractEmail(custom);
    const selectedPackageId = extractSelectedPackageId(custom);
    const followup = needsFollowup(custom);
    let leadId = voiceCall.leadId;

    const volume = await isOverDailyCap(fromNumber);
    if (volume.overCap) {
      // Same cap as the inbound handler, checked again here because a burst
      // of calls can cross the threshold between inbound and post-call. The
      // call itself is still fully recorded above (transcript, recording,
      // summary) — only the propagation to lead-service and the team's inbox
      // is suppressed once a number is this far over the daily count.
      req.log.warn(
        { fromNumber: maskPhone(fromNumber), count: volume.count, cap: volume.cap, callId: call.call_id },
        'Caller over the daily call cap — skipping lead intake and rep notification'
      );
      res.json({ received: true });
      return;
    }

    try {
      const result = await submitIntake({
        channel: 'voice',
        sessionId: call.call_id,
        contact: { phone: fromNumber, ...(email ? { email } : {}) },
        slots,
        ...(selectedPackageId ? { selectedPackageId } : {}),
        transcript: toIntakeTranscript(stored, { callId: call.call_id, startedAt }),
      }, req.requestId);

      if (result?.leadId) leadId = result.leadId;
    } catch (err) {
      req.log.error({ err, callId: call.call_id }, 'Lead intake failed for completed call');
    }

    if (leadId !== voiceCall.leadId || followup !== voiceCall.needsRepFollowup) {
      await prisma.voiceCall.update({
        where: { id: voiceCall.id },
        data: { leadId, needsRepFollowup: followup },
      });
    }

    // Best-effort: the agent already told the caller a human would ring back, so
    // a failure here must be loud in the logs but must never fail the webhook —
    // Retell would retry the whole call and duplicate the lead work.
    if (followup) {
      try {
        await notifyRepsOfCallback(
          { call: { ...voiceCall, ...data }, slots, leadId },
          req.log,
          req.requestId,
        );
      } catch (err) {
        req.log.error({ err, callId: call.call_id, leadId }, 'Could not notify the team of a promised callback');
      }
    }
  }

  res.json({ received: true });
});

// Absent means "yes". The agent tells callers a human will ring them back, so
// an unset or unparsed flag must fail towards telling the team — an extra email
// costs nothing, an unkept promise costs a customer.
function needsFollowup(custom) {
  if (!custom || typeof custom !== 'object') return true;
  const raw = custom.needs_rep_followup ?? custom.needsRepFollowup;
  if (raw === false || raw === 'false') return false;
  return true;
}

function extractSlots(custom = {}) {
  if (!custom || typeof custom !== 'object') return {};
  const slots = {};
  if (custom.destination) slots.destination = String(custom.destination).slice(0, 255);
  if (custom.budget) slots.budget = String(custom.budget).slice(0, 255);
  if (custom.preferences) slots.preferences = String(custom.preferences).slice(0, 1000);
  const travelers = Number(custom.travelers);
  if (Number.isInteger(travelers) && travelers >= 1 && travelers <= 50) slots.travelers = travelers;
  const duration = Number(custom.duration);
  if (Number.isInteger(duration) && duration >= 1 && duration <= 30) slots.duration = duration;
  return slots;
}

// Loose on purpose, matching LeadIntakeContact's own email field — this is
// LLM-extracted from a spoken address, not something to reject at this
// boundary. A malformed value still reaches the lead for a rep to correct.
function extractEmail(custom = {}) {
  if (!custom || typeof custom !== 'object' || !custom.email) return undefined;
  const email = String(custom.email).trim().slice(0, 255);
  return email || undefined;
}

const PACKAGE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Retell's analysis pass can hallucinate a plausible-looking string here, so
// this is validated as a real UUID shape before it ever reaches lead-service
// — LeadIntakeRequest.selectedPackageId itself also enforces .uuid(), this
// just avoids a wasted round trip on an obviously-invalid value.
function extractSelectedPackageId(custom = {}) {
  if (!custom || typeof custom !== 'object') return undefined;
  const id = custom.selected_package_id ?? custom.selectedPackageId;
  return typeof id === 'string' && PACKAGE_ID_RE.test(id) ? id : undefined;
}
