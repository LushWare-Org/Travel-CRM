import prisma from '../db/client.js';

/**
 * Values the lead-level state-machine gatekeepers need, derived from a
 * selection's persisted pricing/cost lines.
 */
export function gatekeeperInputs(pricing, lines = []) {
  const flightActualTotal = (lines || [])
    .filter((l) => l.flightBookingId)
    .reduce((sum, l) => sum + (Number(l.actualTotal) || 0), 0);
  const hotelActualTotal = (lines || [])
    .filter((l) => l.category === 'accommodation')
    .reduce((sum, l) => sum + (Number(l.actualTotal) || 0), 0);
  return {
    sellSubtotal: Number(pricing?.sellSubtotal) || 0,
    verifiedPaymentTotal: Number(pricing?.paidAmount) || 0,
    depositAmount: Number(pricing?.depositAmount) || 0,
    flightActualTotal,
    hotelActualTotal,
  };
}

/**
 * Loads the selection currently driving the lead-level gatekeeper checks:
 * `lead.primarySelectionId` if set, else the lead's first-created selection
 * (covers a lead that has a selection but hasn't been re-pointed yet).
 */
export async function loadPrimarySelection(lead, prismaClient = prisma) {
  if (!lead) return null;
  const selectionId = lead.primarySelectionId
    ?? (await prismaClient.leadPackageSelection.findFirst({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' },
    }))?.id;
  if (!selectionId) return null;
  return prismaClient.leadPackageSelection.findUnique({
    where: { id: selectionId },
    include: { pricing: true, costLines: true },
  });
}
