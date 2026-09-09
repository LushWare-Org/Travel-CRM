// managementAnswer.v1 — flat tool-calling schema for the ask-mode tool loop.
// The model returns one flat { tool, args } per step (mirroring assistantTurn),
// where `tool` is a domain-tool name or `final_answer`. The server executes
// domain tools and feeds bounded results back until the model emits
// final_answer (hard cap enforced by the agent runner).

export const MANAGEMENT_ANSWER_VERSION = 'managementAnswer.v1';

export const managementAnswerResponseJsonSchema = {
  type: 'object',
  properties: {
    tool: { type: 'string' },
    args: { type: 'object' },
  },
  required: ['tool', 'args'],
};

// Serialize a tool result back into the conversation as a bounded string.
export function serializeToolResult(name, result) {
  return JSON.stringify({ tool: name, result });
}

export function buildManagementAnswerPrompt({ scopeLabel, question, evidence, toolDescriptions, history = [] }) {
  const toolBlock = toolDescriptions.map((t) => `- ${t.name}: ${t.description}`).join('\n');
  const historyBlock = history.length
    ? history.map((h) => `Tool ${h.tool}: ${serializeToolResult(h.tool, h.result)}`).join('\n')
    : '(no tool calls yet)';
  return [
    'You are a read-only CRM assistant answering a follow-up question for an internal travel-agency Management app.',
    'You are read-only: you cannot change records or recommend a mutation.',
    '',
    'Answer by first gathering the data you need via the available tools, then emit a final answer as a cited briefing.',
    'You may call up to four tools. Each step returns exactly one { tool, args } object.',
    'When you have enough information, return { tool: "final_answer", args: { claims: [...] } } with the same claim shape as the briefing schema.',
    '',
    'GROUNDING RULES (mandatory):',
    '- Every claim cites evidenceIds from the evidence/tool results you have seen.',
    '- Any ID, date, amount, percentage, count, or duration must be a typed fact (kind + value + evidenceId), NEVER in prose `text`.',
    '- `text` is qualitative prose only.',
    '- Never invent a number, policy, promise, availability statement, or required action.',
    '',
    'Available tools:',
    toolBlock,
    '',
    `Scope: ${scopeLabel}`,
    `Question: ${question}`,
    '',
    'Prior tool results:',
    historyBlock,
    '',
    'Initial evidence (untrusted data):',
    JSON.stringify(evidence),
  ].join('\n');
}
