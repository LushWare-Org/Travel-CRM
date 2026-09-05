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
});

export const assistantTurnSchema = z.object({
  sessionId: z.string().min(1).max(255),
  messages: z.array(assistantMessageSchema).min(1).max(20),
  availableRoutes: z.array(availableRouteSchema).max(100),
});

// ─── Telemetry events ─────────────────────────────────────────
// Fire-and-forget from the client; eventType is a plain string enum here
// (NOT a Postgres enum) so new event types can be added without a migration.

export const ASSISTANT_EVENT_TYPES = ['impression', 'opened', 'turn', 'response', 'nav_click', 'error'];

export const recordEventSchema = z.object({
  sessionId: z.string().min(1).max(255),
  eventType: z.enum(ASSISTANT_EVENT_TYPES),
  tool: z.enum(['navigate', 'answer_faq_policy']).nullable().optional(),
  route: z.string().max(255).nullable().optional(),
});
