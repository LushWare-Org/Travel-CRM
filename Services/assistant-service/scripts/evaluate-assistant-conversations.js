// Drives every conversation in the corpus against the running assistant and
// reports the turns that did not do what the corpus says they should.
//
// Deliberately HTTP rather than in-process: the audit has to exercise what the
// browser exercises — request validation, the router, retrieval, the model,
// dispatch and the response envelope. Every failure that produced this file was
// a real envelope the browser saw and the unit tests did not.
//
//   npm run eval:conversations                    full audit
//   npm run eval:conversations -- --validate-only  corpus rows only, no model
//   npm run eval:conversations -- --workflow detail
//   npm run eval:conversations -- --id detail-intro
//
// Exit code 1 if any assertion failed or any request errored, so it works as a
// gate. Needs the services running and a working model; it is a manual gate, not
// a CI job, because it needs both.

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { HARD_RULES } from '../src/evaluation/toneRules.v1.js';
import { FALLBACK_POLICY_MESSAGE } from '@travel-crm/policy-retrieval';

const ARGUMENTS = process.argv.slice(2);
const hasFlag = (name) => ARGUMENTS.includes(name);
const flagValue = (name, fallback = null) => {
  const index = ARGUMENTS.indexOf(name);
  return index === -1 || index === ARGUMENTS.length - 1 ? fallback : ARGUMENTS[index + 1];
};

const validateOnly = hasFlag('--validate-only');
const workflowFilter = flagValue('--workflow');
const idFilter = flagValue('--id');
const baseUrl = flagValue('--base-url', process.env.EVAL_BASE_URL || 'http://localhost:3011').replace(/\/+$/, '');
const timeoutMs = Number(flagValue('--timeout', process.env.EVAL_TIMEOUT_MS || 45_000));
const corpusPath = resolve(flagValue('--corpus', 'evaluation/assistant-conversations.v1.jsonl'));

// ── The client's own route table ──────────────────────────────────────────
// A copy of Client/src/config/assistantRoutes.ts + the vocabulary
// assistantParamValues.ts derives from the live catalogue, because the server
// holds no route table of its own — the client offers it on every turn. Kept
// here as a fixture rather than fetched so the audit does not silently change
// shape when the client does, and so a mismatch shows up as a failing row
// rather than as an audit that quietly tested something else.
const DESTINATION_VALUES = ['uae', 'italy', 'japan', 'indonesia', 'maldives', 'sri-lanka', 'thailand'];

const AVAILABLE_ROUTES = [
  { name: 'home', path: '/', params: [] },
  {
    name: 'packages',
    path: '/packages',
    params: ['destination', 'category', 'priceMin', 'priceMax', 'durationMin', 'durationMax', 'rating', 'sort'],
    paramValues: {
      destination: [
        { value: 'uae', label: 'Dubai' },
        { value: 'italy', label: 'Europe (UK' },
        { value: 'japan', label: 'Japan' },
        { value: 'indonesia', label: 'Bali' },
        { value: 'maldives', label: 'Maldives' },
        { value: 'sri-lanka', label: 'Sri Lanka' },
        { value: 'thailand', label: 'Thailand' },
      ],
    },
  },
  { name: 'destinations', path: '/destinations-international', params: [] },
  { name: 'about', path: '/about', params: [] },
  { name: 'contact', path: '/contact', params: [] },
  { name: 'career', path: '/career', params: [] },
  { name: 'planner', path: '/planner', params: [] },
];

const ROUTE_PATHS = AVAILABLE_ROUTES.map((route) => route.path);

