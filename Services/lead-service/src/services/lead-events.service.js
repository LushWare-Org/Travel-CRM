import prisma from '../db/client.js';
import AppError from '../utils/appError.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Finds the selection a billing event targets: the one matching the event's
 * packageId (or the manual slot, for a falsy packageId), falling back to the
 * lead's primary selection for events emitted before packageId was added to
 * the webhook payload, or that otherwise don't carry one.
 */
export async function findSelectionForEvent(lead, packageId, prismaClient = prisma) {
  const where = packageId ? { leadId: lead.id, packageId } : { leadId: lead.id, isManual: true };
  const bySpecific = await prismaClient.leadPackageSelection.findFirst({ where, include: { pricing: true } });
  if (bySpecific) return bySpecific;

  if (lead.primarySelectionId) {
    return prismaClient.leadPackageSelection.findUnique({
      where: { id: lead.primarySelectionId },
      include: { pricing: true },
    });
  }
  return null;
}

/**
 * Pure transition logic for a billing event against a lead/selection.
 * Returns `{ target: 'lead' | 'selection', data, leadData?, statusChanged }`,
 * or null when the event is a no-op.
 */
export function applyEventToLead({ lead, selection, event }) {
  const { type, payload = {}, occurredAt } = event;
  const now = occurredAt ? new Date(occurredAt) : new Date();

  switch (type) {
    case 'quotation.accepted': {
      if (!selection || selection.quoteAcceptedAt) return null;
      return { target: 'selection', data: { quoteAcceptedAt: now }, statusChanged: false };
    }

    // The lead's overall funnel stage, not per-selection — a rejected/
    // expired quote sends the whole deal back to REVISION regardless of
    // which package it was for.
    case 'quotation.rejected':
    case 'quotation.expired': {
      if (lead.lifecycleStatus !== 'QUOTED') return null;
      return {
        target: 'lead',
        data: {
          lifecycleStatus: 'REVISION',
          statusHistory: {
            create: [{
              status: 'REVISION',
              actor: 'SYSTEM',
              changedById: null,
              notes: payload.reason || `${type} received`,
            }],
          },
        },
        statusChanged: true,
      };
    }

    case 'payment.verified': {
      if (!selection) return null;
      const amount = Number(payload.amount) || 0;
      const pricing = selection.pricing || {};
      const paidAmount = round2((Number(pricing.paidAmount) || 0) + amount);
      const totalAmount = Number(pricing.totalAmount) || 0;
      const balanceDue = Math.max(0, round2(totalAmount - paidAmount));
      const depositAmount = Number(pricing.depositAmount) || 0;
      const canApprove =
        ['QUOTED', 'REVISION'].includes(lead.lifecycleStatus) &&
        paidAmount > 0 &&
        paidAmount >= depositAmount;

      const result = {
        target: 'selection',
        data: { pricing: { update: { paidAmount, balanceDue } } },
        statusChanged: canApprove,
      };
      if (canApprove) {
        result.leadData = {
          lifecycleStatus: 'APPROVED',
          statusHistory: {
            create: [{
              status: 'APPROVED',
              actor: 'SYSTEM',
              changedById: null,
              notes: 'Verified payment covers the deposit',
            }],
          },
        };
      }
      return result;
    }

    default:
      throw new AppError(`Unknown event type: ${type}`, 400);
  }
}

/**
 * Idempotent entry point for billing webhooks. The lead service remains the
 * single writer of lifecycleStatus.
 */
export async function handleLeadEvent({ event, prismaClient = prisma }) {
  if (!event?.id || !event?.type || !event?.leadId) {
    throw new AppError('Invalid event: id, type and leadId are required', 400);
  }

  const existing = await prismaClient.leadInternalEvent.findUnique({ where: { eventId: event.id } });
  if (existing) return { duplicate: true };

  const lead = await prismaClient.lead.findUnique({ where: { id: event.leadId } });
  if (!lead) throw new AppError('Lead not found', 404);

  const selection = await findSelectionForEvent(lead, event.payload?.packageId, prismaClient);

  const result = applyEventToLead({ lead, selection, event });
  if (!result) return { processed: true, changed: false };

  if (result.target === 'selection') {
    if (!selection) return { processed: true, changed: false };
    await prismaClient.leadPackageSelection.update({ where: { id: selection.id }, data: result.data });
    if (result.leadData) {
      await prismaClient.lead.update({ where: { id: event.leadId }, data: result.leadData });
    }
  } else {
    await prismaClient.lead.update({ where: { id: event.leadId }, data: result.data });
  }

  await prismaClient.leadInternalEvent.create({
    data: {
      eventId: event.id,
      leadId: event.leadId,
      type: event.type,
      payload: event.payload ?? null,
    },
  });
  return { processed: true, changed: result.statusChanged ?? false };
}
