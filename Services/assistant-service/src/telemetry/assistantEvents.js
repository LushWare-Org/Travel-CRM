import { z } from 'zod';
import { ASSISTANT_TOOLS } from '../ai/prompts/assistantTurn.v1.js';
import prisma from '../db/client.js';
import logger from '../config/logger.js';

const boundedString = z.string().min(1).max(255);

export const assistantResolutionMetadataSchema = z
  .object({
    routerVersion: boundedString.optional(),
    routerModel: boundedString.optional(),
    predictedIntent: boundedString.optional(),
    socialSubtype: boundedString.optional(),
    confidenceBucket: z.enum(['low', 'medium', 'high']).optional(),
    committed: z.boolean().optional(),
    abstainReason: boundedString.optional(),
    // Derived from the one tool list. Both schemas here are `.strict()`, so a
    // tool missing from either drops the event with nothing but a logged parse
    // error — the quietest possible way to lose the telemetry a new outcome
    // exists to produce.
    finalStageTwoTool: z.enum(ASSISTANT_TOOLS).optional(),
    stageOneLatencyMs: z.number().int().nonnegative().max(27_000).optional(),
    stageTwoLatencyMs: z.number().int().nonnegative().max(27_000).optional(),
    fallbackUsed: z.boolean().optional(),
    failureCategory: z.enum(['provider', 'schema', 'timeout', 'server_deadline']).optional(),
  })
  .strict();

const assistantResolutionEventSchema = z
  .object({
    sessionId: boundedString,
    turnId: boundedString,
    tool: z.enum(ASSISTANT_TOOLS).nullable(),
    route: boundedString.nullable(),
    metadata: assistantResolutionMetadataSchema,
  })
  .strict();

export async function recordAssistantResolution(event) {
  const parsed = assistantResolutionEventSchema.safeParse(event);
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues }, 'Rejected invalid internal assistant resolution telemetry');
    return;
  }

  const { sessionId, turnId, tool, route, metadata } = parsed.data;
  try {
    await prisma.assistantEvent.create({
      data: {
        sessionId,
        turnId,
        eventType: 'resolution',
        tool,
        route,
        metadata,
      },
    });
  } catch (err) {
    logger.error({ err, sessionId, turnId }, 'Failed to persist assistant resolution telemetry event');
  }
}
