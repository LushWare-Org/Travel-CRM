import prisma from '../db/client.js';
import AppError from '../utils/appError.js';

/**
 * Pure transition logic for a billing event against a lead. Returns the
 * Prisma update payload, or null when the event is a no-op.
 */
export function applyEventToLead({ lead, event }) {
  const { type, payload = {}, occurredAt } = event;
  const now = occurredAt ? new Date(occurredAt) : new Date();

  switch (type) {
    case 'quotation.accepted': {
      if (lead.quoteAcceptedAt) return null;
      return { data: { quoteAcceptedAt: now }, statusChanged: false };
    }

    case 'quotation.rejected':
    case 'quotation.expired': {
      if (lead.lifecycleStatus !== 'QUOTED') return null;
      return {
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
      const amount = Number(payload.amount) || 0;
      const pricing = lead.pricing || {};
      const paidAmount = Math.round(((Number(pricing.paidAmount) || 0) + amount) * 100) / 100;
      const totalAmount = Number(pricing.totalAmount) || 0;
      const balanceDue = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
      const depositAmount = Number(pricing.depositAmount) || 0;
      const canApprove =
        ['QUOTED', 'REVISION'].includes(lead.lifecycleStatus) &&
        paidAmount > 0 &&
        paidAmount >= depositAmount;

      const data = {
        pricing: { update: { paidAmount, balanceDue } },
      };
      if (canApprove) {
        data.lifecycleStatus = 'APPROVED';
        data.statusHistory = {
          create: [{
            status: 'APPROVED',
            actor: 'SYSTEM',
            changedById: null,
            notes: 'Verified payment covers the deposit',
          }],
        };
      }
      return { data, statusChanged: canApprove };
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

  const lead = await prismaClient.lead.findUnique({
    where: { id: event.leadId },
    include: { pricing: true },
  });
  if (!lead) throw new AppError('Lead not found', 404);

  const result = applyEventToLead({ lead, event });
  if (!result) return { processed: true, changed: false };

  await prismaClient.lead.update({ where: { id: event.leadId }, data: result.data });
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
