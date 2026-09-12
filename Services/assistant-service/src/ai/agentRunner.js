import {
  buildManagementAnswerPrompt,
  buildManagementFinalAnswerPrompt,
  managementAnswerResponseJsonSchema,
  managementSingleShotResponseJsonSchema,
} from './prompts/managementAnswer.v2.js';
import { executeTool, resolveTools } from '../tools/toolRegistry.js';
import { MANAGEMENT_GENERATION_DEADLINE_MS } from '../constants/managementCopilot.js';
import logger from '../config/logger.js';

// Three rounds, not four. Each round is one generation plus one tool read, and at
// the observed ~3s per generation a fourth round consumed the entire budget — see
// ANSWER_RESERVE_MS below.
const MAX_TOOL_CALLS = 3;

// The answer gets its own guaranteed slice of the one budget.
//
// Without a reserve the loop spent all 17s on gather-and-regenerate rounds and the
// forced final answer never ran: the operator still got nothing, now with a
// limitation notice attached instead of silence. Measured live — every ask on
// overview, billing and leads ended this way, including questions the tools can
// answer. Reserving time is what turns "the loop ran out" into an answer.
const ANSWER_RESERVE_MS = 6_000;

// ONE overall budget for the whole ask, not one per call. It is the server's
// existing generation deadline (MANAGEMENT_GENERATION_DEADLINE_MS) and it sits
// inside the Management client's 20s abort. The loop used to pass this same
// 17s deadline to every iteration, so a four-step ask could bill 68s of
// generation while the client had already given up at 20s — the two list tools
// make a multi-step ask reachable, which is what turned that arithmetic into a
// real failure.
// The budget bounds generation AND tool I/O: each tool read is given what
// remains of it as an AbortSignal, so a stalled lead or billing read cannot run
// unbounded past the deadline. The evidence-bundle load that happens BEFORE the
// loop is outside this budget (see managementCopilot.controller.js).

// A call with less than this left cannot produce a usable answer, so the loop
// stops instead of spending the remainder on a call that is certain to be
// aborted. It is also what keeps every derived timeout strictly positive.
const MIN_CALL_TIMEOUT_MS = 1_000;

