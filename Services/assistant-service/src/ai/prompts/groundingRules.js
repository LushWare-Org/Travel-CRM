// ─── The grounding rules, stated once ─────────────────────────────────────
// Both Management prompts need the same policy, and the policy has to change in
// lockstep with the validator that enforces it. Keeping the text in one module is
// what makes that possible: previously the rule was written out in full in two
// files, so relaxing one and forgetting the other would have left the panel and
// the chat disagreeing about what the model is allowed to say, with nothing
// failing.
//
// WHY THE WORDING CHANGED (grounding.v1 → v2)
// The old rule said a value must NEVER appear in the prose and that `text` is
// qualitative only. The validator enforced it by rejecting any claim whose prose
// contained a digit — which made every counting question unanswerable, because a
// correct answer to "which destinations have the most leads?" is a number in a
// sentence. The model was therefore told to avoid the very thing the product
// needed, and the two together produced "No grounded answer for that question."
//
// The rule now permits a number when the claim can support it, and keeps the
// strict part: a number that resolves to nothing discards the claim.

export const GROUNDING_VERSION = 'grounding.v2';

export const GROUNDING_RULES = [
  'GROUNDING RULES (mandatory):',
  '- Produce JSON matching the response schema exactly.',
  '- Every claim cites evidenceIds that appear in the evidence or tool results you have seen.',
  '- A number MAY appear in `text` when the claim also emits that same value as a typed fact (kind + value + evidenceId). Every number the reader sees must resolve to something you cite; a number that resolves to nothing discards the whole claim.',
  '- When a value is computed rather than read — a count, a duration, a percentage, a rule constant — emit it as a derived fact carrying `derivation` (grouped-by | elapsed-since | ratio-of | descriptor-constant) and the evidence it came from.',
  '- Never invent a number, policy, promise, availability statement, or required action.',
  '- Unknown or partial evidence means you say so; never guess.',
];

// The subset that holds when there is no typed-fact contract — the public
// site-wide assistant resolves one tool call with a flat args object, has no
// evidence bundle and emits no claims, so the rules above about evidenceIds
// and `derivation` would ask for fields its schema rejects. These lines are
// the ones that survive that difference, and they exist so the wording lives
// here rather than being written out again in the assistant-turn prompt.
export const GROUNDING_RULES_UNSTRUCTURED = [
  'GROUNDING RULES (mandatory):',
  '- Produce JSON matching the response schema exactly.',
  '- Never invent a number, policy, promise, availability statement, or required action.',
  '- Unknown or partial information means you say so; never guess.',
].join('\n');

export const STRUCTURED_OUTPUT_NOTE = [
  'WHERE STRUCTURE GOES:',
  '- `text` is what you would say out loud to a colleague: short, second person, one idea per sentence.',
  '- Counts, rankings, ids and lists belong in the typed facts, the suggested questions and the actions — never spelled out as a table or a serialized object inside a sentence.',
  '- Never put a raw record id, a JSON object, or an internal evidence path in `text`.',
].join('\n');

export function groundingBlock() {
  return GROUNDING_RULES.join('\n');
}
