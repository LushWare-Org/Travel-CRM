import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { LeadIntakeRequest } from '@travel-crm/contracts';
import { validateTransition } from '../services/state-machine.service.js';

// ─── Slot / contact mapping helpers ─────────────────────────────
// `Lead.run` maps wizard slots onto Lead columns. `duration` has no Lead
// column, so when a travelDate is already known it is folded into endDate;
// otherwise the duration (and `preferences`, which also has no column) is
// folded into the free-text `message` field so they are never silently dropped.
// The intake channel/session id is the idempotency key.
//
// SECURITY: no contact-based cross-session lookup exists here on purpose. An
// earlier revision matched ANY existing Lead by email/phone/whatsapp — but
// `contact` is fully attacker-controlled from the PUBLIC, unauthenticated
// wizard-turn endpoint, making that an IDOR: an anonymous caller could type a
// stranger's email into a fresh wizard session and merge into (and overwrite)
// or append into that stranger's Lead. Dedupe is scoped to the caller's own
// (channel, sessionId) key only, which is safe because sessionId is a
// non-guessable client-generated UUID the caller already owns. Real
// cross-session merge-by-contact requires a verified-ownership mechanism
// (e.g. an email confirmation link) and is intentionally deferred, not
// silently dropped — see TODOS.md and docs/designs/chatbot-inbound-lead-intake.md.

function normalizeContact(contact) {
  return {
    name: contact.name || null,
    email: contact.email?.trim().toLowerCase() || null,
    phone: contact.phone?.replace(/\D/g, '') || null,
    whatsapp: contact.whatsapp?.replace(/\D/g, '') || null,
  };
}

function slotExtras({ slots, existingTravelDate, selectedPackageId }) {
  const parts = [];
  if (slots.duration != null && !existingTravelDate) parts.push(`Trip duration: ${slots.duration} days`);
  if (slots.preferences) parts.push(`Preferences: ${slots.preferences}`);
  // No LeadPackageSelection is created from chat intake yet (TODOS.md) — the
  // id is folded into the free-text message so it is visible to the claiming
  // agent instead of silently dropped at this service boundary.
  if (selectedPackageId) parts.push(`Selected package: ${selectedPackageId}`);
  return parts;
}

function buildCreateData({ channel, sessionId, contact, slots, selectedPackageId }) {
  const clean = normalizeContact(contact);
  const extras = slotExtras({ slots, existingTravelDate: null, selectedPackageId });
  return {
    name: clean.name || null,
    email: clean.email,
    phone: clean.phone,
    whatsapp: clean.whatsapp,
    source: 'chatbot',
    platform: 'Chatbot_Wizard',
    intakeChannel: channel,
    intakeSessionId: sessionId,
    destination: slots.destination || null,
    numberOfTravelers: slots.travelers ?? null,
    budget: slots.budget || null,
    message: extras.length ? extras.join('; ') : null,
    lifecycleStatus: 'PENDING_VERIFICATION',
    // Machine-created lead, never auto-assigned — an agent must claim it.
    statusHistory: {
      create: [{ status: 'PENDING_VERIFICATION', actor: 'SYSTEM', changedById: null, notes: 'Created by chatbot lead intake' }],
    },
  };
}

// Merges only the slots actually present in this turn, leaving the rest of an
// existing lead untouched. Never resets lifecycleStatus.
function mergeSlotData({ slots, existing, selectedPackageId }) {
  const data = {};
  if (slots.destination != null && slots.destination !== '') data.destination = slots.destination;
  if (slots.travelers != null) data.numberOfTravelers = slots.travelers;
  if (slots.budget != null && slots.budget !== '') data.budget = slots.budget;

  // Only fold in extras not already present verbatim — the durable-signal
  // check fires on EVERY turn while it holds, so without this a still-PENDING
  // lead's message would accumulate "Trip duration: 7 days" once per turn.
  const extras = slotExtras({ slots, existingTravelDate: existing?.travelDate, selectedPackageId });
  const base = (existing?.message || '').trim();
  const newExtras = extras.filter((extra) => !base.includes(extra));
  if (newExtras.length) {
    data.message = [base, newExtras.join('; ')].filter(Boolean).join(' | ') || null;
  } else if (base) {
    data.message = base;
  }

  if (slots.duration != null && existing?.travelDate) {
    const end = new Date(existing.travelDate);
    end.setUTCDate(end.getUTCDate() + slots.duration);
    data.endDate = end;
  }
  return data;
}

