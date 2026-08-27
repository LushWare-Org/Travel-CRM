import { getToken } from './auth-helper.js';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000/api/v1';

let requestCounter = 0;
const nextRequestId = () => `e2e-${process.env.E2E_RUN_ID || 'local'}-${++requestCounter}`;

async function request(method, path, { role, body, headers = {} } = {}) {
  const finalHeaders = {
    'Content-Type': 'application/json',
    // This repo's correlation-ID convention (CLAUDE.md's Logging section) —
    // makes a failing E2E run traceable through each service's logs.
    'x-request-id': nextRequestId(),
    ...headers,
  };
  if (role) {
    finalHeaders.Authorization = `Bearer ${await getToken(role)}`;
  }

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON body (e.g. a plaintext rate-limit response) — surface it
      // as-is rather than crashing the caller with a JSON.parse error.
      json = { message: text };
    }
  }
  return { status: res.status, ok: res.ok, body: json };
}

export const apiClient = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, opts) => request('POST', path, opts),
  put: (path, opts) => request('PUT', path, opts),
  patch: (path, opts) => request('PATCH', path, opts),
  delete: (path, opts) => request('DELETE', path, opts),
};
