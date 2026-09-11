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
import { MANAGEMENT_GENERATION_DEADLINE_MS } from '../constants/managementCopilot.js';
import prisma from '../db/client.js';

// The briefing generation runs inside one 17s server deadline. The Management
// client holds a 20s endpoint timeout WITH AbortSignal support: a scope change
// aborts the in-flight request, and a timeout surfaces as a recoverable failure
// with Retry rather than an endless loading state (see design §1). The deadline
// is defined once in constants/managementCopilot.js and shared with the agent
// loop, so the loop budget and this phase cannot drift.
//
// The phase is allowed a SECOND attempt, but strictly inside that same 17s
// budget (`deadlineMs`), so worst-case latency does not grow: a transient 503
// that comes back fast still leaves room and is retried, while an attempt slow
// enough to leave less than a meaningful retry is not retried at all and falls
// back as before. That is the difference between a hard `maxAttempts: 1` —
// which threw away every fast 503 — and a retry that can never outlive the old
// single attempt's ceiling.

// Server-side feature gates. MANAGEMENT_COPILOT_ENABLED defaults off; when on,
// MANAGEMENT_COPILOT_PAGE_KEYS (comma-separated) allowlists specific pages for
// independent rollback. A disabled feature returns 404 so it does not reveal
// its existence to unprivileged callers.
function copilotEnabled() {
  return process.env.MANAGEMENT_COPILOT_ENABLED === 'true';
}

function pageKeyAllowed(key) {
  const allowlist = (process.env.MANAGEMENT_COPILOT_PAGE_KEYS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Fail closed. An unset or empty allowlist serves nothing: the previous
  // allow-all default meant registering a new page adapter enabled it in every
  // environment at once, which made per-page rollback a no-op exactly when it
  // was needed. Enabling a page key is now an explicit act, and every
  // environment with MANAGEMENT_COPILOT_ENABLED=true must name the keys it
  // serves (including 'leads', which was implicitly on before this change).
  return allowlist.includes(key);
}

function copilotNotFound(res) {
  return res.status(404).json({ success: false, message: 'Not found' });
}

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
  const attempted = bundle.attemptedSources ?? [];
  const denied = bundle.notAuthorizedSources ?? [];
  // No access means every source we actually tried was refused. The
  // `attempted.length > 0` guard matters: with zero attempts `[].every(...)` is
  // vacuously true, which would render "you do not have access" on a page whose
  // sources were merely skipped by a `when(ctx)` predicate — a false denial on
  // a quiet page. Adapters that predate `attemptedSources` (the leads record
  // path) fall back to the previous rule.
  if (attempted.length === 0) {
    return denied.length > 0 && bundle.evidence.length === 0;
  }
  return denied.length === attempted.length && bundle.evidence.length === 0;
}

function scopeFingerprint(scope) {
  return JSON.stringify(scope ?? {});
}

// Server-authoritative last-seen read (for since=last_visit). A miss degrades
// to the client hint — a FIRST-VISIT-ONLY fallback, since no stored row means
// the actor has never acknowledged this scope — then to 7_days. Best-effort:
// a storage problem never fails a briefing. The turn route never writes.
async function readLastSeen(actorId, pageKey, fingerprint) {
  try {
    const row = await prisma.managementLastSeen.findUnique({
      where: { actorId_pageKey_scopeFingerprint: { actorId, pageKey, scopeFingerprint: fingerprint } },
    });
    return row?.lastSeenAt ? row.lastSeenAt.toISOString() : null;
  } catch {
    return null;
  }
}

