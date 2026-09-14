# Travel CRM

Monorepo with two React frontends (Client + Management), an API gateway, and 12 Express/Prisma microservices behind it. The `Server/` directory is the legacy Express/MongoDB monolith being migrated away from.

## Architecture

```
Client (React/Vite :5173) ──┐
Management (React/Vite :5174) ─┤─→ Gateway (:3000) ──→ microservices (:3001–:3012)
                                                                └── Server legacy (:5000, MongoDB)
```

| Service | Port | DB |
|---|---|---|
| Gateway (reverse proxy) | 3000 | — |
| auth-service | 3001 | Prisma/PostgreSQL |
| user-service | 3002 | Prisma/PostgreSQL |
| package-service | 3003 | Prisma/PostgreSQL |
| lead-service | 3004 | Prisma/PostgreSQL |
| booking-service | 3005 | Prisma/PostgreSQL |
| billing-service | 3006 | Prisma/PostgreSQL |
| career-service | 3007 | Prisma/PostgreSQL |
| notification-service | 3008 | pg (raw) |
| analytics-service | 3009 | pg (raw) |
| flight-service | 3010 | Prisma/PostgreSQL |
| assistant-service | 3011 | Prisma/PostgreSQL |
| voice-service | 3012 | Prisma/PostgreSQL |
| Server (legacy monolith) | 5000 | MongoDB/Mongoose |

Gateway handles JWT verification, rate limiting, CORS, and downstream CORS-stripping. Public routes: auth, GET packages/reviews/itineraries, contact forms, career applications, webhooks, site-wide assistant turn/events.

## Commands

Each service has its own `package.json` — there is no root workspace. Commands must be run from within the service directory.

### Frontends
- **Client:** `cd Client && npm run dev` (Vite default :5173)
- **Management:** `cd Management && npm run dev` (fixed :5174)

### Backend (every service)
- **Start dev:** `cd Services/<name> && npm run dev` (nodemon with hot reload)
- **Start prod:** `cd Services/<name> && npm start`

### Assistant intent-router dark launch
- **Validate the checked-in corpus without calling Gemini:** `cd Services/assistant-service && npm run eval:router -- --validate-only`. The default `evaluation/assistant-router.synthetic.v1.jsonl` corpus is for development and safety fixtures only; synthetic rows never count as production enablement evidence.
- **Run a live replay only with an approved, already-sanitized corpus:** `cd Services/assistant-service && npm run eval:router -- evaluation/<corpus>.jsonl`. Each row makes one Gemini request using `GEMINI_ROUTER_MODEL`, a 1.5-second timeout, and no retry. The live replay is currently blocked by the provider's 5 RPM quota and this timeout budget, so an incomplete replay cannot authorize rollout.
- **Keep all router gates disabled by default:** `ASSISTANT_CONVERSATIONAL_OUTCOMES_ENABLED`, `ASSISTANT_ROUTER_SOCIAL_ENABLED`, and `ASSISTANT_ROUTER_OFF_TOPIC_ENABLED` must remain `false`. The social and off-topic classes are independent gates with a `0.95` confidence threshold; enable either only after at least 50 `real_sanitized` direct-response examples for that class pass every precision, confidence, data, and zero-leak safety gate.
- **Apply the assistant telemetry migration before deploying the service:** `cd Services/assistant-service && npm run db:migrate:deploy`.


### Database (Prisma services)
- **Generate client:** `cd Services/<name> && npm run db:generate`
- **Push schema (local/dev only):** `cd Services/<name> && npm run db:push`
- **Migrate — local dev:** `cd Services/<name> && npm run db:migrate` (`prisma migrate dev`, interactive, can reset drift — only ever run this against a local/disposable database, never the shared remote one)
- **Migrate — apply pending (safe, non-interactive):** `cd Services/<name> && npm run db:migrate:deploy`, or `node Services/migrate-all.mjs` to apply pending migrations across every service in one pass
- **Migrate status:** `cd Services/<name> && npm run db:migrate:status`
- **Studio:** `cd Services/<name> && npm run db:studio`

**Shared database, per-service schemas:** all 10 Prisma services (auth, user, package, lead, booking, billing, career, flight, assistant, voice) connect to the **same physical Postgres database** (one Supabase instance) — each just owns its own Postgres schema namespace (`crm_auth`, `crm_billing`, `crm_flights`, etc.) via `@@schema(...)`. Because of this, Prisma's `_prisma_migrations` bookkeeping table is shared: running `prisma migrate status` inside any one service will list every other service's migration names too — that's expected, not drift. `migrate deploy`/`migrate status` only ever act on the migrations declared in that service's own `prisma/migrations/` folder, so this is safe to ignore. Never run `prisma migrate dev` against this shared remote database — use `db:migrate:deploy` (or `migrate-all.mjs`) instead, which only ever applies pending migrations and never resets/drops anything.

