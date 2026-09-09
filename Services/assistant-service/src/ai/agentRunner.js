import { buildManagementAnswerPrompt, managementAnswerResponseJsonSchema } from './prompts/managementAnswer.v1.js';
import { executeTool, domainTools } from '../tools/toolRegistry.js';

const MAX_TOOL_CALLS = 4;
const GENERATION_DEADLINE_MS = 17_000;

// Bounded agent loop for ask mode. The model may call up to four domain tools
// to gather data, then must emit final_answer. Every tool executes server-side
// under the caller's identity; the model only ever sees bounded allowlisted
// results. Returns { claims, toolEvidence } where toolEvidence are turn-local
// evidence items so answer claims citing tool-gathered data ground correctly;
// claims is null if the loop is exhausted or a step fails.
export async function runAgentLoop({ ctx, scopeLabel, question, evidence, generateStructured }) {
  const toolDescriptions = domainTools.map((t) => ({ name: t.name, description: t.description }));
  const history = [];

  for (let call = 0; call < MAX_TOOL_CALLS; call++) {
    const prompt = buildManagementAnswerPrompt({ scopeLabel, question, evidence, toolDescriptions, history });

    let raw;
    try {
      raw = await generateStructured({
        prompt,
        schema: managementAnswerResponseJsonSchema,
        temperature: 0.2,
        maxOutputTokens: 8192,
        timeoutMs: GENERATION_DEADLINE_MS,
        maxAttempts: 1,
      });
    } catch {
      return { claims: null, toolEvidence: historyToEvidence(history) };
    }
    const tool = raw?.tool;
    const args = raw?.args ?? {};

    if (tool === 'final_answer') {
      return { claims: Array.isArray(args?.claims) ? args.claims : null, toolEvidence: historyToEvidence(history) };
    }

    const result = await executeTool(tool, args, ctx);
    history.push({ tool, result });
  }

  return { claims: null, toolEvidence: historyToEvidence(history) };
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
