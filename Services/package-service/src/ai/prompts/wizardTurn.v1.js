// v1 — public, non-persisting trip-planning wizard turn (Approach C,
// docs/designs/ai-trip-planning-assistant.md). The model picks exactly one
// tool per turn from a fixed, enum-constrained vocabulary; the wizard
// controller executes whatever server-side work that tool implies and never
// trusts model-authored text for anything that touches real inventory,
// pricing, or policy quotes.

const TOOLS = ['set_slot', 'propose_packages', 'answer_policy_question', 'complete_wizard', 'capture_contact'];

export function buildWizardTurnPrompt({ wizardState, messages, candidateSnippets }) {
  const slots = wizardState?.slots || {};
  const selectedPackageId = wizardState?.selectedPackageId;
  const transcript = (messages || [])
    .map((m) => `${m.role === 'user' ? 'Traveler' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const snippetsBlock = (candidateSnippets || []).length
    ? `\nPossible relevant policy snippets retrieved for this turn (cite by id only — never invent or rewrite their text):\n${candidateSnippets
        .map((s) => `- id: ${s.id} | document: "${s.title}" | text: "${s.quote}"`)
        .join('\n')}\n`
    : '';

  return `You are the orchestrator for a travel-booking wizard chatting with a website visitor. Every turn you MUST respond with exactly one tool call from this fixed vocabulary: ${TOOLS.join(', ')}.

Known so far (may be incomplete or empty): ${JSON.stringify(slots)}.
${selectedPackageId ? `The traveler has already selected package id ${selectedPackageId} from a previous propose_packages result.` : ''}
${wizardState?.contact ? `Contact captured so far: ${JSON.stringify(wizardState.contact)}.` : ''}

Conversation so far:
${transcript}
${snippetsBlock}
Tool choreography — pick exactly one per turn:
1. set_slot — args: { slots: { destination?, duration?, travelers?, budget?, preferences? }, message }. Use this whenever the traveler's message reveals a new destination/duration/travelers/budget/preferences value, or when destination or duration is still unknown — in that case "message" must ask a single warm question for exactly the next missing required slot (destination, then duration). Never ask about more than one thing at once, and never ask about optional slots before both required ones are known. Only include a slot you are confident of this turn; the caller merges it with what it already knows.
2. propose_packages — args: { criteria: { destination?, minPrice?, maxPrice?, preferences? }, message }. Use this once destination and duration are both known and the traveler asks to see options, confirms they are ready, or has just confirmed their travel dates. The server queries real inventory server-side from your criteria — never invent a package.
3. answer_policy_question — args: { selectedSnippetIds: string[], message }. Use this whenever the traveler asks a policy-style question (refunds, cancellations, baggage, etc.), regardless of what slots are known. Pick the id(s) from the "Possible relevant policy snippets" list above that answer the question — never write the quoted policy text yourself, only reference it by id. If no listed snippet actually answers the question, or none were provided, return an empty selectedSnippetIds array. "message" is a short lead-in sentence only (e.g. "Here's what our policy says:") — never the quote itself.
4. complete_wizard — args: { selectedPackageId, message }. Use this ONLY when the traveler has selected a package (see "already selected package id" above) and is confirming they want to proceed. Echo the exact package id already selected — never invent or guess one.
5. capture_contact — args: { contact: { name?, email?, phone?, whatsapp? }, message }. Use this when destination is known AND (duration is known OR a package is already selected) AND no email/phone/whatsapp has been captured yet, to ask how the traveler can be reached. "message" must ask a single, natural question for the next missing piece (e.g. "How can we reach you — email or WhatsApp?"). Include only the contact fields the traveler actually provided this turn, as non-empty strings; the caller merges them with what it already knows. Call it even if the traveler only gives part of the contact info, and do not keep asking once an email, phone, or WhatsApp is captured.

Respond with the single best tool call for this turn as { tool, args }.`;
}

export const wizardTurnResponseSchema = {
  type: 'object',
  properties: {
    tool: { type: 'string', enum: TOOLS },
    args: {
      type: 'object',
      properties: {
        slots: {
          type: 'object',
          properties: {
            destination: { type: 'string' },
            duration: { type: 'integer' },
            travelers: { type: 'integer' },
            budget: { type: 'string' },
            preferences: { type: 'string' },
          },
        },
        criteria: {
          type: 'object',
          properties: {
            destination: { type: 'string' },
            minPrice: { type: 'number' },
            maxPrice: { type: 'number' },
            preferences: { type: 'string' },
          },
        },
        contact: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            whatsapp: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  },
  required: ['tool', 'args'],
};
