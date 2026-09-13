import { describe, expect, it } from 'vitest';
import {
  assistantTurnResponseSchema,
  buildAssistantTurnPrompt,
  canonicalizeAssistantTurnResponse,
} from '../prompts/assistantTurn.v1.js';

const PROMPT_INPUT = {
  messages: [{ role: 'user', content: 'Hello' }],
  availableRoutes: [{ name: 'packages', path: '/packages' }],
  candidateSnippets: [],
};

describe('assistant turn prompt contract', () => {
  it('advertises only legacy outcomes while the rollout flag is disabled', () => {
    const prompt = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: false });

    expect(prompt).toContain(
      'Return exactly one tool from: navigate, answer_faq_policy, answer_packages, hand_off, request_booking.',
    );
    // Answering about a package, handing a visitor to the booking form, and
    // taking a booking request are offered whether or not the conversational
    // flag is on: none is a conversational outcome, and the canonicalizer
    // rewrites anything outside the legacy set into a policy answer when the
    // flag is off — which would silently turn any of them into a policy reply
    // in exactly the environments where the flag is disabled.
    expect(prompt).toContain('2. Otherwise, does the visitor ask about ONE particular package');
    expect(prompt).toContain('hand_off');
    expect(prompt).toContain('request_booking');
    // The decision list is the whole list of tools the model may pick from, so
    // an outcome that is not advertised must not appear as an option either.
    expect(prompt).not.toContain('respond_conversationally');
    expect(prompt).not.toContain('redirect_off_topic');
  });

  it('advertises both reviewed conversational outcomes while the rollout flag is enabled', () => {
    const prompt = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: true });

    expect(prompt).toContain('respond_conversationally, redirect_off_topic');
    expect(prompt).toContain('6. Otherwise, is it greeting, thanks, goodbye, or a question about you? Use respond_conversationally.');
    expect(prompt).toContain('7. Otherwise, is it unrelated to travel, the site, or the company? Use redirect_off_topic.');
    // The router is flag-gated and rate-limited, so "it did not run" is a
    // frequent outcome rather than an edge case. Tying the mode to the hint
    // being exactly travel_general rewrote a real travel answer into the social
    // repair line whenever the hint was absent.
    expect(prompt).toContain('Use travel_general when the untrusted router hint is travel_general or unavailable');
  });

  it('decides the tool by an explicit order, and works the boundaries that were reported wrong', () => {
    const prompt = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: true });

    // The previous prompt described five tools and argued for each, which left
    // every boundary to the model. "suggest me a family package" matched the
    // navigate rule ("show me X") and the package rule ("recommending one")
    // alike, and browsed on some runs and answered on others.
    expect(prompt).toContain('How to choose the tool:');
    expect(prompt).toContain('The list is an order, not a menu: take the first that applies.');
    expect(prompt).toContain('A question about one package is answer_packages even though it also looks like "show me"');
    expect(prompt).not.toContain('Tool choreography');

    // Each of these was an observed misroute, so each is pinned.
    expect(prompt).toContain('- "show me bali packages" -> navigate { route: "packages", destination: "indonesia" } (a list, not a package)');
    expect(prompt).toContain('- "what is your refund policy" -> answer_faq_policy (company rules, even though packages exist)');
    expect(prompt).toContain('- "just send me to the booking form" -> hand_off { kind: "booking", packageId: "<its id>" }');
    // Booking is captured in the chat now, and the example that teaches it is
    // also the example that teaches the never-invent rule: every value in it is
    // one the visitor said.
    expect(prompt).toContain('4. Otherwise, does the visitor want to book a package? Use request_booking');
    expect(prompt).toContain('Never invent one they have not given: leave it out, and the server asks them for it.');
    expect(prompt).toContain('- "book the bali one for 4 in march, i\'m ana@example.com" -> request_booking');
    expect(prompt).toContain('- "book it" -> request_booking { packageId: "<its id>" } (nothing else — the server asks for the rest)');
    // The email rule is the one that carries a side effect: an address the model
    // produced would create a customer account for someone who never asked.
    expect(prompt).toContain('their email must be the address they typed');
    expect(prompt).toContain('- "can I get a discount" -> hand_off { kind: "human" } (nothing to arrange)');
    expect(prompt).toContain('- "hi, how much is the japan trip?" -> answer_packages (a social opening does not make it social)');
    expect(prompt).toContain('- "can you pick one for me" -> answer_packages (a choice is still about packages)');

    // The catalogue as a whole is a list question, not a package question: the
    // first audit run answered "what packages do you have" with every package
    // cited, which drew a card for each of the seven and could not state the
    // count at all — the count only exists on the list page.
    expect(prompt).toContain('- "what packages do you have" -> navigate { route: "packages" } (the whole catalogue, not one package)');
    expect(prompt).toContain('- "how many packages do you have" -> navigate { route: "packages" } (the list carries the count)');
    expect(prompt).toContain('A question about the catalogue as a whole is navigate, not answer_packages');

    // Gibberish is not an off-topic request; the first audit run answered
    // "asdfghjkl" with the travel redirect rather than asking for a rephrase.
    expect(prompt).toContain('Text you cannot make sense of at all');
    expect(prompt).toContain('rather than redirect_off_topic');
  });

  it('advertises a page\u2019s filters, their value spaces and the worked examples only when it declares any', () => {
    const withFilters = buildAssistantTurnPrompt({
      ...PROMPT_INPUT,
      availableRoutes: [{ name: 'packages', path: '/packages', params: ['destination', 'priceMax', 'sort'] }],
      conversationalOutcomesEnabled: true,
    });

    expect(withFilters).toContain('- packages (optional filters: destination, priceMax, sort)');
    expect(withFilters).toContain('- priceMax: a whole number — the highest price to include');
    expect(withFilters).toContain('"best performing packages" -> { route: "packages", sort: "popularity" }');
    expect(withFilters).toContain('"tell me about Dubai packages" -> { route: "packages", destination: "dubai" }');
    expect(withFilters).toContain('"packages need to be below 100" -> { route: "packages", priceMax: 100 }');
    // The model defaulted to sort=popularity on a bare destination ask until
    // both of these were stated, so both are pinned.
    expect(withFilters).toContain('that place IS a destination filter');
    expect(withFilters).toContain('never add it as a default ordering');

    const withoutFilters = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: true });
    expect(withoutFilters).not.toContain('Navigate filter arguments');
    expect(withoutFilters).not.toContain('optional filters');
    // Same rule for the catalogue: a turn with no package records carries no
    // package block, so this change is invisible to a client that sends none.
    expect(withoutFilters).not.toContain('Packages that exist');
  });

  it('lists the destinations that exist so the model picks from them, not from memory', () => {
    const withValues = buildAssistantTurnPrompt({
      ...PROMPT_INPUT,
      availableRoutes: [
        {
          name: 'packages',
          path: '/packages',
          params: ['destination'],
          paramValues: { destination: [{ value: 'uae', label: 'Dubai' }] },
        },
      ],
      conversationalOutcomesEnabled: true,
    });

    expect(withValues).toContain('Destinations that exist');
    expect(withValues).toContain('- "uae" = Dubai');

    // No declared values means no block: a client that sends none gets the
    // prompt it got before this existed.
    const withoutValues = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: true });
    expect(withoutValues).not.toContain('Destinations that exist');
  });

  it('asks for an answer sized to the question, and forbids repeating a stated fact', () => {
    const prompt = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: true });

    expect(prompt).toContain('How to answer about a package');
    // The facts are named individually: "do not repeat yourself" alone is too
    // vague to act on, and the reported repetition was the rating and the
    // review count specifically.
    expect(prompt).toContain('do NOT give it again');
    expect(prompt).toContain('the rating, the review count, what is included or the description');
    // Sized to the question rather than always short, so a first introduction or
    // a comparison still answers in full.
    expect(prompt).toContain('A request to summarise, compare or recommend something gets a full answer.');
    // Whether to draw a card is the server's decision now, so the model is not
    // offered a flag for it. The prompt that listed "more details" as a trigger
    // is what redrew a card on a plain "tell me more about it".
    expect(prompt).not.toContain('Set "present" to true');
    expect(prompt).not.toContain('present?: boolean');
    expect(prompt).toContain('When the detail above is present, answer from it');
    // The reported reply announced a limitation the detail block answers.
    expect(prompt).toContain('Never say you do not have information that is listed there');
    expect(prompt).toContain('"how about prices" -> { packageIds: ["<its id>"], message: "It is $618." }');
  });

  it('tells the model to say what it cannot answer instead of guessing', () => {
    const prompt = buildAssistantTurnPrompt({ ...PROMPT_INPUT, conversationalOutcomesEnabled: true });

    expect(prompt).toContain('Never invent a number, policy, promise, availability statement, or required action.');
    expect(prompt).toContain('Unknown or partial information means you say so; never guess.');
  });
});

