import { GoogleAuth } from 'google-auth-library';

// ─── Cloud Run domain-call auth ───────────────────────────────────────────
// Domain services are deployed with allow_unauthenticated = false, and
// infra/terraform/modules/deployment/iam.tf grants run.invoker to the gateway's
// service account plus the specific service-to-service grants this service
// needs (assistant-service → lead-service). Cloud Run rejects an unauthenticated
// call at the platform edge with a 403 BEFORE the container runs, so an outbound
// domain call must carry a Google-signed ID token whose audience is the target
// service's own URL.
//
// Mirrors Services/gateway/src/index.js's getAuthHeader, including the K_SERVICE
// guard: off Cloud Run (local development, tests) domain URLs are the plain
// http://localhost ones from .env and no token is minted. Without that guard a
// local run would try to reach the GCE metadata server.
//
// This is platform-level authentication only. The end-user's identity still
// travels as the forwarded x-user-* headers, so each domain service's own
// ownership/role checks decide access — see middleware/auth.js's
// forwardActorHeaders and docs/designs/management-context-copilot.md §"Adapters".
const googleAuth = new GoogleAuth();
const idTokenClients = new Map();

export async function domainAuthHeader(baseUrl) {
  if (!process.env.K_SERVICE) return {};
  if (!idTokenClients.has(baseUrl)) {
    idTokenClients.set(baseUrl, await googleAuth.getIdTokenClient(baseUrl));
  }
  const client = idTokenClients.get(baseUrl);
  const headers = await client.getRequestHeaders(baseUrl);
  // google-auth-library >= 10 (gaxios 7) returns a WHATWG `Headers` here, while
  // 9.x (gaxios 6) returned a plain object. Index access on the WHATWG object
  // yields undefined, which undici then serializes as the literal string
  // "undefined" — and Cloud Run rejects the request with "Authorization header
  // lacked OIDC mandated 'Bearer' prefix". The gateway is on 9.x and reads the
  // plain property; this service resolves 10.x through @google/genai, so read
  // both shapes.
  const authorization =
    typeof headers?.get === 'function' ? headers.get('authorization') : headers?.Authorization;
  if (!authorization) throw new Error(`Could not mint a Cloud Run ID token for ${baseUrl}`);
  return { Authorization: authorization };
}
