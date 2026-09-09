import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';
import { generateStructured, isAIConfigured } from '../ai/geminiClient.js';
import { BriefingClaimSchema } from '@travel-crm/contracts';
import { getAdapter } from '../adapters/registry.js';
import { forwardActorHeaders } from '../middleware/auth.js';
import {
  buildManagementBriefingPrompt,
  canonicalizeBriefingResponse,
  managementBriefingResponseJsonSchema,
} from '../ai/prompts/managementBriefing.v1.js';
import { runAgentLoop } from '../ai/agentRunner.js';
import { validateClaims, buildSources, insightsToClaims } from '../ai/groundingValidator.js';

// One model attempt inside a 17s server deadline; the client holds a 20s
// endpoint timeout with retry disabled (see design §7).
const MANAGEMENT_GENERATION_DEADLINE_MS = 17_000;

function sinceToDate(since, lastSeenAt) {
  const now = Date.now();
  switch (since) {
    case 'today':
      return new Date(now - 86_400_000);
    case '7_days':
      return new Date(now - 7 * 86_400_000);
    case 'last_visit': {
      // Authoritative server-side lastSeenAt; on a genuine first visit (no
      // record) this degrades to 7_days (see §9).
      if (lastSeenAt && !Number.isNaN(new Date(lastSeenAt).getTime())) return new Date(lastSeenAt);
      return new Date(now - 7 * 86_400_000);
    }
    default:
      return new Date(now - 7 * 86_400_000);
  }
}

function isNoAccess(bundle) {
  return bundle.notAuthorizedSources.length > 0 && bundle.evidence.length === 0;
}

export const managementCopilotTurn = asyncHandler(async (req, res) => {
  const { mode, page } = req.body;
  const adapter = getAdapter(page.key);
  const scope = adapter.parseScope(page.scope);
  const ctx = { user: req.user, headers: forwardActorHeaders(req) };

  const bundle = await adapter.loadEvidence(ctx, scope);
  const noAccess = isNoAccess(bundle);

  // mode='deterministic': no Gemini — stamp + deterministic insights only.
  if (mode === 'deterministic') {
    return res.json({
      context: { pageKey: page.key, scopeLabel: bundle.context.scopeLabel, asOf: bundle.context.asOf, noAccess },
      insights: adapter.computeInsights(bundle, sinceToDate(page.since, page.lastSeenAt)),
      unavailableSources: bundle.unavailableSources,
      notAuthorizedSources: bundle.notAuthorizedSources,
    });
  }

  // No access: short-circuit before the model path — no claims over a record
  // the caller cannot access.
  if (noAccess) {
    return res.json({
      context: { pageKey: page.key, scopeLabel: bundle.context.scopeLabel, generatedAt: new Date().toISOString(), partial: false, noAccess: true },
      claims: [],
      suggestedQuestions: [],
      sources: [],
      unavailableSources: bundle.unavailableSources,
      notAuthorizedSources: bundle.notAuthorizedSources,
    });
  }

  // Provider unavailable → deterministic fallback (same single claims contract).
  if (!isAIConfigured()) {
    return respondWithFallback(res, page, bundle, adapter);
  }

  // mode='ask': bounded tool loop. The model may gather data via domain tools
  // before answering; the final answer is grounded against the same bundle.
  if (mode === 'ask') {
    return handleAsk(res, req, page, bundle, adapter, ctx);
  }

  const guidanceEnabled = process.env.MANAGEMENT_COPILOT_GUIDANCE_ENABLED === 'true';
  const prompt = buildManagementBriefingPrompt({
    bundle,
    scopeLabel: bundle.context.scopeLabel,
    since: page.since,
    guidanceEnabled,
  });

  let raw;
  try {
    raw = await generateStructured({
      prompt,
      schema: managementBriefingResponseJsonSchema,
      temperature: 0.2,
      maxOutputTokens: 8192,
      timeoutMs: MANAGEMENT_GENERATION_DEADLINE_MS,
      maxAttempts: 1,
    });
  } catch (err) {
    logger.warn({ err: err.message, pageKey: page.key }, 'management briefing generation failed — falling back to deterministic insights');
    return respondWithFallback(res, page, bundle, adapter);
  }

  const canonical = canonicalizeBriefingResponse(raw, BriefingClaimSchema);
  const { claims } = validateClaims({ claims: canonical, bundle, enableGuidance: guidanceEnabled });

  if (claims.length === 0) {
    return respondWithFallback(res, page, bundle, adapter);
  }

  const result = {
    context: {
      pageKey: page.key,
      scopeLabel: bundle.context.scopeLabel,
      generatedAt: new Date().toISOString(),
      partial: bundle.unavailableSources.length > 0,
      noAccess: false,
    },
    claims,
    suggestedQuestions: adapter.defaultQuestions(bundle),
    sources: buildSources(claims, bundle),
    unavailableSources: bundle.unavailableSources,
    notAuthorizedSources: bundle.notAuthorizedSources,
  };
  return res.json(result);
});

function respondWithFallback(res, page, bundle, adapter) {
  const claims = insightsToClaims(adapter.computeInsights(bundle, sinceToDate(page.since, page.lastSeenAt)));
  return res.json({
    context: {
      pageKey: page.key,
      scopeLabel: bundle.context.scopeLabel,
      generatedAt: new Date().toISOString(),
      partial: true,
      noAccess: false,
    },
    claims,
    suggestedQuestions: adapter.defaultQuestions(bundle),
    sources: buildSources(claims, bundle),
    unavailableSources: bundle.unavailableSources,
    notAuthorizedSources: bundle.notAuthorizedSources,
  });
}

// mode='ask': bounded tool loop → grounded answer blocks. Tool-gathered data
// is appended to the bundle as turn-local evidence so answer claims cite it
// correctly; if the loop yields nothing, fall back to deterministic insights.
async function handleAsk(res, req, page, bundle, adapter, ctx) {
  const question = latestUserQuestion(req.body.messages);
  const { claims: rawClaims, toolEvidence } = await runAgentLoop({
    ctx,
    scopeLabel: bundle.context.scopeLabel,
    question,
    evidence: bundle.evidence,
    generateStructured,
  });

  if (!rawClaims || rawClaims.length === 0) {
    return respondWithFallback(res, page, bundle, adapter);
  }

  const validationBundle = { ...bundle, evidence: [...bundle.evidence, ...toolEvidence] };
  const guidanceEnabled = process.env.MANAGEMENT_COPILOT_GUIDANCE_ENABLED === 'true';
  const canonical = canonicalizeBriefingResponse({ claims: rawClaims }, BriefingClaimSchema);
  const { claims } = validateClaims({ claims: canonical, bundle: validationBundle, enableGuidance: guidanceEnabled });

  if (claims.length === 0) {
    return respondWithFallback(res, page, bundle, adapter);
  }

  return res.json({
    context: {
      pageKey: page.key,
      scopeLabel: bundle.context.scopeLabel,
      generatedAt: new Date().toISOString(),
      partial: bundle.unavailableSources.length > 0,
      noAccess: false,
    },
    claims: [],
    answerBlocks: claims,
    suggestedQuestions: adapter.defaultQuestions(bundle),
    sources: buildSources(claims, validationBundle),
    unavailableSources: bundle.unavailableSources,
    notAuthorizedSources: bundle.notAuthorizedSources,
  });
}

function latestUserQuestion(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  const last = [...messages].reverse().find((m) => m.role === 'user');
  return last?.content ?? '';
}
