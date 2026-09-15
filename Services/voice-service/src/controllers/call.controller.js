import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every call on a lead, newest first, never merged. Powers the AI tab.
export const listCallsForLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  if (!UUID_RE.test(leadId)) throw new AppError('Invalid lead id', 400);

  const calls = await prisma.voiceCall.findMany({
    where: { leadId, disposition: { not: 'IN_PROGRESS' } },
    orderBy: { startedAt: 'desc' },
    take: 100,
    include: { events: { orderBy: { sequence: 'asc' } } },
  });

  res.json({
    success: true,
    data: calls.map((c) => ({
      id: c.id,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      durationSec: c.durationSec,
      direction: c.direction,
      disposition: c.disposition,
      matchOutcome: c.matchOutcome,
      needsRepFollowup: c.needsRepFollowup,
      summary: c.summary,
      sentiment: c.sentiment,
      transcript: c.transcript ?? [],
      actions: c.events.map((e) => ({
        sequence: e.sequence,
        functionName: e.functionName,
        succeeded: e.succeeded,
        createdAt: e.createdAt,
      })),
    })),
  });
});