### Voice agent (Retell AI)
- **Service:** `cd Services/voice-service && npm run dev` (:3012). Webhooks are proxied from the gateway at `/api/v1/webhooks/voice/*` — mounted **before** the catch-all `/webhooks` → notification-service route, which Express would otherwise match first.
- **Signature verification is mandatory in every environment.** `RETELL_WEBHOOK_SECRET` must be set or the webhooks return 503; there is deliberately no non-production bypass, because these routes are on the gateway's public allowlist. Verification uses `retell-sdk`'s own signer (`v=<timestamp>,d=<hmac of body+timestamp>` with a 5-minute replay window) — never hand-roll this, a plain HMAC over the body alone silently fails every real Retell webhook.
- **Apply the voice schema before deploying:** `cd Services/voice-service && npm run db:migrate:deploy`.
- **The agent never commits.** It may read and prepare reversible draft state; applying pricing, sending quotations, booking flights/hotels, and any status transition past `NEW` are rep-only. Flight prices are never spoken at all — Duffel offers expire, so a spoken fare is stale on arrival. See `docs/designs/voice-sales-agent.md` for the full capability tiers.
- **The agent's script lives in `docs/voice-agent-prompt.md`, not the Retell dashboard.** Edit it there, then push it live with `cd Services && node setup-voice-agent.mjs --apply` (omit `--apply` to preview). The script refuses to push a prompt that has lost its safety rules (never speak a price, never speak a flight fare, never look someone up).
- **The published number is set by hand, once, and changed the same way** — there is deliberately no admin UI for it. Set `RETELL_PHONE_NUMBER`/`RETELL_AGENT_ID` in `voice-service/.env`, then `cd Services && node setup-voice-number.mjs` to register it (this writes immediately — there is no dry run for this one); `--show` lists what's currently registered without changing anything. Only one number is ever active; registering a new one deactivates the previous one without deleting its call history.
- **A promised callback is not just a lead flag — the sales team is emailed.** Every voice-originated lead lands `needsRepFollowup: true` unless the agent's `needs_rep_followup` analysis field says otherwise (absence defaults to `true` — an extra email costs nothing, an unkept promise costs a customer). See `Services/voice-service/src/services/notify.service.js`.
- **One number can't flood the pipeline.** `VOICE_MAX_CALLS_PER_NUMBER_PER_DAY` (default 20) caps how many calls from one number this service acts on per rolling 24h. Retell's inbound webhook has no documented way to refuse a call already ringing, so the call is still answered — but past the cap this service stops forwarding it into lead-service/notification-service. The call itself is still fully recorded for audit.
- **The agent has seven live in-call tools** (`search_packages`, `get_trip_status`, `get_payment_status`, `attach_package`, `adjust_itinerary`, `preview_price`, `resend_document`), each its own Retell CustomTool mounted at `/api/v1/webhooks/voice/fn/<name>` — see `Services/voice-service/src/routes/tool.routes.js` and `Services/voice-service/src/controllers/toolDispatch.controller.js`. Every handler resolves the acting lead from the **active call's own database row**, never from a tool-call argument — an id in `args` is exactly as attacker-reachable as a spoken name (see the IDOR note atop `leadIntake.controller.js`). A brand-new caller has no Lead row until post-call intake, so the lead-bound tools only do anything for a returning, already-matched caller.
  - **Auth is a shared secret this repo defines itself** (`RETELL_TOOL_SECRET`, falls back to `RETELL_WEBHOOK_SECRET`), sent via the Retell CustomTool's own documented `headers` field — **not** the same signature scheme as the two lifecycle webhooks. Retell's SDK does not document an equivalent signature for tool-call webhooks the way it documents the lifecycle ones; do not assume one.
  - **The exact envelope Retell sends when invoking a tool is unverified against a real call.** `extractToolContext()` in `toolDispatch.controller.js` is written defensively against the documented `CustomTool` shape, but only the two lifecycle webhooks (inbound/post-call) have been confirmed against real captured Retell requests. Confirm tool calls on the first real test call — see `docs/voice-agent-prompt.md`'s "First real call" section.
  - **`preview_price` and `get_payment_status` never let a figure reach the LLM.** `preview_price`'s response omits the computed numbers entirely — a stronger guarantee than a prompt instruction, since even a prompt failure can't leak a number that was never sent back. `get_payment_status` only returns figures when `LeadPackageSelection.currentQuoteId` is set (a quote already reached the customer); this gate lives in lead-service, not the prompt.
  - **Retell fires more than one event to the post-call webhook URL** — confirmed live via Retell's own Test webhook button, which sent a `call_started` event (real `call_id`, empty transcript) before any `call_analyzed` event. `handlePostCall` branches on `event: 'call_started'` to adopt the pending row's real call id immediately, which is what makes tool calls resolvable mid-conversation — without it, `VoiceCall.retellCallId` would only get its real value at call end, long after any live tool call needed it.
  - **`VoiceCallEvent.sequence` is a 32-bit Postgres `Int`.** Derive it from a per-call count (`prisma.voiceCallEvent.count(...)`), never from `Date.now()` or any millisecond-epoch value — a `Date.now()`-derived sequence silently overflows Int32 and every insert fails. This exact bug shipped once and was caught only by checking the database directly after a live tool call, not by unit tests (the write was wrapped in a bare `.catch(() => {})`) — never swallow a Prisma write's rejection without at least logging it.
