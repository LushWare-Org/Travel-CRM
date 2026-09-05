// v1 — public, non-persisting site-wide assistant turn
// (docs/designs/site-wide-floating-assistant.md, Phase 1). The model picks
// exactly one tool per turn from a fixed, enum-constrained vocabulary;
// assistant.controller.js executes whatever server-side work that tool
// implies and never trusts model-authored text for navigation targets or
// policy quotes. There is no wizard state here — the client resends its
// sliding message window each turn.

import { z } from 'zod';

export const ASSISTANT_TOOLS = ['navigate', 'answer_faq_policy'];

export const assistantTurnToolSchema = z.enum(ASSISTANT_TOOLS);
export const assistantTurnArgsSchema = z.record(z.string(), z.unknown());

// Zod contract for the model's structured output — the controller validates
// every model response against this before dispatching (see
// assistant.controller.js). args stays open (z.record) so per-tool arg
// shapes can evolve additively without a contract bump.
export const assistantTurnResponseSchema = z.object({
  tool: assistantTurnToolSchema,
  args: assistantTurnArgsSchema,
});

// Plain JSON-Schema view of the same contract in the shape Gemini's
// responseSchema accepts — generateStructured passes it straight through, and
// wizardTurn.v1.js ships the same hand-written JSON-Schema style. Keeping the
// zod object above as the single source of truth for the tool vocabulary.
export const assistantTurnResponseJsonSchema = {
  type: 'object',
  properties: {
    tool: { type: 'string', enum: ASSISTANT_TOOLS },
    // Flat, merged-across-tools shape (same convention as
    // wizardTurn.v1.js's wizardTurnResponseSchema) — explicit properties are
    // required for Gemini's structured output to reliably fill args at all;
    // an empty `{ type: 'object' }` (no properties) makes the model return
    // args: {} on every turn regardless of tool, since it has no declared
    // slots to populate (found while verifying a live end-to-end turn).
    args: {
      type: 'object',
      properties: {
        route: { type: 'string' },
        question: { type: 'string' },
        selectedSnippetIds: { type: 'array', items: { type: 'string' } },
        message: { type: 'string' },
      },
    },
  },
  required: ['tool', 'args'],
};

export function buildAssistantTurnPrompt({ messages, availableRoutes, candidateSnippets }) {
  const routeNames = (availableRoutes || []).map((r) => r.name);
  const transcript = (messages || [])
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`)
    .join('\n');

  // Navigation is client-side only: the visitor's page router executes the
  // move. The model is shown route NAME values only (never raw paths) so a
  // raw path or URL can never leak into — or be echoed out of — its output.
  const routesBlock = routeNames.length
    ? `Pages the visitor can currently be sent to (choose a name from this exact list — never a raw path or URL):\n${routeNames
        .map((name) => `- ${name}`)
        .join('\n')}\n`
    : 'No pages are available for navigation this turn.\n';

  const snippetsBlock = (candidateSnippets || []).length
    ? `Possible relevant policy snippets retrieved for this turn (cite by id only — never invent or rewrite their text):\n${candidateSnippets
        .map((s) => `- id: ${s.id} | docId: ${s.docId} | document: "${s.title}" | text: "${s.quote}"`)
        .join('\n')}\n`
    : '';

  return `You are the assistant on a travel company's public website, chatting with a visitor. Every turn you MUST respond with exactly one tool call from this fixed vocabulary: ${ASSISTANT_TOOLS.join(', ')}.

You can do two things, nothing else:
1. Navigate the visitor to one of the site's own pages (the page's own router executes the move — you only name the destination).
2. Answer a policy/FAQ question using ONLY the quoted policy snippets provided below (the server holds the actual documents — you never author policy text).

${routesBlock}
Conversation so far:
${transcript}
${snippetsBlock}
Tool choreography — pick exactly one per turn:
1. navigate — args: { route: string, message: string }. Use this when the visitor asks to go to a page, or their request is best served by sending them there. "route" MUST be exactly one of the page names listed above — never a raw path, URL, or a name that is not listed. "message" is a short confirmation sentence only (e.g. "Sure — taking you to the packages page."); never put a raw path or URL in it.
2. answer_faq_policy — args: { question: string, selectedSnippetIds: string[], message: string }. Use this whenever the visitor asks a policy/FAQ-style question (refunds, cancellations, baggage, bookings, visas, etc.) or whenever their request fits neither capability. Pick the snippet id(s) from the "Possible relevant policy snippets" list above whose quoted text actually answers the question — reference snippets by id only, never by rewriting or paraphrasing their text, and never invent a policy that is not in the list. "question" restates the visitor's question in your own words. "message" is a short lead-in sentence only (e.g. "Here's what our policy says:") — never the quote or policy text itself. If no listed snippet actually answers the question, or no snippets were provided, or the request is unrelated to both capabilities, STILL call answer_faq_policy with an empty selectedSnippetIds array and an empty "question" — the server applies its own fallback message, so never answer from memory.

Always pick exactly one tool per turn — never more, never none. Respond with the single best tool call as { tool, args }.`;
}
