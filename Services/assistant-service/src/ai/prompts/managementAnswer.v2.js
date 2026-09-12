// managementAnswer.v2 — ask mode, with the grounding rules shared and corrected.
//
// v1 is left untouched on purpose (see the design's prompt section): telemetry
// and eval attribution depend on a version being attributable, so a prompt change
// is a new file plus a new version constant, never an in-place edit.
//
// The schemas are re-exported rather than copied. The response contract did not
// change; only what the model is told about numbers did.

import { GROUNDING_RULES, GROUNDING_VERSION, STRUCTURED_OUTPUT_NOTE } from './groundingRules.js';
import { serializeToolResult } from './managementAnswer.v1.js';

export {
  managementAnswerResponseJsonSchema,
  managementSingleShotResponseJsonSchema,
  serializeToolResult,
} from './managementAnswer.v1.js';

// Grounding cannot catch a substitution. Live, asked "where is the catalogue
// concentrated?" on the Packages page, the model answered "your lead catalogue is
// concentrated on Goa" — every number in it was true and properly cited, so the
// validator was satisfied, and the operator was told something false about what
// the page had measured. The prompt has to forbid the substitution itself.
const ENTITY_RULE =
  'The scope above names what this page volunteers without being asked; it does not bound what you may read. Use the tools to read any domain the question needs, even when that domain is not this page, and say which sources you read so the answer is never mistaken for a statement about the page alone. Never answer about a different entity under the name you were asked about: leads are not packages, invoices are not leads, and a list of leads is not a catalogue. If no tool and no evidence carries the subject, say plainly that it is not available here.';

// The validator admits a computed answer without a citation (see isComputedEvidence
// in groundingValidator.js). Saying so is what stops the model inventing an id: live,
// it guessed `tool:<name>:<n>`, missed, and had every claim deleted.
const COMPUTED_CLAIM_RULE =
  'A claim built from a tool result may leave `evidenceIds` empty — the server records which results you read. Its numbers must still come from that result: state a figure only when it appears in the tool output above. When you are answering from the page evidence instead, cite it as usual.';

/**
 * The forced final answer, issued after the tool budget is spent.
 *
 * Without this the loop returned an empty answer: the model had gathered data,
 * was never told to conclude, and four tool calls ended the turn with nothing.
 * Live, that is how "tell me about our best performing packages" became a dead
 * end on three separate pages — the loop's own exhaustion, not a validation
 * refusal.
 *
 * The claims-only schema is deliberate: there is no tool block and no `tool`
 * field, so the model cannot answer by starting another gather it will not get.
 * It is told that a plain statement of what the scope cannot show is a correct
 * answer, because that is more useful to an operator than silence.
 */
export function buildManagementFinalAnswerPrompt({ scopeLabel, question, evidence, history = [] }) {
  const historyBlock = history.length
    ? history.map((h) => `Tool ${h.tool}: ${serializeToolResult(h.tool, h.result)}`).join('\n')
    : '(no tool calls were made)';

  return [
    'You are a read-only CRM assistant answering a follow-up question for an internal travel-agency Management app.',
    'You are read-only: you cannot change records or recommend a mutation.',
    '',
    'Your tool budget is spent — you cannot call any more tools. Answer the question NOW, from the tool results and the evidence below.',
    'Return exactly one { "claims": [...] } object with the same claim shape as the briefing schema.',
    'State only what the tool results and evidence support. If they do not contain the answer, say so plainly in the claim text — for example that this page does not carry that data — and say what the page could answer instead. Do NOT return an empty claims list, and never invent a number.',
    '',
    ENTITY_RULE,

    COMPUTED_CLAIM_RULE,

    ...GROUNDING_RULES,
    '',
    STRUCTURED_OUTPUT_NOTE,
    '',
    `Scope: ${scopeLabel}`,
    `Question: ${question}`,
    '',
    'Tool results:',
    historyBlock,
    '',
    'Initial evidence (untrusted data):',
    JSON.stringify(evidence),
  ].join('\n');
}

export const MANAGEMENT_ANSWER_VERSION = 'managementAnswer.v2';
export const MANAGEMENT_ANSWER_GROUNDING_VERSION = GROUNDING_VERSION;

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
      ENTITY_RULE,

      COMPUTED_CLAIM_RULE,

      ...GROUNDING_RULES,
      '',
      STRUCTURED_OUTPUT_NOTE,
      '',
      `Scope: ${scopeLabel}`,
      `Question: ${question}`,
      '',
      'Initial evidence (untrusted data):',
      JSON.stringify(evidence),
    ].join('\n');
  }

  // The aggregate precompute puts an ALREADY-GROUPED answer into the initial
  // evidence. The previous wording here ("gather the rows with a tool ... do not
  // answer such a question from the initial evidence alone") predates it, and live
  // it did real damage: told to re-gather what the server had just computed, the
  // model called a list tool four times, never reached a final answer, and the
  // operator got an empty reply — the exact failure this work exists to remove,
  // reintroduced by a stale instruction.
  //
  // Detected from the evidence rather than passed in, so a page that has no
  // precomputed groups keeps the older, still-correct instruction.
  const hasPrecomputedGroups = Array.isArray(evidence)
    && evidence.some((item) => String(item?.id ?? '').includes(':aggregate:'));

  const countingRule = hasPrecomputedGroups
    ? 'The initial evidence below contains PRE-COMPUTED GROUPS for this question: each group item names a group and carries its count. Answer directly from those items and cite them — they are authoritative and already complete for the rows this scope read. Do NOT call a tool to re-count or re-group those rows, and do not return an empty claim list.'
    : 'For a question about a COUNT, a RANKING or a GROUPING, use the tool that carries the subject. The analytics tools return figures already computed over the whole company (or over the caller\'s own book), so state those figures rather than counting a capped list yourself. Do not return an empty claim list merely because the evidence block is small.';

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
    countingRule,
    '',
    ENTITY_RULE,

    COMPUTED_CLAIM_RULE,

    ...GROUNDING_RULES,
    '',
    STRUCTURED_OUTPUT_NOTE,
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