describe('canonicalizeAssistantTurnResponse', () => {
  it.each([
    [{ tool: 'navigate', args: { route: 42, message: false, selectedSnippetIds: ['cross-tool'] } }, { tool: 'navigate', args: { route: '', message: '' } }],
    [{ tool: 'answer_faq_policy', args: { question: null, selectedSnippetIds: 'snippet-0', message: {} } }, { tool: 'answer_faq_policy', args: { question: '', selectedSnippetIds: [], message: '' } }],
  ])('coerces malformed %s args into the strict per-tool union', (raw, expected) => {
    const canonical = canonicalizeAssistantTurnResponse(raw, { conversationalOutcomesEnabled: true });

    expect(canonical).toEqual(expected);
    expect(assistantTurnResponseSchema.safeParse(canonical).success).toBe(true);
  });

  it('accepts travel_general text when stage one agrees or did not run, and refuses it when it disagrees', () => {
    const raw = {
      tool: 'respond_conversationally',
      args: { mode: 'travel_general', message: 'Leave one flexible day.' },
    };
    expect(
      canonicalizeAssistantTurnResponse(raw, {
        conversationalOutcomesEnabled: true,
        routerIntent: 'travel_general',
      }),
    ).toEqual(raw);
    // No hint at all is a router that was off or rate-limited, not a router
    // that disagreed. Reading it as a disagreement is what answered "tell me
    // what are the trending locations" with the social repair line.
    expect(
      canonicalizeAssistantTurnResponse(raw, {
        conversationalOutcomesEnabled: true,
        routerIntent: null,
      }),
    ).toEqual(raw);
    // A router that ran and classified the turn as something else still blocks
    // it: this is the case the gate exists for, and it is unchanged.
    expect(
      canonicalizeAssistantTurnResponse(raw, {
        conversationalOutcomesEnabled: true,
        routerIntent: 'ambiguous',
      }),
    ).toEqual({
      tool: 'respond_conversationally',
      args: { mode: 'social', socialSubtype: 'repair' },
    });
  });

  it('canonicalizes a booking request, dropping every value it cannot read', () => {
    const complete = {
      tool: 'request_booking',
      args: {
        packageId: 'p-bali',
        email: 'ana@example.com',
        travelDate: '2027-03-14',
        endDate: '2027-03-19',
        travelers: 4,
        name: 'Ana',
        phone: '+94 77 123 4567',
        message: 'Ready.',
      },
    };
    expect(canonicalizeAssistantTurnResponse(complete, { conversationalOutcomesEnabled: true })).toEqual(complete);
    expect(assistantTurnResponseSchema.safeParse(complete).success).toBe(true);

    // A value the model garbled is ABSENT, never repaired: the controller treats
    // absent as "ask the visitor", so a half-read date becomes a question rather
    // than a booking on the wrong day.
    expect(
      canonicalizeAssistantTurnResponse(
        {
          tool: 'request_booking',
          args: {
            packageId: 'p-bali',
            email: 'ana@example.com',
            travelDate: '14 March',
            endDate: 20270319,
            travelers: 0,
            name: '',
            message: null,
          },
        },
        { conversationalOutcomesEnabled: true },
      ),
    ).toEqual({
      tool: 'request_booking',
      args: { packageId: 'p-bali', email: 'ana@example.com', message: '' },
    });

    // Offered with the conversational flag off too, for the same reason a
    // package answer is.
    expect(canonicalizeAssistantTurnResponse(complete, { conversationalOutcomesEnabled: false })).toEqual(complete);
  });

  it('canonicalizes a handoff into the strict union, defaulting an unknown kind to a person', () => {
    const booking = {
      tool: 'hand_off',
      args: { kind: 'booking', packageId: 'p-bali', message: 'On the way.' },
    };
    expect(canonicalizeAssistantTurnResponse(booking, { conversationalOutcomesEnabled: true })).toEqual(booking);
    expect(assistantTurnResponseSchema.safeParse(booking).success).toBe(true);

    // The id is dropped rather than passed through as a number or an object:
    // the union requires a string, and the controller looks the id up in the
    // catalogue, so a malformed one must not fail the whole turn. The kind
    // survives as booking — canonicalization guarantees the shape, and the
    // controller is what degrades an unusable booking to the human handoff.
    expect(
      canonicalizeAssistantTurnResponse(
        { tool: 'hand_off', args: { kind: 'booking', packageId: 42, message: null } },
        { conversationalOutcomesEnabled: true },
      ),
    ).toEqual({ tool: 'hand_off', args: { kind: 'booking', message: '' } });
    // Any kind the model invents becomes the human handoff, which is the one
    // that needs no package and can therefore always be executed.
    expect(
      canonicalizeAssistantTurnResponse(
        { tool: 'hand_off', args: { kind: 'cancel_booking' } },
        { conversationalOutcomesEnabled: true },
      ),
    ).toEqual({ tool: 'hand_off', args: { kind: 'human', message: '' } });

    // Offered even with the conversational flag off, for the same reason a
    // package answer is: neither is a conversational outcome.
    expect(
      canonicalizeAssistantTurnResponse(booking, { conversationalOutcomesEnabled: false }),
    ).toEqual(booking);
  });

  it('carries navigate filters through, leaving range checks to routeParams', () => {
    const raw = {
      tool: 'navigate',
      args: { route: 'packages', message: 'Here you go.', destination: 'Dubai', priceMax: 1000 },
    };
    const canonical = canonicalizeAssistantTurnResponse(raw, { conversationalOutcomesEnabled: true });

    // Deliberately not slugged or range-checked here: routeParams.js owns that,
    // and it is also what drops a key the chosen route never declared. The
    // canonicalizer only has to guarantee the shape satisfies the union.
    expect(canonical).toEqual(raw);
    expect(assistantTurnResponseSchema.safeParse(canonical).success).toBe(true);
  });

  it('coerces a numeric string and drops a wrong-typed filter, so neither fails the whole turn', () => {
    const canonical = canonicalizeAssistantTurnResponse(
      {
        tool: 'navigate',
        args: {
          route: 'packages',
          message: '',
          destination: { name: 'Dubai' },
          priceMax: '1000',
          rating: 'five',
        },
      },
      { conversationalOutcomesEnabled: true },
    );

    expect(canonical).toEqual({ tool: 'navigate', args: { route: 'packages', message: '', priceMax: 1000 } });
    expect(assistantTurnResponseSchema.safeParse(canonical).success).toBe(true);
  });

  it('passes the capability mode through without the router gating travel_general needs', () => {
    const raw = { tool: 'respond_conversationally', args: { mode: 'capability', message: 'Untrusted copy' } };

    expect(canonicalizeAssistantTurnResponse(raw, { conversationalOutcomesEnabled: true })).toEqual({
      tool: 'respond_conversationally',
      args: { mode: 'capability' },
    });
    // Still capability when the router classified the turn as something else —
    // the copy is the server's, so there is nothing to qualify.
    expect(
      canonicalizeAssistantTurnResponse(raw, {
        conversationalOutcomesEnabled: true,
        routerIntent: 'ambiguous',
      }),
    ).toEqual({ tool: 'respond_conversationally', args: { mode: 'capability' } });
  });

  it('rejects unrecognized tools before controller dispatch', () => {
    expect(canonicalizeAssistantTurnResponse({ tool: 'send_email', args: {} }, { conversationalOutcomesEnabled: true })).toBeNull();
  });
});
