import crypto from 'node:crypto';
import { z } from 'zod';
import AppError from '../utils/appError.js';
import { BAD_REQUEST, NOT_IMPLEMENTED } from '../constants/httpStatus.js';

// ─── Action seam ──────────────────────────────────────────────────────────
// The infrastructure an action needs, without any action that writes.
//
// An insight may carry a declarative `action` descriptor (see
// `docs/designs/actionable-insight-ranking-and-quality-gate.md` §5). Nothing
// here executes a mutation: every path in this module is either pure or a
// dry run. The seam exists so the later write path is a new executor plus a
// confirmation handler, not a redesign of the insight contract.
//
//   descriptor  what the insight says should happen, as data
//        ↓  validateActionDescriptor (strict; an unknown kind is a 400)
//   preview     what WOULD happen, in plain language, plus whether it needs
//               confirmation and the key that makes a re-confirm a no-op
//        ↓  applyAction({ dryRun: true })   ← the only mode that exists today
//   result      the preview again; no network call, no write, no side effect
//
// State machine, for the client and the later executor:
//
//   proposed → previewed → confirmed → applied
//                └──────────────────────→ cancelled
//
// `applied` is unreachable in this module. That is deliberate: it is the
// single line a future PR has to change, and everything around it (validation,
// idempotency, audit shape) already exists so that change stays small.

// Entity kinds mirror the insight `entityRef` kinds. A record action points at
// one row; a group action points at a grouping (for example leads by
// destination); a collection action points at a whole source on a page.
export const entityRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('record'), id: z.string().min(1).max(255) }).strict(),
  z.object({ kind: z.literal('group'), id: z.string().min(1).max(512) }).strict(),
  z.object({ kind: z.literal('collection'), id: z.string().min(1).max(512) }).strict(),
]);

// Kinds are closed on purpose. `navigate` is the only one that can be honoured
// today; the rest are declared so a descriptor authored now is still valid
// when its executor lands, and so an unknown kind fails at the boundary rather
// than reaching a switch statement as an unhandled case.
export const ACTION_KINDS = Object.freeze([
  'navigate',
  'assign',
  'draft_message',
  'schedule_followup',
  'record_payment',
]);

// Whether a kind changes data. Declared per KIND rather than per executor, so a
// preview for a write that has no executor yet still says it needs
// confirmation. Deriving it from the executor would report the first real write
// as harmless.
const MUTATING_KINDS = new Set(['assign', 'draft_message', 'schedule_followup', 'record_payment']);

export const ACTION_STATES = Object.freeze([
  'proposed',
  'previewed',
  'confirmed',
  'applied',
  'cancelled',
]);

// Executors are registered per kind. Only `navigate` has one, and it is a dry
// run: it resolves the target's route so the client can move focus, and it
// touches nothing. Every other kind is a named NOT_IMPLEMENTED rather than a
// silent no-op, because a silent no-op is how a write path ships half done.
const EXECUTORS = new Map([
  [
    'navigate',
    {
      mutates: false,
      describe: (descriptor) => `Go to ${descriptor.target.kind} ${descriptor.target.id}`,
      run: (descriptor) => ({ focused: descriptor.target.id }),
    },
  ],
]);

export const actionDescriptorSchema = z
  .object({
    kind: z.enum(ACTION_KINDS),
    verb: z.string().min(1).max(64),
    target: entityRefSchema,
    params: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

/**
 * Strict parse of a model- or descriptor-authored action. Returns the parsed
 * descriptor or throws a 400 naming the field that failed, so a malformed
 * action never reaches an executor as a partial object.
 */
export function validateActionDescriptor(raw) {
  const parsed = actionDescriptorSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new AppError(
      `Invalid action descriptor: ${parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'} ${i.message}`)
        .join('; ')}`,
      BAD_REQUEST,
    );
  }
  return parsed.data;
}

/**
 * Stable identity for one intended action, so confirming twice applies once.
 * Derived from actor, scope and target rather than from a clock, which is what
 * makes it stable across a retry and different between two operators acting on
 * the same record.
 */
export function actionIdempotencyKey({ actorId, pageKey, scopeFingerprint, descriptor }) {
  const canonical = JSON.stringify({
    actorId: actorId ?? '',
    pageKey: pageKey ?? '',
    scopeFingerprint: scopeFingerprint ?? '',
    kind: descriptor.kind,
    verb: descriptor.verb,
    target: descriptor.target,
    params: descriptor.params ?? {},
  });
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

/**
 * What WOULD happen. Pure: no clock read, no network, no mutation, so it can be
 * called twice for the same inputs and produce byte-identical output.
 */
export function buildPreview({ descriptor, actorId, pageKey, scopeFingerprint, state = 'proposed' }) {
  const executor = EXECUTORS.get(descriptor.kind);
  const summary = executor
    ? executor.describe(descriptor)
    : `Would ${descriptor.verb} ${descriptor.target.kind} ${descriptor.target.id} (not implemented yet)`;

  return {
    actionId: actionIdempotencyKey({ actorId, pageKey, scopeFingerprint, descriptor }),
    state,
    kind: descriptor.kind,
    verb: descriptor.verb,
    target: descriptor.target,
    summary,
    // A mutating action always needs confirmation, whether or not an executor
    // exists for it yet. A navigation never does.
    requiresConfirmation: MUTATING_KINDS.has(descriptor.kind),
    // Named explicitly so no caller has to infer it from the kind list.
    implemented: Boolean(executor),
  };
}

/**
 * The only execution path that exists. `dryRun` defaults to true and the
 * non-dry branch throws, so a future PR cannot accidentally enable writes by
 * passing a flag: it has to add an executor and change this function.
 */
export function applyAction({
  descriptor: rawDescriptor,
  actorId,
  pageKey,
  scopeFingerprint,
  dryRun = true,
}) {
  const descriptor = validateActionDescriptor(rawDescriptor);
  const preview = buildPreview({ descriptor, actorId, pageKey, scopeFingerprint });

  if (dryRun) return { ...preview, applied: false };

  const executor = EXECUTORS.get(descriptor.kind);
  if (!executor) {
    throw new AppError(
      `Action kind '${descriptor.kind}' has no executor; the seam is dry-run only`,
      NOT_IMPLEMENTED,
    );
  }
  throw new AppError('Action execution is not enabled in this release', NOT_IMPLEMENTED);
}

/**
 * The audit record shape a confirmed action will write. Exported now so the
 * decision log can adopt it without a second migration when writes land, and so
 * tests can assert the shape is stable.
 */
export function buildAuditRecord({ descriptor, actorId, pageKey, scopeFingerprint, decision }) {
  const record = {
    actionId: actionIdempotencyKey({ actorId, pageKey, scopeFingerprint, descriptor }),
    actorId: actorId ?? null,
    pageKey: pageKey ?? null,
    kind: descriptor.kind,
    verb: descriptor.verb,
    target: descriptor.target,
    decision,
    at: new Date().toISOString(),
  };
  return record;
}
