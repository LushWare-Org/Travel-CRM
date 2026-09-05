import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';
import { generateStructured } from '../ai/geminiClient.js';
import {
  buildAssistantTurnPrompt,
  assistantTurnResponseSchema,
  assistantTurnResponseJsonSchema,
} from '../ai/prompts/assistantTurn.v1.js';
import { fetchPolicyDocuments, retrieveSnippets, FALLBACK_POLICY_MESSAGE } from '@travel-crm/policy-retrieval';
import { BAD_GATEWAY } from '../constants/httpStatus.js';

// Both guard against the same failure mode (found in /ship's red-team
// review, confidence verified): the model's structured-output schema puts
// no `required` list inside `args`, so `args.message` can legally be
// missing even though the prompt asks for one. An empty `message` would
// get stored as an assistant chat bubble client-side — and because both
// wire schemas require `content.min(1)`, that empty message then fails
// validation on every LATER turn's resent sliding window, permanently
// bricking the session until a page reload. `message` must never be ''.
const ROUTE_DECLINED_MESSAGE =
  "I can't take you there directly — try asking for a specific page, like packages or destinations.";
const NO_MESSAGE_FALLBACK = "Sorry, I didn't quite catch that — could you rephrase?";
// Matches content.max(2000) on both wire schemas (assistant.schema.js,
// assistantTurn.ts) — the model's args are an open z.record with no length
// cap, and Gemini's 1024-1536 token budget makes a >2000-char reply
// reachable, so this is enforced server-side as the single source of truth.
const MAX_MESSAGE_LENGTH = 2000;

function latestUserMessage(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

// ── Public: stateless site-wide assistant turn ──
// Implements docs/designs/site-wide-floating-assistant.md's Phase 1 tool
// contract: the model picks exactly one tool from a fixed two-tool
// vocabulary per turn; this handler executes the deterministic server-side
// work that tool implies. Navigation is client-side ONLY — the server
// validates the model's chosen route is one the client actually offered in
// this request and resolves its path from THAT list, never from a
// server-held route table or from model-authored text. Policy answers never
// trust model-authored quote text — the model only picks among the
// server-retrieved candidate snippets, and an empty result always degrades
// to the shared FALLBACK_POLICY_MESSAGE.
export const assistantTurn = asyncHandler(async (req, res) => {
  const { sessionId, messages, availableRoutes } = req.body;

  // Policy retrieval is deterministic and cheap (no LLM cost) — always run
  // it against the latest message so a single generateStructured call can
  // both pick the tool AND, if it's answer_faq_policy, choose among
  // already-retrieved candidates in the same turn (see assistantTurn.v1.js).
  const documents = await fetchPolicyDocuments();
  const candidateSnippets = retrieveSnippets(documents, latestUserMessage(messages));

  const prompt = buildAssistantTurnPrompt({ messages, availableRoutes, candidateSnippets });
  const raw = await generateStructured({
    prompt,
    schema: assistantTurnResponseJsonSchema,
    maxOutputTokens: 1024,
  });

  // Zod contract check on the model's raw output (tool vocabulary + args
  // shape) before anything is dispatched — the Gemini JSON schema constrains
  // generation, this is the enforcement boundary.
  const parsed = assistantTurnResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError('AI response did not match the tool contract', BAD_GATEWAY);
  }
  const { tool, args = {} } = parsed.data;

  let serverResult = null;
  let message = args.message || '';

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

    default:
      throw new AppError('AI returned an unrecognized tool', 502);
  }

  // Never let an empty OR oversized message reach the client: an empty one
  // fails content.min(1) on resend (ROUTE_DECLINED_MESSAGE/NO_MESSAGE_FALLBACK
  // above cover the branches that can legitimately omit one); an oversized
  // one — args is an open z.record with no length cap, and Gemini's 1024-1536
  // token budget makes >2000 chars reachable — fails content.max(2000) on
  // resend just the same. Either failure permanently bricks the session
  // (found in /ship's red-team + Claude adversarial review).
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
