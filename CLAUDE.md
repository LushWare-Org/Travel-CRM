# Travel CRM

Monorepo with two React frontends (Client + Management), an API gateway, and 10 Express/Prisma microservices behind it. The `Server/` directory is the legacy Express/MongoDB monolith being migrated away from.

## Architecture

```
Client (React/Vite :5173) ──┐
Management (React/Vite :5174) ─┤─→ Gateway (:3000) ──→ microservices (:3001–:3010)
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
| Server (legacy monolith) | 5000 | MongoDB/Mongoose |

Gateway handles JWT verification, rate limiting, CORS, and downstream CORS-stripping. Public routes: auth, GET packages/reviews/itineraries, contact forms, career applications, webhooks.

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
- **Push schema:** `cd Services/<name> && npm run db:push`
- **Migrate:** `cd Services/<name> && npm run db:migrate`
- **Studio:** `cd Services/<name> && npm run db:studio`

### Testing
- **Flight service:** `cd Services/flight-service && npm test` (vitest), `npm run test:watch`, `npm run test:coverage`, `npm run test:unit`, `npm run test:integration`
- **Server (legacy):** `cd Server && npm test` (jest), `npm run test:watch`, `npm run lint`

### Seed / scripts
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
- **Git commits:** Never add `Co-Authored-By: Claude` or any Anthropic/Claude email to commit messages

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
- **No browser-automation E2E tests** (no Playwright, Selenium, or Cypress). Focus on unit tests and API integration tests.
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