# Travel CRM

Monorepo with two React frontends (Client + Management), an API gateway, and 11 Express/Prisma microservices behind it. The `Server/` directory is the legacy Express/MongoDB monolith being migrated away from.

## Architecture

```
Client (React/Vite :5173) ──┐
Management (React/Vite :5174) ─┤─→ Gateway (:3000) ──→ microservices (:3001–:3011)
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

### Database (Prisma services)
- **Generate client:** `cd Services/<name> && npm run db:generate`
- **Push schema (local/dev only):** `cd Services/<name> && npm run db:push`
- **Migrate — local dev:** `cd Services/<name> && npm run db:migrate` (`prisma migrate dev`, interactive, can reset drift — only ever run this against a local/disposable database, never the shared remote one)
- **Migrate — apply pending (safe, non-interactive):** `cd Services/<name> && npm run db:migrate:deploy`, or `node Services/migrate-all.mjs` to apply pending migrations across every service in one pass
- **Migrate status:** `cd Services/<name> && npm run db:migrate:status`
- **Studio:** `cd Services/<name> && npm run db:studio`

**Shared database, per-service schemas:** all 9 Prisma services (auth, user, package, lead, booking, billing, career, flight, assistant) connect to the **same physical Postgres database** (one Supabase instance) — each just owns its own Postgres schema namespace (`crm_auth`, `crm_billing`, `crm_flights`, etc.) via `@@schema(...)`. Because of this, Prisma's `_prisma_migrations` bookkeeping table is shared: running `prisma migrate status` inside any one service will list every other service's migration names too — that's expected, not drift. `migrate deploy`/`migrate status` only ever act on the migrations declared in that service's own `prisma/migrations/` folder, so this is safe to ignore. Never run `prisma migrate dev` against this shared remote database — use `db:migrate:deploy` (or `migrate-all.mjs`) instead, which only ever applies pending migrations and never resets/drops anything.

### Testing
- **Flight service:** `cd Services/flight-service && npm test` (vitest), `npm run test:watch`, `npm run test:coverage`, `npm run test:unit`, `npm run test:integration`
- **Server (legacy):** `cd Server && npm test` (jest), `npm run test:watch`, `npm run lint`

### Seed / scripts
- `cd Services && node migrate-all.mjs` — apply pending migrations across all 9 Prisma services in one pass (safe to re-run; no-ops when nothing's pending)
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