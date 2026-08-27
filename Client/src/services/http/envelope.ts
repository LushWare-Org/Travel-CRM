import { z, type ZodType } from 'zod';

// Backend envelope convention is split across services: auth/user/career
// reply `{ status: 'success', data }`; every other service replies
// `{ success: true, data }`. This normalizes both into one access pattern
// before validation, so every services/api/*.ts file has one convention
// to write against instead of re-checking which shape a given service uses.
const rawEnvelope = z
  .object({
    success: z.boolean().optional(),
    status: z.string().optional(),
    data: z.unknown().optional(),
    message: z.string().optional(),
    pagination: z.unknown().optional(),
  })
  .passthrough();

export interface ParsedEnvelope<T> {
  data: T;
  message?: string;
  pagination?: unknown;
}

/**
 * Validates and unwraps an axios response body against `dataSchema`.
 * Throws a descriptive Error (read by every existing catch block via
 * `.message`, same contract `http/client.ts`'s response interceptor
 * already establishes) on envelope mismatch, a non-success envelope, or a
 * `data` payload that fails `dataSchema` — surfacing backend contract
 * drift as a loud, traceable failure instead of a silently broken UI.
 */
export function parseEnvelope<T>(schema: ZodType<T>, raw: unknown, endpoint: string): ParsedEnvelope<T> {
  const envelope = rawEnvelope.safeParse(raw);
  if (!envelope.success) {
    throw new Error(`Malformed response envelope from ${endpoint}`);
  }
  const ok = envelope.data.success === true || envelope.data.status === 'success';
  if (!ok) {
    throw new Error(envelope.data.message || `Request to ${endpoint} did not succeed`);
  }
  const parsed = schema.safeParse(envelope.data.data);
  if (!parsed.success) {
    console.error(`[contract] ${endpoint} response failed validation`, parsed.error.issues);
    throw new Error(`Unexpected response shape from ${endpoint}`);
  }
  return { data: parsed.data, message: envelope.data.message, pagination: envelope.data.pagination };
}
