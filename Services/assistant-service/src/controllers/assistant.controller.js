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
import { recordAssistantResolution } from '../telemetry/assistantEvents.js';
import { classifyAssistantIntent, confidenceBucket } from '../ai/assistantRouter.js';

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
const SENSITIVE_MESSAGE =
  'I can’t provide guidance on visas, entry requirements, health, safety, legal, emergency, or financial matters. Please check the relevant official authority or contact the LushWare team.';

function conversationalOutcomesEnabled() {
  return process.env.ASSISTANT_CONVERSATIONAL_OUTCOMES_ENABLED === 'true';
}

function latestUserTurn(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i];
  }
  return null;
}


function resolutionFailureCategory(err) {
  if (err?.aiFailureCategory) return err.aiFailureCategory;
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  if (message.includes('deadline')) return 'server_deadline';
  if (message.includes('timeout') || err?.name === 'AbortError') return 'timeout';
  if (message.includes('schema') || message.includes('tool contract') || err?.name === 'ZodError') return 'schema';
  return 'provider';
}

function safeGeneratedMessage(message) {
  if (typeof message !== 'string') return '';
  const withoutHtml = message.replace(/<[^>]*>/g, '').trim();
  if (/(?:https?:\/\/|www\.|javascript:)/i.test(withoutHtml)) return '';
  return withoutHtml;
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
  const latestTurn = latestUserTurn(messages);
  const turnId = latestTurn?.id;
  let routerResult = null;
  let routerFailureCategory = null;

  try {
    const routerBudgetMs = ASSISTANT_TURN_DEADLINE_MS - (Date.now() - startedAt);
    if (routerBudgetMs <= 0) throw new AppError('Assistant request deadline exhausted', BAD_GATEWAY);

    if (outcomesEnabled) {
      try {
        routerResult = await classifyAssistantIntent(latestTurn?.content ?? '', routerBudgetMs);
      } catch (err) {
        routerFailureCategory = resolutionFailureCategory(err);
      }
    }

    if (outcomesEnabled && routerResult?.decision.committed) {
      const { classification } = routerResult;
      const isSocial = classification.intent === 'social';
      const tool = isSocial ? 'respond_conversationally' : 'redirect_off_topic';
      const args = isSocial
        ? { mode: 'social', socialSubtype: classification.socialSubtype === 'none' ? 'repair' : classification.socialSubtype }
        : {};
      const serverResult = isSocial
        ? { mode: 'social', source: 'router' }
        : { redirected: true, source: 'router' };
      const message = isSocial ? SOCIAL_MESSAGES[args.socialSubtype] : OFF_TOPIC_MESSAGE;

      if (turnId) {
        await recordAssistantResolution({
          sessionId,
          turnId,
          tool,
          route: null,
          metadata: {
            routerVersion: routerResult.version,
            routerModel: routerResult.model,
            predictedIntent: classification.intent,
            socialSubtype: classification.socialSubtype,
            confidenceBucket: confidenceBucket(classification.confidence),
            committed: true,
            abstainReason: routerResult.decision.reason,
            stageOneLatencyMs: Math.min(routerResult.latencyMs, ASSISTANT_TURN_DEADLINE_MS),
            fallbackUsed: false,
          },
        });
      }
      res.json({ success: true, data: { toolCall: { tool, args }, serverResult, message } });
      return;
    }

    const documents = await fetchPolicyDocuments();
    const candidateSnippets = retrieveSnippets(documents, latestTurn?.content ?? '');
    const remainingBudgetMs = ASSISTANT_TURN_DEADLINE_MS - (Date.now() - startedAt);
    if (remainingBudgetMs <= 0) throw new AppError('Assistant request deadline exhausted', BAD_GATEWAY);

    const routerIntent = routerResult?.classification.intent ?? null;
    const prompt = buildAssistantTurnPrompt({
      messages,
      availableRoutes,
      candidateSnippets,
      conversationalOutcomesEnabled: outcomesEnabled,
      routerHint: routerIntent,
    });
    const stageTwoStartedAt = Date.now();
    const raw = await generateStructured({
      prompt,
      schema: assistantTurnResponseJsonSchema,
      maxOutputTokens: 1024,
      timeoutMs: Math.min(ASSISTANT_RESOLVER_TIMEOUT_MS, remainingBudgetMs),
      maxAttempts: 1,
    });

    const canonical = canonicalizeAssistantTurnResponse(raw, {
      conversationalOutcomesEnabled: outcomesEnabled,
      routerIntent,
    });
    const parsed = assistantTurnResponseSchema.safeParse(canonical);
    if (!parsed.success) throw new AppError('AI response did not match the tool contract', BAD_GATEWAY);

    let { tool, args } = parsed.data;
    if (routerIntent === 'sensitive') {
      tool = 'answer_faq_policy';
      args = { question: '', selectedSnippetIds: [], message: '' };
    }

    let serverResult = null;
    let message = 'message' in args ? args.message : '';
    switch (tool) {
      case 'navigate': {
        const routeName = typeof args.route === 'string' ? args.route : '';
        const offered = (availableRoutes || []).find((route) => route.name === routeName);
        if (offered) {
          serverResult = { route: offered.name, path: offered.path };
          if (!message) message = 'Sure — heading there now.';
        } else {
          logger.warn({ sessionId, requestedRoute: routeName }, 'assistant model requested a route not offered by the client — ignoring');
          serverResult = { route: null, path: null };
          message = ROUTE_DECLINED_MESSAGE;
        }
        break;
      }
      case 'answer_faq_policy': {
        const selectedIds = new Set(Array.isArray(args.selectedSnippetIds) ? args.selectedSnippetIds : []);
        const chosen = candidateSnippets.filter((snippet) => selectedIds.has(snippet.id));
        if (routerIntent === 'sensitive') {
          serverResult = { answered: false, fallbackMessage: SENSITIVE_MESSAGE };
          message = SENSITIVE_MESSAGE;
        } else if (candidateSnippets.length === 0 || chosen.length === 0) {
          serverResult = { answered: false, fallbackMessage: FALLBACK_POLICY_MESSAGE };
          message = FALLBACK_POLICY_MESSAGE;
        } else {
          serverResult = {
            answered: true,
            snippets: chosen.map((snippet) => ({ docId: snippet.docId, title: snippet.title, quote: snippet.quote })),
          };
          if (!message) message = "Here's what I found:";
        }
        break;
      }
      case 'respond_conversationally':
        if (args.mode === 'travel_general' && routerIntent === 'travel_general') {
          serverResult = { mode: 'travel_general', source: 'resolver' };
          message = safeGeneratedMessage(args.message);
        } else {
          serverResult = { mode: 'social', source: 'resolver' };
          message = SOCIAL_MESSAGES[args.socialSubtype];
        }
        break;
      case 'redirect_off_topic':
        serverResult = { redirected: true, source: 'resolver' };
        message = OFF_TOPIC_MESSAGE;
        break;
      default:
        throw new AppError('AI returned an unrecognized tool', BAD_GATEWAY);
    }

    if (!message) message = NO_MESSAGE_FALLBACK;
    else if (message.length > MAX_MESSAGE_LENGTH) message = message.slice(0, MAX_MESSAGE_LENGTH);

    if (turnId) {
      const classification = routerResult?.classification;
      await recordAssistantResolution({
        sessionId,
        turnId,
        tool,
        route: tool === 'navigate' && typeof serverResult?.route === 'string' ? serverResult.route : null,
        metadata: {
          ...(routerResult && {
            routerVersion: routerResult.version,
            routerModel: routerResult.model,
            predictedIntent: classification.intent,
            socialSubtype: classification.socialSubtype,
            confidenceBucket: confidenceBucket(classification.confidence),
            committed: false,
            abstainReason: routerResult.decision.reason,
            stageOneLatencyMs: Math.min(routerResult.latencyMs, ASSISTANT_TURN_DEADLINE_MS),
          }),
          finalStageTwoTool: tool,
          stageTwoLatencyMs: Math.min(Date.now() - stageTwoStartedAt, ASSISTANT_TURN_DEADLINE_MS),
          fallbackUsed:
            routerIntent === 'sensitive' ||
            (tool === 'navigate' && serverResult?.route === null) ||
            (tool === 'answer_faq_policy' && serverResult?.answered === false),
          ...(routerFailureCategory && { failureCategory: routerFailureCategory }),
        },
      });
    }
    res.json({ success: true, data: { toolCall: { tool, args }, serverResult, message } });
  } catch (err) {
    if (turnId) {
      await recordAssistantResolution({
        sessionId,
        turnId,
        tool: null,
        route: null,
        metadata: {
          ...(routerResult && {
            routerVersion: routerResult.version,
            routerModel: routerResult.model,
            predictedIntent: routerResult.classification.intent,
            socialSubtype: routerResult.classification.socialSubtype,
            confidenceBucket: confidenceBucket(routerResult.classification.confidence),
            committed: false,
            abstainReason: routerResult.decision.reason,
            stageOneLatencyMs: Math.min(routerResult.latencyMs, ASSISTANT_TURN_DEADLINE_MS),
          }),
          stageTwoLatencyMs: Math.min(Date.now() - startedAt, ASSISTANT_TURN_DEADLINE_MS),
          fallbackUsed: false,
          failureCategory: resolutionFailureCategory(err),
        },
      });
    }
    throw err;
  }
});