// Bounded agent loop for ask mode. The model may call up to four of the RESOLVED
// domain tools to gather data, then must emit final_answer. Every tool executes
// server-side under the caller's identity and the model only ever sees
// bounded, projected results. The vocabulary is passed in by the caller (the
// actor's role-derived catalogue); the loop never invents its own.
//
// Returns { answerBlocks, toolEvidence, reason }.
//
// `reason` exists because an empty answer has several causes and they must not be
// described the same way to an operator: a page that cannot answer is a fact about
// the page, while a provider that failed is a temporary fault with a retry. The
// loop is the only place that can tell them apart, so it reports which happened
// rather than leaving the caller to guess from an empty array.
//
//   'answered'          claims were produced
//   'no-final-answer'   the model concluded without stating anything
//   'generation-failed' the provider errored or timed out
//   'budget-exhausted'  the budget ran out before an answer could be produced
//
// `answerBlocks` are the model's final claims — never null, and never a
// briefing-shaped `claims` payload. `toolEvidence` are turn-local evidence items
// so answer claims citing tool-gathered data ground correctly.
export async function runAgentLoop({ ctx, scopeLabel, question, evidence, tools = [], generateStructured }) {
  const toolDescriptions = resolveTools(tools);
  const history = [];

  // A page that declares no tools runs single-shot: one structured call, a
  // `final_answer`-only schema with no `tool` field, and no tool block in the
  // prompt. See managementAnswer.v1.js for why the loop prompt cannot be reused.
  if (toolDescriptions.length === 0) {
    let raw;
    try {
      raw = await generateStructured({
        prompt: buildManagementAnswerPrompt({ scopeLabel, question, evidence, toolDescriptions: [], history: [] }),
        schema: managementSingleShotResponseJsonSchema,
        temperature: 0.2,
        maxOutputTokens: 8192,
        timeoutMs: MANAGEMENT_GENERATION_DEADLINE_MS,
        maxAttempts: 1,
      });
    } catch (err) {
      logger.warn({ err }, 'single-shot generation failed');
      return { answerBlocks: [], toolEvidence: [], reason: 'generation-failed' };
    }
    if (!Array.isArray(raw?.claims)) {
      // An unusable answer and a refusal look the same to the caller. This is the
      // only place that can tell them apart.
      logger.warn(
        { shape: Object.keys(raw ?? {}).join(','), raw: JSON.stringify(raw ?? null).slice(0, 500) },
        'single-shot generation returned no claims array',
      );
    }
    if (!Array.isArray(raw?.claims) || raw.claims.length === 0) {
      return { answerBlocks: [], toolEvidence: [], reason: 'no-final-answer' };
    }
    return { answerBlocks: raw.claims, toolEvidence: [], reason: 'answered' };
  }

  const deadline = Date.now() + MANAGEMENT_GENERATION_DEADLINE_MS;
  // Tool rounds stop here, so the answer always has the remainder.
  const toolDeadline = deadline - ANSWER_RESERVE_MS;

  for (let call = 0; call < MAX_TOOL_CALLS; call++) {
    // Each iteration's timeout is what REMAINS of the one budget, so unused
    // time rolls forward and the total can never outrun the budget. When too
    // little remains, stop with the answer-shaped empty payload rather than
    // start another call.
    const remainingMs = toolDeadline - Date.now();
    if (remainingMs < MIN_CALL_TIMEOUT_MS) {
      logger.warn({ call, remainingMs }, 'ask ran out of generation budget before answering');
      return { answerBlocks: [], toolEvidence: historyToEvidence(history), reason: 'budget-exhausted' };
    }

    const prompt = buildManagementAnswerPrompt({ scopeLabel, question, evidence, toolDescriptions, history });

    let raw;
    try {
      raw = await generateStructured({
        prompt,
        schema: managementAnswerResponseJsonSchema,
        temperature: 0.2,
        maxOutputTokens: 8192,
        timeoutMs: remainingMs,
        maxAttempts: 1,
      });
    } catch (err) {
      // The loop used to swallow this. An aborted or failed generation then
      // reached the operator as "No grounded answer", with nothing anywhere
      // saying why — the failure this whole plan exists to remove.
      logger.warn({ err, call, remainingMs }, 'generation step failed; ending the ask');
      return { answerBlocks: [], toolEvidence: historyToEvidence(history), reason: 'generation-failed' };
    }
    const tool = raw?.tool;
    const args = raw?.args ?? {};

    if (tool === 'final_answer') {
      const claims = Array.isArray(args?.claims) ? args.claims : [];
      if (claims.length === 0) {
        // The model concluded without stating anything. Distinguishing this from
        // an empty result the server produced is what makes it diagnosable.
        logger.warn(
          { call, argKeys: Object.keys(args ?? {}).join(','), raw: JSON.stringify(raw ?? null).slice(0, 500) },
          'final_answer carried no claims',
        );
        return { answerBlocks: [], toolEvidence: historyToEvidence(history), reason: 'no-final-answer' };
      }
      return { answerBlocks: claims, toolEvidence: historyToEvidence(history), reason: 'answered' };
    }

    // The tool read gets what remains of the one budget, floored so the
    // timeout stays strictly positive; an abort reaches the model as the
    // existing `{ unavailable: true }` (executeTool catches it), never a new
    // error shape.
    const toolRemainingMs = Math.max(toolDeadline - Date.now(), MIN_CALL_TIMEOUT_MS);
    const result = await executeTool(tool, args, ctx, tools, AbortSignal.timeout(toolRemainingMs));
    // A rejected call — an unknown tool name, or args that fail the tool's own
    // schema — never reaches a service and so leaves no trace anywhere else. The
    // loop then asks the model again with an error it cannot act on, and after
    // four rounds it stops with an empty answer. Without this line that entire
    // failure is invisible.
    logger.info({ call, tool, result: summarizeToolResult(result) }, 'ask tool call');
    history.push({ tool, result });
  }

  // THE TOOL BUDGET IS NOT THE ANSWER BUDGET. Returning empty here was the loop's
  // worst behaviour: the model had the data in hand, was never told to conclude,
  // and the operator got a dead end that looked identical to a validation
  // refusal. One more call, forced to answer and unable to call a tool, turns
  // "the loop ran out" into either a grounded answer or an honest statement of
  // what this scope cannot show.
  const finalMs = deadline - Date.now();
  if (finalMs >= MIN_CALL_TIMEOUT_MS) {
    try {
      const raw = await generateStructured({
        prompt: buildManagementFinalAnswerPrompt({ scopeLabel, question, evidence, history }),
        schema: managementSingleShotResponseJsonSchema,
        temperature: 0.2,
        maxOutputTokens: 8192,
        timeoutMs: finalMs,
        maxAttempts: 1,
      });
      const claims = Array.isArray(raw?.claims) ? raw.claims : [];
      logger.info(
        { calls: MAX_TOOL_CALLS, claims: claims.length },
        'ask forced a final answer after the tool budget',
      );
      if (claims.length === 0) {
        return { answerBlocks: [], toolEvidence: historyToEvidence(history), reason: 'no-final-answer' };
      }
      return { answerBlocks: claims, toolEvidence: historyToEvidence(history), reason: 'answered' };
    } catch (err) {
      logger.warn({ err, finalMs }, 'forced final answer failed');
      // The provider failed, so nothing can be concluded about the PAGE. Saying
      // "this page cannot answer that" here would be a lie about the page.
      return { answerBlocks: [], toolEvidence: historyToEvidence(history), reason: 'generation-failed' };
    }
  }

  logger.warn({ calls: MAX_TOOL_CALLS }, 'ask exhausted its tool calls without a final answer');
  return { answerBlocks: [], toolEvidence: historyToEvidence(history), reason: 'budget-exhausted' };
}

/** A bounded, log-safe view of a tool result: enough to see why it failed. */
function summarizeToolResult(result) {
  if (result?.error) return { error: String(result.error).slice(0, 200) };
  if (result?.unavailable) return { unavailable: true };
  const data = result?.data;
  return {
    rows: Array.isArray(data) ? data.length : undefined,
    keys: Object.keys(result ?? {}).slice(0, 6).join(','),
  };
}

// Tool results become turn-local evidence items so answer claims citing
// tool-gathered data can be grounded by the same validator.
function historyToEvidence(history) {
  return history.map((h, i) => ({
    id: `tool:${h.tool}:${i + 1}`,
    type: 'computed',
    label: `Tool result ${h.tool}`,
    value: h.result,
    asOf: new Date().toISOString(),
  }));
}
