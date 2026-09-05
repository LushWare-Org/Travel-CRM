import httpClient from '../http/client';

// Fire-and-forget telemetry for the site-wide assistant (the design doc's
// Telemetry Contract). The client never blocks a model turn on these and
// never surfaces an event failure to the user — impression/opened/turn/
// response/nav_click/error are best-effort signals into assistant-service's
// ingest endpoint, so every failure is swallowed here (and only logged during
// local development, where it is a useful integration warning). The response
// is a trivial { success } envelope, so no zod round-trip validation.
//
// 401s must not bounce the visitor to /login either — this endpoint is
// public and unauthenticated, but if the http client's interceptor ever
// treats it as an auth attempt this helper still must not throw.
export type AssistantEventType = 'impression' | 'opened' | 'turn' | 'response' | 'nav_click' | 'error';
export type AssistantEventTool = 'navigate' | 'answer_faq_policy' | null;

export interface AssistantEventPayload {
  sessionId: string;
  eventType: AssistantEventType;
  tool: AssistantEventTool;
  route: string | null;
}

export const sendAssistantEvent = async (payload: AssistantEventPayload): Promise<void> => {
  try {
    await httpClient.post('/assistant/events', payload);
  } catch (err) {
    // Telemetry must never visibly break anything: no throw, and no console
    // noise outside local development.
    if (import.meta.env.DEV) {
      console.warn('[assistant-events] failed to send event', err);
    }
  }
};
