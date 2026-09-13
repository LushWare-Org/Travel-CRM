import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';

// No shared @travel-crm/contracts entry for this endpoint yet (assistant-service
// owns its own local validators for this turn envelope, same precedent as the
// wizard-turn/itinerary-chat schemas) — this mirrors that shape on the client
// side rather than re-declaring a stricter contract package-side.

export const AssistantTurnTool = z.enum([
  'navigate',
  'answer_faq_policy',
  'answer_packages',
  'hand_off',
  'request_booking',
  'respond_conversationally',
  'redirect_off_topic',
]);

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
  // Cards already drawn this session. Declared here for the same reason as
  // `params` on a route: this schema parses the outgoing payload and zod strips
  // unknown keys, so a field omitted here never leaves the browser.
  shownPackageIds: z.array(z.string().max(64)).max(200).optional(),
  // Client-owned nav allowlist, sent per request — single source of truth
  // lives client-side (see Change 1's getEnabledAssistantRoutes); the server
  // only validates the model's chosen route against what the client offered.
  availableRoutes: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      // Query keys the assistant may filter this route by — the page's own
      // list, declared in config/assistantRoutes.ts. Load-bearing: this schema
      // parses the outgoing payload, and zod strips unknown keys, so omitting
      // `params` here would delete it before the request ever left the browser
      // and the server would never see a filter vocabulary. Optional so the
      // client and server stay compatible across a staggered deploy; the
      // server reads a missing list as "this route takes no filters".
      params: z.array(z.string().max(40)).max(20).optional(),
      // The closed set of values a filter may take, e.g. the destinations that
      // actually exist. Carried per route for the same reason `params` is: the
      // page owns the vocabulary, and the server must not keep a second copy
      // that drifts. Without it the model names a destination from memory, and
      // an unresolved slug is not rejected by this API — it returns the whole
      // catalogue, so the visitor sees an unfiltered page that looks filtered.
      paramValues: z
        .record(z.string().max(40), z.array(z.object({ value: z.string().max(60), label: z.string().max(120) })).max(200))
        .optional(),
    }),
  ),
});

export const AssistantTurnResult = z.object({
  toolCall: z.object({ tool: AssistantTurnTool, args: z.record(z.string(), z.unknown()) }),
  serverResult: z.record(z.string(), z.unknown()).nullable(),
  message: z.string(),
});

export type AssistantTurnMessageT = z.infer<typeof AssistantTurnMessage>;
export type AssistantTurnResultT = z.infer<typeof AssistantTurnResult>;
type AssistantTurnPayload = z.infer<typeof AssistantTurnRequest>;

export const ASSISTANT_TURN_TIMEOUT_MS = 30_000;

export const sendAssistantTurn = async (payload: AssistantTurnPayload) => {
  const body = AssistantTurnRequest.parse(payload);
  // retry:false — a turn is non-idempotent and expensive. The shared HTTP
  // client's default retry fires on no-response errors, including timeouts,
  // which could start a second billed turn while the first is still running.
  // The 30s client timeout stays above the server's 27s request deadline so
  // the server has time to return its own deterministic failure envelope.
  const response = await httpClient.post('/assistant/turn', body, {
    retry: false,
    timeout: ASSISTANT_TURN_TIMEOUT_MS,
  });
  return parseEnvelope(AssistantTurnResult, response.data, 'POST /assistant/turn').data;
};
