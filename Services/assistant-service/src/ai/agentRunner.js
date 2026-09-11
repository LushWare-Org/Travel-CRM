import {
  buildManagementAnswerPrompt,
  managementAnswerResponseJsonSchema,
  managementSingleShotResponseJsonSchema,
} from './prompts/managementAnswer.v1.js';
import { executeTool, resolveTools } from '../tools/toolRegistry.js';
import { MANAGEMENT_GENERATION_DEADLINE_MS } from '../constants/managementCopilot.js';

const MAX_TOOL_CALLS = 4;

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
// bounded, projected results. The vocabulary is passed in
// (`adapter.askTools(scope)`); the loop never invents its own.
//
// Returns { answerBlocks, toolEvidence }: answerBlocks are the model's final
// claims ([] when the loop is exhausted or a step fails — never null and never a
// briefing-shaped `claims` payload), and toolEvidence are turn-local evidence
// items so answer claims citing tool-gathered data ground correctly.
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
    } catch {
      return { answerBlocks: [], toolEvidence: [] };
    }
    return { answerBlocks: Array.isArray(raw?.claims) ? raw.claims : [], toolEvidence: [] };
  }

  const deadline = Date.now() + MANAGEMENT_GENERATION_DEADLINE_MS;

  for (let call = 0; call < MAX_TOOL_CALLS; call++) {
    // Each iteration's timeout is what REMAINS of the one budget, so unused
    // time rolls forward and the total can never outrun the budget. When too
    // little remains, stop with the answer-shaped empty payload rather than
    // start another call.
    const remainingMs = deadline - Date.now();
    if (remainingMs < MIN_CALL_TIMEOUT_MS) {
      return { answerBlocks: [], toolEvidence: historyToEvidence(history) };
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
    } catch {
      return { answerBlocks: [], toolEvidence: historyToEvidence(history) };
    }
    const tool = raw?.tool;
    const args = raw?.args ?? {};

    if (tool === 'final_answer') {
      return { answerBlocks: Array.isArray(args?.claims) ? args.claims : [], toolEvidence: historyToEvidence(history) };
    }

    // The tool read gets what remains of the one budget, floored so the
    // timeout stays strictly positive; an abort reaches the model as the
    // existing `{ unavailable: true }` (executeTool catches it), never a new
    // error shape.
    const toolRemainingMs = Math.max(deadline - Date.now(), MIN_CALL_TIMEOUT_MS);
    const result = await executeTool(tool, args, ctx, tools, AbortSignal.timeout(toolRemainingMs));
    history.push({ tool, result });
  }

  return { answerBlocks: [], toolEvidence: historyToEvidence(history) };
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