export const managementCopilotTurn = asyncHandler(async (req, res) => {
  const { mode, page } = req.body;
  if (!copilotEnabled() || !pageKeyAllowed(page.key)) {
    return copilotNotFound(res);
  }
  const adapter = getAdapter(page.key);
  const scope = adapter.parseScope(page.scope);
  const ctx = { user: req.user, headers: forwardActorHeaders(req) };

  // The phase is passed through so the engine can apply the right per-source
  // budget: the deterministic phase exists to be instant and gets a short leash,
  // the briefing phase can wait longer for completeness. Adapters that ignore
  // the third argument are unaffected.
  const bundle = await adapter.loadEvidence(ctx, scope, { mode });
  const noAccess = isNoAccess(bundle);

  // Server-authoritative last_visit window: prefer the stored value over the
  // client hint. Resolved ONCE per request and threaded through every path
  // (deterministic insights, fallback claims, model prompt) so both phases of
  // one request observe the same prior boundary.
  const scopeFp = scopeFingerprint(scope);
  if (page.since === 'last_visit') {
    const serverLastSeen = await readLastSeen(req.user.id, page.key, scopeFp);
    if (serverLastSeen) page.lastSeenAt = serverLastSeen;
  }
  const sinceBoundary = sinceToDate(page.since, page.lastSeenAt);

  // mode='deterministic': no Gemini — stamp + deterministic insights only.
  if (mode === 'deterministic') {
    const insights = adapter.computeInsights(bundle, sinceBoundary);
    return res.json({
      context: { pageKey: page.key, scopeLabel: bundle.context.scopeLabel, asOf: bundle.context.asOf, noAccess },
      insights,
      // Same payload the briefing path already builds. Without it the cold-open
      // evidence action has no `sources` entry to render from and falls back to
      // "not captured" — the phase the trust claim actually rests on — and the
      // client has no per-source count to distinguish an empty page from a
      // quiet one.
      sources: [
        ...buildSources(insightsToClaims(insights), bundle),
        // Per-source baselines are not cited by any claim — there is nothing to
        // reveal — so `buildSources` omits them. They still belong in the
        // response: they are server-computed counts of how much was actually
        // examined, which is what lets the client distinguish a quiet page from
        // an empty one instead of asserting a zero it never measured.
        ...bundle.evidence
          .filter((item) => item.recordRef?.kind === 'source')
          .map((item) => ({
            id: item.id,
            label: item.label,
            type: item.type,
            capturedValue: item.value,
          })),
      ],
      unavailableSources: bundle.unavailableSources,
      notAuthorizedSources: bundle.notAuthorizedSources,
    });
  }

  // No access: short-circuit before the model path — no claims over a record
  // the caller cannot access. An ask stays answer-shaped even here: the ask
  // client reads `answerBlocks`, so a briefing-shaped body is dropped on the
  // floor.
  if (noAccess) {
    if (mode === 'ask') {
      return respondWithAnswer(res, page, bundle, adapter, { answerBlocks: [], noAccess: true });
    }
    return res.json({
      context: { pageKey: page.key, scopeLabel: bundle.context.scopeLabel, generatedAt: new Date().toISOString(), partial: false, noAccess: true },
      claims: [],
      suggestedQuestions: [],
      sources: [],
      unavailableSources: bundle.unavailableSources,
      notAuthorizedSources: bundle.notAuthorizedSources,
    });
  }

  // mode='ask': bounded tool loop, evaluated BEFORE the provider gate below on
  // purpose. This branch is answer-shaped (`answerBlocks`) while the gate's
  // fallback is briefing-shaped (`claims`), and an ask must never be answered
  // with a briefing. With no provider configured the loop's generation fails
  // and this returns the empty answer payload — the client's honest
  // not-grounded state — instead of a claims body the ask client silently
  // drops.
  if (mode === 'ask') {
    return handleAsk(res, req, page, bundle, adapter, ctx, scope);
  }

  // Provider unavailable → deterministic fallback (same single claims contract).
  if (!isAIConfigured()) {
    return respondWithFallback(res, page, bundle, adapter, sinceBoundary);
  }

  const guidanceEnabled = process.env.MANAGEMENT_COPILOT_GUIDANCE_ENABLED === 'true';
  const prompt = buildManagementBriefingPrompt({
    bundle,
    scopeLabel: bundle.context.scopeLabel,
    sinceBoundary: sinceBoundary.toISOString(),
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
      maxAttempts: 2,
      deadlineMs: MANAGEMENT_GENERATION_DEADLINE_MS,
    });
  } catch (err) {
    logger.warn({ err: err.message, pageKey: page.key }, 'management briefing generation failed — falling back to deterministic insights');
    return respondWithFallback(res, page, bundle, adapter, sinceBoundary);
  }

  const canonical = canonicalizeBriefingResponse(raw, BriefingClaimSchema);
  const { claims } = validateClaims({ claims: canonical, bundle, enableGuidance: guidanceEnabled });

  if (claims.length === 0) {
    return respondWithFallback(res, page, bundle, adapter, sinceBoundary);
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

// POST /api/v1/assistant/management/seen — the authenticated acknowledgement
// that a grounded briefing was actually presented in an open dock. It applies
// the same feature gates as the turn route (a disabled copilot or an
// unallowlisted page key stays an undisclosed 404), parses the scope with the
// page adapter, and upserts the operator/page/scope lastSeenAt from SERVER
// time. It loads no evidence, never calls the model, and accepts no
// client-authored timestamp. Repeated acknowledgements are idempotent and only
// move the timestamp forward. The upsert is awaited on purpose: the design's
// failure mode requires a rejected write to surface as a 5xx rather than being
// swallowed, while the turn route's last-seen READ stays best-effort.
export const managementCopilotSeen = asyncHandler(async (req, res) => {
  const { page } = req.body;
  if (!copilotEnabled() || !pageKeyAllowed(page.key)) {
    return copilotNotFound(res);
  }
  const adapter = getAdapter(page.key);
  const scope = adapter.parseScope(page.scope);
  const scopeFingerprintValue = scopeFingerprint(scope);

  const lastSeenAt = new Date();
  await prisma.managementLastSeen.upsert({
    where: {
      actorId_pageKey_scopeFingerprint: {
        actorId: req.user.id,
        pageKey: page.key,
        scopeFingerprint: scopeFingerprintValue,
      },
    },
    update: { lastSeenAt },
    create: { actorId: req.user.id, pageKey: page.key, scopeFingerprint: scopeFingerprintValue, lastSeenAt },
  });

  return res.json({ success: true });
});

function respondWithFallback(res, page, bundle, adapter, sinceBoundary) {
  const claims = insightsToClaims(adapter.computeInsights(bundle, sinceBoundary));
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

// mode='ask': bounded tool loop → grounded answer blocks, resolved against the
// PAGE- AND SCOPE-declared vocabulary (`adapter.askTools(scope)`), never a
// global tool list. Tool-gathered data is appended to the bundle as turn-local
// evidence so answer claims cite it correctly. Every outcome here is
// answer-shaped: an exhausted loop, a rejected claim set, zero declared tools
// (the single-shot path inside the runner) and an unconfigured provider all
// return `answerBlocks` — possibly empty — and never the briefing's `claims`.
async function handleAsk(res, req, page, bundle, adapter, ctx, scope) {
  const question = latestUserQuestion(req.body.messages);
  const { answerBlocks: rawBlocks, toolEvidence } = await runAgentLoop({
    ctx,
    scopeLabel: bundle.context.scopeLabel,
    question,
    evidence: bundle.evidence,
    tools: adapter.askTools(scope),
    generateStructured,
  });

  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return respondWithAnswer(res, page, bundle, adapter, { answerBlocks: [], toolEvidence });
  }

  const validationBundle = { ...bundle, evidence: [...bundle.evidence, ...toolEvidence] };
  const guidanceEnabled = process.env.MANAGEMENT_COPILOT_GUIDANCE_ENABLED === 'true';
  const canonical = canonicalizeBriefingResponse({ claims: rawBlocks }, BriefingClaimSchema);
  const { claims } = validateClaims({ claims: canonical, bundle: validationBundle, enableGuidance: guidanceEnabled });

  return respondWithAnswer(res, page, bundle, adapter, { answerBlocks: claims, toolEvidence });
}

// The ask response contract. `claims` stays empty — the wire contract requires
// the field, but a briefing-shaped claims payload must never reach an answer
// slot — while the per-source and failure lists are identical to the
// briefing's. Tool evidence is validated and cited the same way bundle evidence
// is, so a claim citing `tool:<name>:<n>` grounds through the same validator.
function respondWithAnswer(res, page, bundle, adapter, { answerBlocks, toolEvidence = [], noAccess = false }) {
  const validationBundle = toolEvidence.length
    ? { ...bundle, evidence: [...bundle.evidence, ...toolEvidence] }
    : bundle;
  return res.json({
    context: {
      pageKey: page.key,
      scopeLabel: bundle.context.scopeLabel,
      generatedAt: new Date().toISOString(),
      partial: bundle.unavailableSources.length > 0,
      noAccess,
    },
    claims: [],
    answerBlocks,
    suggestedQuestions: adapter.defaultQuestions(bundle),
    sources: buildSources(answerBlocks, validationBundle),
    unavailableSources: bundle.unavailableSources,
    notAuthorizedSources: bundle.notAuthorizedSources,
  });
}

function latestUserQuestion(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  const last = [...messages].reverse().find((m) => m.role === 'user');
  return last?.content ?? '';
}
