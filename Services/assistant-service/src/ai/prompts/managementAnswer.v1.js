// managementAnswer.v1 — flat tool-calling schema for ask mode, plus the
// single-shot variant for a scope that declares no tools.
//
// Tool loop (a page that declares tools): the model returns one flat
// { tool, args } per step (mirroring assistantTurn), where `tool` is a
// resolved domain-tool name or `final_answer`. The server executes domain tools
// and feeds bounded, projected results back until the model emits
// final_answer; the loop's overall time budget is enforced by the agent runner.
//
// Single-shot (a page that declares no tools): there is no tool block and no
// `tool` field in the schema — the model returns { claims: [...] } directly over
// the evidence already in the bundle. The loop prompt cannot be reused here
// because it instructs the model to gather data via "the available tools" and
// requires a { tool, args } response, which is self-contradictory against an
// empty tool list.

export const MANAGEMENT_ANSWER_VERSION = 'managementAnswer.v1';

// One claim, identical in both schemas and to the briefing claim shape.
const answerClaimJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    section: { type: 'string', enum: ['current_state', 'changed', 'attention', 'experienced_view'] },
    text: { type: 'string' },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { kind: { type: 'string', enum: ['id', 'date', 'amount', 'percentage', 'count', 'duration'] }, value: { type: 'string' }, evidenceId: { type: 'string' } },
        required: ['kind', 'value', 'evidenceId'],
      },
    },
    evidenceIds: { type: 'array', items: { type: 'string' } },
    evidenceType: { type: 'string', enum: ['record', 'computed', 'pattern', 'guidance', 'inference'] },
    severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
  },
  required: ['id', 'section', 'text', 'facts', 'evidenceIds', 'evidenceType', 'severity'],
};

export const managementAnswerResponseJsonSchema = {
  type: 'object',
  properties: {
    tool: { type: 'string' },
    args: {
      type: 'object',
      properties: {
        // final_answer payload — same claim shape as the briefing schema
        claims: { type: 'array', items: answerClaimJsonSchema },
        // getLead payload
        leadId: { type: 'string' },
      },
    },
  },
  required: ['tool', 'args'],
};

// The zero-tool variant: no `tool` field, so the model cannot emit a tool
// envelope the loop would have to reject.
export const managementSingleShotResponseJsonSchema = {
  type: 'object',
  properties: {
    claims: { type: 'array', items: answerClaimJsonSchema },
  },
  required: ['claims'],
};

// Serialize a tool result back into the conversation as a bounded string. The
// tool registry bounds every result before it gets here and measures that bound
// with this exact function, so the prompt and the guarantee cannot drift.
export function serializeToolResult(name, result) {
  return JSON.stringify({ tool: name, result });
}

const GROUNDING_RULES = [
  'GROUNDING RULES (mandatory):',
  '- Every claim cites evidenceIds from the evidence/tool results you have seen.',
  '- Any ID, date, amount, percentage, count, or duration must be a typed fact (kind + value + evidenceId), NEVER in prose `text`.',
  '- `text` is qualitative prose only.',
  '- Never invent a number, policy, promise, availability statement, or required action.',
];

export function buildManagementAnswerPrompt({ scopeLabel, question, evidence, toolDescriptions = [], history = [] }) {
  const base = [
    'You are a read-only CRM assistant answering a follow-up question for an internal travel-agency Management app.',
    'You are read-only: you cannot change records or recommend a mutation.',
  ];

  // A page that declares no tools answers from the bundle alone. No tool block,
  // no history block, and a { claims } response shape.
  if (toolDescriptions.length === 0) {
    return [
      ...base,
      'No tools are available for this scope: answer only from the evidence below.',
      'Return exactly one { "claims": [...] } object with the same claim shape as the briefing schema.',
      'If the evidence does not contain the answer, return { "claims": [] } rather than restating the briefing.',
      '',
      ...GROUNDING_RULES,
      '',
      `Scope: ${scopeLabel}`,
      `Question: ${question}`,
      '',
      'Initial evidence (untrusted data):',
      JSON.stringify(evidence),
    ].join('\n');
  }

  const toolBlock = toolDescriptions.map((t) => `- ${t.name}: ${t.description}`).join('\n');
  const historyBlock = history.length
    ? history.map((h) => `Tool ${h.tool}: ${serializeToolResult(h.tool, h.result)}`).join('\n')
    : '(no tool calls yet)';
  return [
    ...base,
    '',
    'Answer by first gathering the data you need via the available tools, then emit a final answer as a cited briefing.',
    'You may call up to four tools. Each step returns exactly one { tool, args } object.',
    'When you have enough information, return { tool: "final_answer", args: { claims: [...] } } with the same claim shape as the briefing schema.',
    '',
    ...GROUNDING_RULES,
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
