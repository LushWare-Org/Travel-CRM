import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

// ── Public: fire-and-forget telemetry sink ──
// The widget never blocks UI on this write and never surfaces its errors to
// the visitor, so a DB failure here must never look like a turn failure:
// catch, log, and still answer { success: true }. Telemetry loss is
// acceptable; breaking the widget over a telemetry write is not.
export const recordEvent = asyncHandler(async (req, res) => {
  const { sessionId, eventType, tool, route } = req.body;

  try {
    await prisma.assistantEvent.create({
      data: { sessionId, eventType, tool: tool ?? null, route: route ?? null },
    });
  } catch (err) {
    logger.error({ err, sessionId, eventType }, 'Failed to persist assistant telemetry event');
  }

  res.json({ success: true });
});