// ── Reviewed copy the server wrote, not the model ─────────────────────────
// The tone rules describe machine-SHAPED model prose. A constant a human wrote
// and a reviewer approved is not that, so a rule firing on one is reported as an
// exemption rather than a failure — and the exemption is printed, so a rule that
// starts matching real copy is visible rather than silently swallowed.
//
// This is a copy of assistant.controller.js's constants rather than an import,
// and it fails SAFE: a constant that drifts out of this list gets checked, which
// is stricter than intended, not looser.
const SERVER_OWNED_MESSAGES = new Set([
  FALLBACK_POLICY_MESSAGE,
  'Hi! I can help you explore destinations, find packages, navigate the site, or answer LushWare policy questions.',
  "You're welcome! If you need anything else for your trip, just ask.",
  'Safe travels! Come back anytime you need help planning your trip.',
  "No problem. Tell me what you're trying to do, and I'll help you find the right travel option or page.",
  'I can take you to any page on the site, filter the packages list by destination, budget, trip length and rating, and answer questions about LushWare policies. Try "packages in Dubai under 1000" or "what is your cancellation policy".',
  'I’m here to help with travel and LushWare trips. I can help you explore destinations, find packages, navigate the site, or answer a company-policy question.',
  'I can’t provide guidance on visas, entry requirements, health, safety, legal, emergency, or financial matters. Please check the relevant official authority or contact the LushWare team.',
  'I could not pick one for you from that. Tell me a destination, a budget or a trip length and I will show you what matches, or say "packages" to see them all.',
  'Our team can help with that. You can call, message on WhatsApp, or send the contact form — the contact page has all three.',
  "I can't take you there directly — try asking for a specific page, like packages or destinations.",
  "Sorry, I didn't quite catch that — could you rephrase?",
]);

// ── Corpus contract ───────────────────────────────────────────────────────
const expectationSchema = z.object({
  // A string, or the set of answers that would all be defensible. Used where
  // two behaviours are genuinely reasonable rather than to excuse a wrong one.
  tool: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  // Every value must appear in the resolved path. A list because a combined ask
  // carries more than one filter and the query order is the route's own.
  pathContains: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
  messageContains: z.array(z.string()).optional(),
  messageNotContains: z.array(z.string()).optional(),
  messageMatches: z.array(z.string()).optional(),
  messageNotMatches: z.array(z.string()).optional(),
  // Partial match against serverResult: objects match on the keys given, arrays
  // must be the same length and match element-wise. Deliberately not a subset
  // match on arrays, so "exactly one card, and it is this package" is
  // expressible.
  result: z.record(z.string(), z.unknown()).optional(),
  messageUnique: z.boolean().optional(),
  toneClean: z.boolean().optional(),
});

const conversationSchema = z.object({
  id: z.string().min(1),
  workflow: z.string().min(1),
  turns: z.array(z.object({ say: z.string().min(1), expect: expectationSchema })).min(1),
});

const matchesPartial = (actual, expected) => {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((entry, index) => matchesPartial(actual[index], entry))
    );
  }
  if (expected !== null && typeof expected === 'object') {
    return (
      actual !== null &&
      typeof actual === 'object' &&
      Object.entries(expected).every(([key, value]) => matchesPartial(actual[key], value))
    );
  }
  return actual === expected;
};