// Transcript messages are deduped by (leadId, externalMessageId) so a resent
// sliding window is a safe no-op against the unique constraint. We pre-filter
// against already-stored ids and pass skipDuplicates as a belt-and-suspenders
// guard for a concurrent duplicate.
async function appendTranscriptMessages(tx, leadId, transcript) {
  if (!transcript?.length) return [];
  const existing = await tx.leadCommunicationLog.findMany({
    where: { leadId, externalMessageId: { in: transcript.map((m) => m.id) } },
    select: { externalMessageId: true },
  });
  const existingIds = new Set(existing.map((e) => e.externalMessageId));
  const newMessages = transcript.filter((m) => !existingIds.has(m.id));
  if (!newMessages.length) return [];
  await tx.leadCommunicationLog.createMany({
    data: newMessages.map((m) => ({
      leadId,
      type: 'message',
      notes: m.content,
      externalMessageId: m.id,
      date: m.at ? new Date(m.at) : new Date(),
      byId: null,
    })),
    skipDuplicates: true,
  });
  return newMessages;
}

// ─── POST /api/v1/leads/internal/intake ────────────────────────
// Channel-agnostic service-to-service lead intake. Body = LeadIntakeRequest.
// Response envelope matches every other lead-service endpoint: { success, data }.
export const intakeLead = asyncHandler(async (req, res) => {
  const parsed = LeadIntakeRequest.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new AppError(messages, 400);
  }
  const { channel, sessionId, contact, slots = {}, transcript, selectedPackageId } = parsed.data;
  const cleanContact = normalizeContact(contact);
  const sessionKey = {
    intakeChannel_intakeSessionId: { intakeChannel: channel, intakeSessionId: sessionId },
  };

  const result = await prisma.$transaction(async (tx) => {
    const sessionLead = await tx.lead.findUnique({ where: sessionKey });

    if (sessionLead && sessionLead.lifecycleStatus !== 'PENDING_VERIFICATION') {
      // Already left PENDING_VERIFICATION (claimed/worked) — append transcript
      // only; never touch scalar fields (destination/dates/travelers) so a live
      // conversation can't bypass the quote/date/traveler gatekeepers.
      await appendTranscriptMessages(tx, sessionLead.id, transcript);
      return { leadId: sessionLead.id, lifecycleStatus: sessionLead.lifecycleStatus, created: false };
    }

    // Brand-new session (or a still-PENDING repeat) — upsert so two
    // near-simultaneous first calls for the same session converge onto one row
    // instead of one throwing a P2002 unique-violation. The update branch never
    // resets lifecycleStatus; it only merges the slots of the still-PENDING row.
    const upserted = await tx.lead.upsert({
      where: sessionKey,
      create: buildCreateData({ channel, sessionId, contact: cleanContact, slots, selectedPackageId }),
      update: mergeSlotData({ slots, existing: sessionLead, selectedPackageId }),
    });
    const created = !sessionLead;
    await appendTranscriptMessages(tx, upserted.id, transcript);
    return { leadId: upserted.id, lifecycleStatus: upserted.lifecycleStatus, created };
  });

  res.json({ success: true, data: result });
});

// ─── POST /api/v1/leads/:id/claim ──────────────────────────────
// A salesRep/admin claims an unassigned PENDING_VERIFICATION lead, moving it
// into the normal NEW flow. Response envelope matches every other lead-service
// endpoint: { success, data }.
export const claimLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);
  if (lead.lifecycleStatus !== 'PENDING_VERIFICATION') {
    throw new AppError('Lead is not pending verification', 409);
  }

  try {
    validateTransition({ currentStatus: 'PENDING_VERIFICATION', nextStatus: 'NEW' });
  } catch (err) {
    // State-machine gatekeeper failures are client errors, not an unhandled 500
    // — matches updateLead's handling of the same validateTransition call.
    throw new AppError(err.message, 400);
  }

  // Atomic conditional update, not a plain update: the findUnique check above
  // is check-then-act and cannot by itself prevent two salesReps claiming the
  // same lead concurrently. Requiring lifecycleStatus=PENDING_VERIFICATION in
  // the WHERE clause means only the first concurrent claim can succeed.
  // updateMany cannot create nested rows, so the statusHistory audit entry
  // (every other lifecycle transition in this service records one) is a
  // separate write immediately after — the claim is the one event in this
  // whole feature that must be attributable to a specific agent.
  const { count } = await prisma.lead.updateMany({
    where: { id: req.params.id, lifecycleStatus: 'PENDING_VERIFICATION' },
    data: { assignedToId: req.user.id, assignedById: req.user.id, assignmentMode: 'manual', lifecycleStatus: 'NEW' },
  });
  if (count === 0) {
    throw new AppError('Lead was already claimed by someone else', 409);
  }
  await prisma.leadStatusHistory.create({
    data: {
      leadId: req.params.id,
      status: 'NEW',
      actor: 'USER',
      changedById: req.user.id,
      notes: 'Claimed from PENDING_VERIFICATION',
    },
  });

  const updated = await prisma.lead.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: updated.id, lifecycleStatus: updated.lifecycleStatus, assignedToId: updated.assignedToId } });
});