- **Resending a document reuses the exact send path a rep uses, gated on "already sent at least once.​"** All four types have a `POST /api/v1/billing/{quotations|invoices|receipts|vouchers}/:id/resend-voice` (internal-token gated, same convention as quotation's existing `/from-lead` route), each 409ing if the document was never sent — a voice call can never be the first channel something goes out through. Each sends to every channel the customer has on file (email **and** WhatsApp) rather than requiring a channel choice, since a voice caller has no UI to pick one. The agent does not choose a type: `GET /api/v1/billing/internal/leads/:leadId/latest-document` returns whichever type was most recently sent (no figures in that response), and `resend_document` resends that one. Note the real mount prefix is `/api/v1/billing/...` — billing-service mounts nothing at the shorter `/api/v1/quotations/...` path except a legacy `/invoices` alias.
  - **`Voucher` has no `sentAt` column** — it tracks `emailSent`/`whatsappSent` flags only, so its "already sent" gate and its recency sort both differ from the other three. Check the model before assuming a shared shape.
- **A voice-agent itinerary edit leaves a review card for the rep.** `LeadPackageSelection.pendingAiChange` holds `{before, after, summary, changedAt}` for the most recent AI edit; Management renders it in the lead's AI tab with Approve / Discard. **Approve** (`POST /leads/:id/packages/:selectionId/approve-ai-change`) only clears the flag — it deliberately does not send an updated quotation, because fusing the two would let one click push a new figure to a customer without the rep seeing the pricing screen. **Discard** is the existing refresh-from-package action, which clears the same flag by reverting the draft.
  - **The snapshot write happens AFTER the itinerary write commits, and must never fail the request.** `applyLeadSelectionItinerary` has already deleted and recreated every day by then; throwing afterwards tells the agent the edit did not happen when it did, and a retry applies it twice. This was observed for real — a stale Prisma client made the snapshot write throw, the agent saw a 500, and the retry produced 7 nights from a 3-night trip that should have become 5. The bookkeeping after that call is best-effort and logged, and the response carries `reviewCardSaved` so a failure is visible rather than silent.
- **`npm install` in `voice-service` needs `--legacy-peer-deps` on a clean tree** (npm 10.8.3 crashes resolving vitest's peer set); once `package-lock.json` exists a plain `npm install` works.

### Testing
- **Flight service:** `cd Services/flight-service && npm test` (vitest), `npm run test:watch`, `npm run test:coverage`, `npm run test:unit`, `npm run test:integration`
- **Voice service:** `cd Services/voice-service && npm test` (vitest)
- **Server (legacy):** `cd Server && npm test` (jest), `npm run test:watch`, `npm run lint`

### Seed / scripts
- `cd Services && node migrate-all.mjs` — apply pending migrations across all 10 Prisma services in one pass (safe to re-run; no-ops when nothing's pending)
- `cd Services && node seed.mjs` — seed PostgreSQL databases
- `cd Services && node seed-extended.mjs` — extended seed
- `cd Services && node update-passwords.mjs` — password migration
- `cd Server && npm run seed` — seed MongoDB

## Code Conventions

- All services use **ES Modules** (`"type": "module"`), CommonJS `require()` is not valid
- Backend pattern: `src/index.js` entry → Express app → route files in `src/routes/`
- Gateway is the single entry point for all API traffic — never call backend services directly from the frontend
- All API routes are prefixed `/api/v1/`
- Use `zod` for input validation (already a root dependency)
- Environment files: `.env` per service, never commit real credentials
- **Git commits:** All commits must include this trailer at the end of the message, naming whichever model actually produced the commit — `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Exception: the first commit of a session is user-only, no `Co-Authored-By` line.

## Logging

- Use **structured JSON logging** via `pino` (already a root dependency) — never `console.log` in production code
- Every log line must include a **correlation ID** (`requestId`) propagated across service boundaries via the gateway's `x-request-id` header
- **Sanitize PII** before logging: redact passwords, tokens, full emails (keep `***@domain`), credit card numbers
- Log at the right level: `debug` for detailed tracing (off in prod), `info` for normal operations, `warn` for recoverable issues, `error` for failures needing attention
- Never log inside tight loops or log raw request bodies without sanitization

## Validation

- **Every API input must be validated** with a Zod schema before processing — no exceptions for internal endpoints
- Validate at the boundary: controllers/route handlers parse with Zod immediately, not deep in business logic
- Use **whitelist validation** (allow known-safe patterns), never blacklist
- File uploads must validate: size limit, allowed MIME types, extension whitelist
- Error messages must not leak internal state — return generic messages to clients, log details server-side

## Testing

- **Every new feature or bugfix requires tests.** Do not skip this.
- **Browser E2E (Playwright) is used, scoped to `Management/` only.** Client stays unit/integration-tested only — no Playwright there. Management E2E lives in `Management/e2e/`, runs via `npm run test:e2e` (`playwright test`), and covers RBAC/auth plus the core lead → quotation → invoice → payment → voucher workflow — keep it narrow (critical journeys, not exhaustive coverage); push edge cases down to unit/component tests.
- **Backend cross-service API E2E is used**, in `Services/e2e-tests/`, driving real HTTP calls through the Gateway (`:3000`) against a fully running local microservices stack — real JWTs from real `/auth/login` calls, no mocked Prisma/pg, no injected `x-user-*` headers. Run with `cd Services/e2e-tests && npm test`. Requires the full stack up (`cd Services && npm run dev`) and must never point at a production URL or database — see the safety guard in that suite's `global-setup.js`. Every record the suite creates must be tagged with a per-run marker and cleaned up in global teardown.
- Both suites are a deliberate, narrow exception to "unit tests + API integration tests" as the default — do not add Playwright to `Client/`, and weigh any new backend E2E flow against the test pyramid (E2E ≈ 10% of the suite; most coverage stays at the existing per-service integration-test layer).
- Test names describe **outcomes, not actions**: "returns err NOT_FOUND when user does not exist" not "test getUser"
- **Assert specific values**, not just types: `expect(result.value.email).toBe('alice@test.com')` not `expect(result).toBeDefined()`
- **One concept per test** — if a test name needs "and", split it
- Use the **AAA pattern**: Arrange (setup), Act (execute), Assert (verify)
- Cover edge cases systematically: empty/null inputs, boundary values, error paths, Unicode, duplicates
- When you find a bug, test related scenarios too — bugs cluster
- Prefer `mock<DepsType>()` for unit tests; use supertest for API integration tests against real service instances
- Flight service uses `vitest` — follow that pattern for other services. Server legacy uses `jest`.

## Security

- **Never hardcode secrets, API keys, or tokens** — use environment variables only
- All database queries use Prisma parameterized queries (safe from SQL injection by default)
- Gateway already handles: JWT verification, rate limiting (300 req/15min global, 10/15min auth), CORS, and `x-service-key` stripping. Do not bypass these.
- Authentication checks before any data access or mutation — verify the user owns or is authorized for the resource
- Tokens in httpOnly cookies, not localStorage
- Run `npm audit` before adding dependencies; don't introduce known vulnerabilities

## Gotchas

- Gateway strips downstream CORS headers — if you add CORS to a microservice, it will be removed at the gateway
- Gateway strips client-supplied `x-service-key` to prevent privilege escalation
- Client depends on `@management` alias pointing to `../Management/src` at build time
- No workspace-level package manager — each directory installs dependencies independently
- Port conflicts are common when running many services — check port availability before starting
- **`lead-service` crash-loops on a transient Supabase pooler blip and does not recover on its own.** Unlike `assistant-service` (which deliberately never eager-connects, specifically to avoid this), `lead-service`'s `src/index.js` calls `prisma.$connect()` at startup — if the pooler is unreachable for even an instant at that exact moment, the process exits and nodemon sits at "waiting for file changes" until something touches a file. This happened repeatedly during real testing, each time a false "the feature is broken" signal that was actually just this. If a request to `:3004` gets `ECONNREFUSED` or `fetch failed`, check `curl localhost:3004/health` before debugging anything else — `touch src/index.js` restarts it once the pooler is back.

## API Testing

When testing API endpoints, use `curl http://localhost:3000/api/v1/<path>` to hit the gateway. Do not call microservices directly on their ports unless debugging routing issues within the gateway. If you find yourself running the same curl patterns repeatedly, create a script at `Services/test-<scenario>.sh` instead of re-running raw curl commands each time.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec