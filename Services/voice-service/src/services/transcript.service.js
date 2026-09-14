const MAX_INTAKE_MESSAGES = 40;
const MAX_CONTENT_CHARS = 2000;

const ROLE_MAP = { agent: 'assistant', assistant: 'assistant', user: 'user' };

export function toStoredTranscript(turns = []) {
  return turns
    .filter((t) => t && typeof t.content === 'string' && t.content.trim())
    .map((t, i) => ({
      sequence: i,
      role: ROLE_MAP[String(t.role).toLowerCase()] ?? 'user',
      content: t.content.trim(),
    }));
}

export function toIntakeTranscript(stored = [], { callId, startedAt }) {
  const base = startedAt instanceof Date ? startedAt.getTime() : Date.now();
  return stored
    .slice(-MAX_INTAKE_MESSAGES)
    .map((t) => ({
      id: `${callId}:${t.sequence}`,
      role: t.role,
      content: t.content.slice(0, MAX_CONTENT_CHARS),
      at: new Date(base + t.sequence * 1000).toISOString(),
    }));
}

export { MAX_INTAKE_MESSAGES };