const postTurn = async (payload) => {
  const res = await fetch(`${baseUrl}/api/v1/assistant/turn`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${res.status} ${body?.message ?? 'request failed'}`);
  }
  return body?.data;
};

// Invariants that must hold on every turn, whatever the answer. The server
// enforces both, so a violation means the enforcement itself stopped working —
// which is worth failing the audit for even on a turn nothing else asserts.
const checkInvariants = (data) => {
  const failures = [];
  const path = typeof data?.serverResult?.path === 'string' ? data.serverResult.path : null;
  if (path) {
    const [routePath, query] = path.split('?');
    if (!ROUTE_PATHS.includes(routePath)) {
      failures.push({ assertion: 'invariant:route-is-offered', expected: ROUTE_PATHS, actual: routePath });
    }
    const destination = new URLSearchParams(query ?? '').get('destination');
    if (destination && !DESTINATION_VALUES.includes(destination)) {
      failures.push({
        assertion: 'invariant:destination-is-real',
        expected: DESTINATION_VALUES,
        actual: destination,
      });
    }
  }
  // A uuid in prose is normally an internal identifier the visitor cannot use —
  // a catalogue id, which is the leak this checks for. The exception is the
  // booking reference, which the server quotes on purpose so the visitor has
  // something to follow up with, so it is subtracted before the check.
  const bookingReference =
    typeof data?.serverResult?.booking?.bookingId === 'string' ? data.serverResult.booking.bookingId : null;
  const uuids = (data?.message ?? '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [];
  const leaked = uuids.filter((id) => id !== bookingReference);
  if (leaked.length) {
    failures.push({
      assertion: 'invariant:no-record-id-in-message',
      expected: 'no record id in prose',
      actual: `${leaked.join(', ')} in: ${data.message}`,
    });
  }
  return failures;
};

const checkTurn = ({ expectation, data, previousAssistantMessages, exemptions }) => {
  const failures = [];
  const message = typeof data?.message === 'string' ? data.message : '';
  const serverResult = data?.serverResult ?? {};
  const tool = data?.toolCall?.tool;

  const tools = Array.isArray(expectation.tool) ? expectation.tool : [expectation.tool];
  if (!tools.includes(tool)) failures.push({ assertion: 'tool', expected: tools, actual: tool });

  if (expectation.pathContains !== undefined) {
    const path = typeof serverResult.path === 'string' ? serverResult.path : '';
    const needles = Array.isArray(expectation.pathContains) ? expectation.pathContains : [expectation.pathContains];
    for (const needle of needles) {
      if (!path.includes(needle)) {
        failures.push({ assertion: 'pathContains', expected: needle, actual: path || null });
      }
    }
  }
  for (const needle of expectation.messageContains ?? []) {
    if (!message.toLowerCase().includes(needle.toLowerCase())) {
      failures.push({ assertion: 'messageContains', expected: needle, actual: message });
    }
  }
  for (const needle of expectation.messageNotContains ?? []) {
    if (message.toLowerCase().includes(needle.toLowerCase())) {
      failures.push({ assertion: 'messageNotContains', expected: `not ${needle}`, actual: message });
    }
  }
  for (const source of expectation.messageMatches ?? []) {
    if (!new RegExp(source, 'i').test(message)) {
      failures.push({ assertion: 'messageMatches', expected: source, actual: message });
    }
  }
  for (const source of expectation.messageNotMatches ?? []) {
    if (new RegExp(source, 'i').test(message)) {
      failures.push({ assertion: 'messageNotMatches', expected: `no match for ${source}`, actual: message });
    }
  }
  for (const [key, value] of Object.entries(expectation.result ?? {})) {
    if (!matchesPartial(serverResult[key], value)) {
      failures.push({ assertion: `serverResult.${key}`, expected: value, actual: serverResult[key] ?? null });
    }
  }
  if (expectation.messageUnique && previousAssistantMessages.includes(message)) {
    failures.push({
      assertion: 'messageUnique',
      expected: 'a reply that differs from every earlier one in this conversation',
      actual: message,
    });
  }

  if (expectation.toneClean !== false && message) {
    const violations = HARD_RULES.filter((rule) => rule.pattern.test(message));
    if (violations.length && SERVER_OWNED_MESSAGES.has(message)) {
      for (const rule of violations) exemptions.push({ rule: rule.id, message });
    } else {
      for (const rule of violations) {
        failures.push({ assertion: `tone:${rule.id}`, expected: rule.why, actual: message });
      }
    }
  }

  return failures;
};

// ── Load and validate ─────────────────────────────────────────────────────
const raw = await readFile(corpusPath, 'utf8');
const allRows = raw
  .split('\n')
  .filter(Boolean)
  .map((line, index) => {
    try {
      return conversationSchema.parse(JSON.parse(line));
    } catch (err) {
      throw new Error(`Invalid corpus row ${index + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

const rows = allRows.filter(
  (row) => (!workflowFilter || row.workflow === workflowFilter) && (!idFilter || row.id === idFilter),
);

const countByWorkflow = (list) =>
  list.reduce((counts, row) => {
    counts[row.workflow] = (counts[row.workflow] ?? 0) + 1;
    return counts;
  }, {});

if (validateOnly) {
  console.log(
    JSON.stringify(
      {
        valid: true,
        corpusPath,
        conversations: allRows.length,
        turns: allRows.reduce((total, row) => total + row.turns.length, 0),
        byWorkflow: countByWorkflow(allRows),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (!rows.length) {
  console.error(`No corpus rows matched${workflowFilter ? ` --workflow ${workflowFilter}` : ''}.`);
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────
const failures = [];
const exemptions = [];
const results = [];

for (const row of rows) {
  const sessionId = `eval-${row.id}-${Date.now()}`;
  const messages = [];
  const shownPackageIds = [];
  const previousAssistantMessages = [];
  const turns = [];
  let errored = false;

  for (const [index, turn] of row.turns.entries()) {
    messages.push({
      id: `${row.id}-${index}`,
      role: 'user',
      content: turn.say,
      at: new Date().toISOString(),
    });
    // The wire caps `messages` at 20, and this array grows by two per turn. The
    // window is only the store's fallback now, so trimming it to the client's own
    // limit keeps a long conversation valid instead of failing it as a 400 that
    // looks like a corpus bug.
    const window = messages.slice(-20);

    let data;
    try {
      data = await postTurn({ sessionId, messages: window, availableRoutes: AVAILABLE_ROUTES, shownPackageIds });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      failures.push({ id: row.id, turn: index + 1, say: turn.say, assertion: 'request', expected: '200', actual: detail });
      turns.push({ say: turn.say, error: detail });
      errored = true;
      break;
    }

    const turnFailures = [
      ...checkTurn({ expectation: turn.expect, data, previousAssistantMessages, exemptions }),
      ...checkInvariants(data),
    ];
    for (const failure of turnFailures) failures.push({ id: row.id, turn: index + 1, say: turn.say, ...failure });

    const message = typeof data?.message === 'string' ? data.message : '';
    previousAssistantMessages.push(message);
    messages.push({
      id: `${row.id}-${index}-a`,
      role: 'assistant',
      content: message || '...',
      at: new Date().toISOString(),
    });

    // The browser accumulates the ids of the cards it has drawn, and the server
    // reads that list to decide whether a package is new to the visitor. Doing
    // the same here is what makes a follow-up turn a follow-up.
    if (data?.serverResult?.present === true && Array.isArray(data.serverResult.packages)) {
      for (const pkg of data.serverResult.packages) {
        if (typeof pkg?.id === 'string') shownPackageIds.push(pkg.id);
      }
    }

    turns.push({ say: turn.say, tool: data?.toolCall?.tool ?? null, message, serverResult: data?.serverResult ?? null, failures: turnFailures });
    if (turnFailures.length) break;
  }

  results.push({ id: row.id, workflow: row.workflow, errored, turns });
}

const passedConversations = results.filter((result) => result.turns.every((turn) => !turn.failures?.length) && !result.errored);

const byWorkflow = {};
for (const result of results) {
  const entry = (byWorkflow[result.workflow] ??= { conversations: 0, passed: 0, failed: 0 });
  entry.conversations += 1;
  if (passedConversations.includes(result)) entry.passed += 1;
  else entry.failed += 1;
}

console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl,
      corpusPath,
      conversations: results.length,
      turns: results.reduce((total, result) => total + result.turns.length, 0),
      passed: passedConversations.length,
      failed: results.length - passedConversations.length,
      byWorkflow,
      failures,
      exemptions,
      results,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;
