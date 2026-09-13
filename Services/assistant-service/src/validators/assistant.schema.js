import { z } from 'zod';

// ─── Assistant turn ───────────────────────────────────────────
// Wire shape mirrors wizard-turn's WizardTurnMessage/WizardTurnRequest
// (Client/src/services/api/wizardTurn.ts) for id/role/content/at, with
// sessionId REQUIRED (every assistant session is anonymous but distinct)
// plus the client-owned navigation allowlist sent per request — the single
// source of truth for which routes the model may name (never a
// server-held route table).

export const assistantMessageSchema = z.object({
  id: z.string().min(1).max(255),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
  at: z.string().datetime(),
});

export const availableRouteSchema = z.object({
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(500),
  // Query keys this page honours, declared client-side and sent per turn. The
  // server holds no copy of that list, which is what stops the two drifting —
  // and it MUST be declared here, because this schema validates the request
  // body and zod strips unknown keys, so an undeclared field would never reach
  // the controller and every navigation would silently go unfiltered.
  params: z.array(z.string().max(40)).max(20).optional(),
  // The closed set of values each filter may take — the destinations that
  // actually exist, as `{ value, label }` pairs. The label is what a person
  // would say, the value is what the URL takes, so the server can match the
  // visitor's words without the client having to guess how the model phrases
  // things. Declared here for the same reason `params` is: this schema
  // validates the request body, and zod strips what it does not know.
  paramValues: z
    .record(
      z.string().max(40),
      z.array(z.object({ value: z.string().min(1).max(60), label: z.string().max(120) })).max(200),
    )
    .optional(),
});

export const assistantTurnSchema = z.object({
  sessionId: z.string().min(1).max(255),
  messages: z.array(assistantMessageSchema).min(1).max(20),
  availableRoutes: z.array(availableRouteSchema).max(100),
  // Which package cards the client has already drawn. The server is stateless,
  // so this is the only way it can tell a package the visitor is hearing about
  // for the first time from one it has already been shown — and it MUST be
  // declared here, because this schema validates the request body and zod
  // strips unknown keys. Its only effect is whether a card is drawn: it gates
  // no data and no permission.
  shownPackageIds: z.array(z.string().max(64)).max(200).optional(),
});

// ─── Telemetry events ─────────────────────────────────────────
// Fire-and-forget from the client; eventType is a plain string enum here
// (NOT a Postgres enum) so new event types can be added without a migration.

export const ASSISTANT_EVENT_TYPES = ['impression', 'opened', 'turn', 'response', 'nav_click', 'error'];

export const recordEventSchema = z
  .object({
    sessionId: z.string().min(1).max(255),
    turnId: z.string().min(1).max(255).nullable().optional(),
    eventType: z.enum(ASSISTANT_EVENT_TYPES),
    tool: z
      .enum([
        'navigate',
        'answer_faq_policy',
        'answer_packages',
        'hand_off',
        'request_booking',
        'respond_conversationally',
        'redirect_off_topic',
      ])
      .nullable()
      .optional(),
    route: z.string().max(255).nullable().optional(),
  })
  .strict();
