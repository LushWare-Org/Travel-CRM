import { z } from 'zod';
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
    finalStageTwoTool: z.enum(['navigate', 'answer_faq_policy', 'respond_conversationally', 'redirect_off_topic']).optional(),
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
    tool: z.enum(['navigate', 'answer_faq_policy', 'respond_conversationally', 'redirect_off_topic']).nullable(),
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
