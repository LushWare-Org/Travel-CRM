import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';
import { generateStructured } from '../ai/geminiClient.js';
import {
  buildAssistantTurnPrompt,
  canonicalizeAssistantTurnResponse,
  assistantTurnResponseSchema,
  assistantTurnResponseJsonSchema,
} from '../ai/prompts/assistantTurn.v1.js';
import { fetchPolicyDocuments, retrieveSnippets, FALLBACK_POLICY_MESSAGE } from '@travel-crm/policy-retrieval';
import { BAD_GATEWAY } from '../constants/httpStatus.js';

// The wire contract requires every assistant bubble to have non-empty
// content. Missing model-authored messages are legal in the flat generation
// schema, so deterministic fallbacks must prevent an empty response from
// poisoning every later turn's resent conversation window.
const ROUTE_DECLINED_MESSAGE =
  "I can't take you there directly — try asking for a specific page, like packages or destinations.";
const NO_MESSAGE_FALLBACK = "Sorry, I didn't quite catch that — could you rephrase?";
// Matches content.max(2000) on both wire schemas (assistant.schema.js,
// assistantTurn.ts). Enforce the cap server-side as the single source of
// truth before a response enters the client's resent conversation window.
const MAX_MESSAGE_LENGTH = 2000;
const ASSISTANT_TURN_DEADLINE_MS = 27_000;
const ASSISTANT_RESOLVER_TIMEOUT_MS = 20_000;
const SOCIAL_MESSAGES = {
  greeting: 'Hi! I can help you explore destinations, find packages, navigate the site, or answer LushWare policy questions.',
  thanks: "You're welcome! If you need anything else for your trip, just ask.",
  farewell: 'Safe travels! Come back anytime you need help planning your trip.',
  repair: "No problem. Tell me what you're trying to do, and I'll help you find the right travel option or page.",
};
const OFF_TOPIC_MESSAGE =
  "I’m here to help with travel and LushWare trips. I can help you explore destinations, find packages, navigate the site, or answer a company-policy question.";

function conversationalOutcomesEnabled() {
  return process.env.ASSISTANT_CONVERSATIONAL_OUTCOMES_ENABLED === 'true';
}

function latestUserMessage(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

// ── Public: stateless site-wide assistant turn ──
// The model selects one recognized outcome. This handler canonicalizes its
// flat generation payload, validates a strict per-tool union, and executes
// deterministic server-side behavior. Navigation resolves only routes the
// client offered in this request. Policy answers quote only server-retrieved
// snippets. Social and off-topic outcomes use reviewed server-owned copy.
export const assistantTurn = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const { sessionId, messages, availableRoutes } = req.body;
  const outcomesEnabled = conversationalOutcomesEnabled();

  // Policy candidates are available before the single resolver call, so a
  // policy answer never requires a second generation. The shared fetch has
  // its own 3-second timeout.
  const documents = await fetchPolicyDocuments();
  const candidateSnippets = retrieveSnippets(documents, latestUserMessage(messages));
  const remainingBudgetMs = ASSISTANT_TURN_DEADLINE_MS - (Date.now() - startedAt);
  if (remainingBudgetMs <= 0) {
    throw new AppError('Assistant request deadline exhausted', BAD_GATEWAY);
  }

  const prompt = buildAssistantTurnPrompt({
    messages,
    availableRoutes,
    candidateSnippets,
    conversationalOutcomesEnabled: outcomesEnabled,
  });
  const raw = await generateStructured({
    prompt,
    schema: assistantTurnResponseJsonSchema,
    maxOutputTokens: 1024,
    timeoutMs: Math.min(ASSISTANT_RESOLVER_TIMEOUT_MS, remainingBudgetMs),
    maxAttempts: 1,
  });

  // Raw Gemini args use a flat generation schema. Canonicalization copies
  // only the selected tool's fields and supplies its safe defaults; the
  // strict discriminated union then protects controller dispatch.
  const canonical = canonicalizeAssistantTurnResponse(raw, {
    conversationalOutcomesEnabled: outcomesEnabled,
  });
  const parsed = assistantTurnResponseSchema.safeParse(canonical);
  if (!parsed.success) {
    throw new AppError('AI response did not match the tool contract', BAD_GATEWAY);
  }
  const { tool, args } = parsed.data;

  let serverResult = null;
  let message = 'message' in args ? args.message : '';
  switch (tool) {
    case 'navigate': {
      // The model names a route; the client's own router executes the actual
      // navigation, so the server only ever resolves a route the client
      // offered in THIS request's availableRoutes. Anything else is ignored
      // (never executed) and logged — the model hallucinated a route.
      const routeName = typeof args.route === 'string' ? args.route : '';
      const offered = (availableRoutes || []).find((r) => r.name === routeName);
      if (offered) {
        serverResult = { route: offered.name, path: offered.path };
        if (!message) message = 'Sure — heading there now.';
      } else {
        logger.warn(
          { sessionId, requestedRoute: routeName },
          'assistant model requested a route not offered by the client — ignoring',
        );
        serverResult = { route: null, path: null };
        message = ROUTE_DECLINED_MESSAGE;
      }
      break;
    }

    case 'answer_faq_policy': {
      const selectedIds = new Set(Array.isArray(args.selectedSnippetIds) ? args.selectedSnippetIds : []);
      // The model is never trusted with quote text — only with picking which
      // of the server-retrieved candidates (if any) apply. Zero candidates,
      // or a selection outside them, always degrades to the fixed fallback;
      // the model cannot override this (see the design doc's no-match rule).
      const chosen = candidateSnippets.filter((s) => selectedIds.has(s.id));
      if (candidateSnippets.length === 0 || chosen.length === 0) {
        serverResult = {
          answered: false,
          fallbackMessage: FALLBACK_POLICY_MESSAGE,
        };
        // The visitor-facing text for this turn is the server's fallback —
        // never whatever policy-ish lead-in the model tried to author.
        message = FALLBACK_POLICY_MESSAGE;
      } else {
        serverResult = {
          answered: true,
          snippets: chosen.map((s) => ({ docId: s.docId, title: s.title, quote: s.quote })),
        };
        if (!message) message = "Here's what I found:";
      }
      break;
    }

    case 'respond_conversationally': {
      serverResult = { mode: 'social', source: 'resolver' };
      message = SOCIAL_MESSAGES[args.socialSubtype];
      break;
    }

    case 'redirect_off_topic': {
      serverResult = { redirected: true, source: 'resolver' };
      message = OFF_TOPIC_MESSAGE;
      break;
    }

    default:
      throw new AppError('AI returned an unrecognized tool', 502);
  }

  // Never let an empty or oversized message reach the client. Either violates
  // the resent turn schema on the next request and would brick the session
  // until reload.
  if (!message) message = NO_MESSAGE_FALLBACK;
  else if (message.length > MAX_MESSAGE_LENGTH) message = message.slice(0, MAX_MESSAGE_LENGTH);
  // Envelope: { success: true, data } matches every sibling AI endpoint
  // (wizard.controller.js's wizardTurn) and the client's parseEnvelope
  // (Client/src/services/http/envelope.ts requires success===true/status
  // ==='success' before it unwraps `data`) — a bare body here would make
  // every turn fail client-side with "did not succeed" (found in /ship
  // review, api-contract specialist).
  res.json({ success: true, data: { toolCall: { tool, args }, serverResult, message } });
});
