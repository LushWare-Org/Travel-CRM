import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';

// No shared @travel-crm/contracts entry for this endpoint yet (assistant-service
// owns its own local validators for this turn envelope, same precedent as the
// wizard-turn/itinerary-chat schemas) — this mirrors that shape on the client
// side rather than re-declaring a stricter contract package-side.

export const AssistantTurnTool = z.enum(['navigate', 'answer_faq_policy']);

// Identical shape to WizardTurnMessage: `id`/`at` are required so the
// stateless server can diff a resent sliding window against what the client
// already showed (see docs/designs/site-wide-floating-assistant.md's Eng
// Review Decisions — no conversation persistence server-side).
export const AssistantTurnMessage = z.object({
  id: z.string().min(1).max(255),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
  at: z.string().datetime(),
});

export const AssistantTurnRequest = z.object({
  sessionId: z.string(),
  messages: z.array(AssistantTurnMessage).min(1).max(20),
  // Client-owned nav allowlist, sent per request — single source of truth
  // lives client-side (see Change 1's getEnabledAssistantRoutes); the server
  // only validates the model's chosen route against what the client offered.
  availableRoutes: z.array(z.object({ name: z.string(), path: z.string() })),
});

export const AssistantTurnResult = z.object({
  toolCall: z.object({ tool: AssistantTurnTool, args: z.record(z.string(), z.unknown()) }),
  serverResult: z.record(z.string(), z.unknown()).nullable(),
  message: z.string(),
});

export type AssistantTurnMessageT = z.infer<typeof AssistantTurnMessage>;
export type AssistantTurnResultT = z.infer<typeof AssistantTurnResult>;
type AssistantTurnPayload = z.infer<typeof AssistantTurnRequest>;

export const sendAssistantTurn = async (payload: AssistantTurnPayload) => {
  const body = AssistantTurnRequest.parse(payload);
  // retry:false — a turn is non-idempotent and expensive (1+ billed Gemini
  // calls). The shared http client's default retry fires on ANY no-response
  // error (timeouts included) regardless of method, so without this override
  // a client-side timeout during a slow Gemini call would trigger a SECOND
  // full billed turn while the first is still running server-side (found in
  // /ship's Claude adversarial review). The failed message stays visible so
  // the visitor can deliberately resend instead.
  const response = await httpClient.post('/assistant/turn', body, { retry: false });
  return parseEnvelope(AssistantTurnResult, response.data, 'POST /assistant/turn').data;
};
