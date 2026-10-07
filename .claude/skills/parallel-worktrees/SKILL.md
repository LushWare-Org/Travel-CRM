---
name: parallel-worktrees
description: "Safety playbook for running multiple omp sessions in parallel git worktrees with Worktrunk (wt). Use when working in a worktree, before starting dev servers, running migrations/seeds, or running E2E tests, and whenever using `wt switch`/`wt list`/`wt merge`/`wt remove` or `wt step copy-ignored`. Covers what breaks when several sessions share this repo's fixed ports, one remote Supabase database, gitignored .env files, and node_modules, plus the repo hooks that fix it."
---

# Parallel Worktrees (Worktrunk)

This repo is **not parallel-safe by default.** [Worktrunk](https://worktrunk.dev) (`wt`)
makes git worktrees as easy as branches — `wt switch -c -x omp feat` creates a worktree,
branch, and agent in one command — but **a worktree is a clean checkout of tracked files
only**. This repo needs untracked, machine-local state to run (16 `.env` files,
per-package `node_modules`), and it has **one shared remote database** and **fixed ports**
that every session collides on.

Worktrunk isolates *files*. Ports, the Supabase Postgres instance, the running stack, the
Gateway rate limiter, and git operations are still shared. This skill is the contract.

> Install once: `brew install worktrunk && wt config shell install` (or `cargo install worktrunk`).
> Verify with `wt --version`. Shell integration is what lets `wt switch` change your directory.

## Repo hooks that fix the cold start

Two tracked files make a fresh worktree runnable, wired to worktrunk's lifecycle:

- **`.worktreeinclude`** — the gitignored files worth copying into every worktree. `wt step
  copy-ignored` reads it. It copies the **16 package `.env` files** plus the **machine-local
  agent tooling** (`.mcp.json`, `opencode.json`, `config/`, `.codex/`, `.cursor/`, `.gemini/`,
  `.goose/`, `.vscode/`, `.zed/`) and the **`.claude/skills/deploy-travelcrm/` runbook** — so
  a parallel session has the same MCP servers, editor config and deploy skill as the primary.
  (These files are gitignored, not committed; the copy is filesystem-level, once per worktree.)
- **`.config/wt.toml`** — a `post-start` hook runs `wt step copy-ignored` on `wt switch -c`,
  so a new worktree gets all of the above automatically.

Manual run at any time:

```bash
wt step copy-ignored                 # primary worktree -> current, per .worktreeinclude
wt step copy-ignored --dry-run       # preview first
```

Project hooks require one-time approval on first run (saved to
`~/.config/worktrunk/approvals.toml`); decline and `copy-ignored` never runs.

**`node_modules` is deliberately not in `.worktreeinclude`** — 15 packages × install is too
heavy to copy on every creation. Install the packages a session needs (below). If a session
only needs one service, install only that one.

## 30-second preflight (run first, in any new worktree)

```bash
ROOT=$(git rev-parse --show-toplevel)
wt list                              # every worktree + status; @ marks the current one
[ -f Client/.env ] && [ -f Services/gateway/.env ] || echo "MISSING ENV -> wt step copy-ignored"
ss -ltnp 2>/dev/null | grep -E ':(3000|3001|5173|5174|5000)\b' || echo "no stack ports busy"
```

If any of `:3000 :3001–:3011 :5173 :5174 :5000` is already listening, **another session
owns the stack**. Do not start a second one (below).

## Install deps in a worktree

There is **no root workspace** — each package installs independently. Install only what
your task needs:

```bash
# per package you will run
(cd Management && npm install)
(cd Services/lead-service && npm install)

# if a package generates a Prisma client, regenerate it for this worktree:
(cd Services/<svc> && npm run db:generate)
```

Shortcut for dependency-heavy work — symlink the shared tree instead of installing all 15
(worktrunk's own recommended Node pattern; instant, no disk):

```bash
ln -sfn "$(wt list --format=json | jq -r '.[] | select(.is_primary) | .path')/node_modules" \
  Services/gateway/node_modules
```

Tradeoff: a shared symlinked `node_modules` means an `npm install` in one worktree mutates
all of them. Do not run installs through a symlink; use it read-only (run the service, run
tests).

## Hazard register (what actually goes wrong)

| # | Failure | Concrete cause in this repo | Strategy |
|---|---------|------------------------------|----------|
| 1 | **Missing credentials / services crash** | `.gitignore` ignores `.env` and `.env.*` — a fresh worktree has none of the 16 (`Client/.env`, `Management/.env`, `Server/.env`, `Services/*/.env`, `Services/e2e-tests/.env`, `Management/e2e/.env.e2e`). Same for `node_modules` (no workspace), `.firebase/`, `.gstack/`, `env_backup/`. Tooling config (`.mcp.json`, `.codex/`, …) is also gitignored and copied via `.worktreeinclude`. | `wt step copy-ignored` (hooked on `post-start` + `.worktreeinclude`). Install deps for the package you'll run. Never assume `npm run dev` "just works". |
| 2 | **Port collision** | Fixed ports: gateway 3000, services 3001–3011, Client 5173, Management 5174, legacy Server 5000, declared in each `.env`. Two `cd Services && npm run dev` → `EADDRINUSE`. | **One shared stack, owned by the main worktree.** Other worktrees consume it or run nothing. For a *frontend*-only change, worktrunk gives each worktree its own port for free: `npm run dev -- --port {{ branch \| hash_port }}`. A second full backend stack needs the whole port matrix moved (see below). |
| 3 | **Tests/requests exercise the wrong code** | The shared stack is started from the **primary** worktree and loads *its* files. A worktree editing `Services/lead-service/src/...` is **not** served by that stack. | "It works in my session" ≠ the stack runs your worktree. To test *your* code, own the stack from your worktree, or run a second stack on alternate ports. Never claim verification from the shared stack for worktree edits. |
| 4 | **Shared database corruption / data loss** | 9 Prisma services + analytics/notification all point at **one shared Supabase Postgres**, namespaced by `@@schema`. `_prisma_migrations` bookkeeping is shared. `db:migrate` = `prisma migrate dev`, which can **reset the shared DB**. `db:push` mutates schema. `Services/seed*.mjs`/`update-passwords.mjs` hardcode the **live** connection string. | **NEVER** run `prisma migrate dev` / `db:push` / seed scripts from a parallel session. **NEVER** apply two services' migrations concurrently. Apply migrations only when the migration files are yours and you hold the DB claim. |
| 5 | **E2E suite collides** | `Services/e2e-tests` drives the **shared running stack + shared DB**; `auth-helper` logs in through the Gateway, whose limiter is **10 req / 15 min**. Two runs stack on that limiter (→ 429s). Both write rows tagged per-run, but seeded accounts/records are shared and invoice/receipt rows are only cancelled, never deleted. `Management` Playwright needs its own dev server on 5174 and shares `test-results/`. | E2E requires **exclusive** access to the stack + DB. Claim it before running; tell the other sessions. Worktrunk's `wt list` shows what branches are live. |
| 6 | **Git index pollution / bad commits** | `wt step commit` defaults to `--stage=all` (untracked included). An agent that runs `git add -A` stages `.claude/skills/`, `.gstack/`, `.firebase/`, `Management/test-results/`, `TODOS.md` churn. | Stage explicitly or use `wt step commit --stage=tracked`. Don't force-push a shared branch another session is reviewing. `wt merge` squashes + rebases + removes — make sure that's what you want before running it on a branch another session is using. |
| 7 | **Commits fail on hooks** | `.git/hooks` → `.husky/_`; `pre-commit` runs `npx lint-staged`, which routes staged files to the **eslint installed in each package's own `node_modules`**. Fresh worktree → hook fails → every commit errors until installs run. | Install the packages you touch before committing (and the root: `npm install`, for husky/lint-staged). `git commit --no-verify` only as a last resort, never for a branch you'll PR. |
| 8 | **Plan/spec state doesn't propagate** | Any `.super/`, `TODOS.md`, `docs/plans/`, or `*-PLAN.md` written in a worktree stays there. Parallel sessions each see only their own. | Treat specs as per-session; land durable decisions to tracked files in the primary worktree before they're relied on elsewhere. |
| 9 | **Browser automation fights** | `.gstack/` daemon, Playwright (`Management/e2e`), and dev servers share ports 5173/5174. Two agents driving browsers concurrently collide or attach to the wrong app. | Serialize browser automation across sessions, or verify with `curl`/unit tests instead. |
| 10 | **Removing a worktree with a live server** | `wt remove` deletes the working directory. A dev server or watcher still running there is orphaned; stale worktree registrations confuse later commands. | Run long servers under `wt step tether` (kills the process tree on `wt remove`), or stop them first. `wt remove` from the worktree's own session, not from a sibling. |

## Strategy (the rules)

1. **One backend stack per machine.** The primary worktree owns `cd Services && npm run
   dev`. Other worktrees consume it or run nothing. Frontends are the exception —
   worktrunk's `hash_port` gives each worktree its own (`--port {{ branch | hash_port }}`).
2. **Don't touch shared state without a claim.** Migrations, seeds, `prisma migrate
   dev`/`db:push`, and E2E tests mutate a database and a rate limiter every session shares.
   One session at a time — per DB surface, per E2E suite.
3. **Copy env, install what you'll run.** `wt step copy-ignored` handles secrets; per-package
   `npm install` handles deps.
4. **A worktree change is unverified until *its* code runs.** The shared stack runs the
   primary tree. Own the stack from your worktree for the test, or move the whole port
   matrix.
5. **Write durable knowledge to tracked files**, not to your worktree's local notes.
6. **Never commit secrets** — `.worktreeinclude` names `.env`; the values are copied at the
   filesystem level, never staged (all `.env` paths are gitignored).

## Testing a worktree's code (the port problem, concretely)

The full backend stack is not configurable from one place — the port matrix lives in `.env`:

- `Services/gateway/.env`: `PORT=3000` + `AUTH_SERVICE_URL`…`ANALYTICS_SERVICE_URL` (one per service)
- each `Services/<svc>/.env`: `PORT=300x`
- `Services/e2e-tests/.env`: `GATEWAY_URL=http://localhost:3000/api/v1`
- `Client/.env`: `VITE_API_URL`; `Management/.env`: `VITE_API_URL`

To run a second *backend* stack in your worktree, shift **all** of these consistently (e.g.
gateway 3100, services 3101–3111) and point the fronts/`e2e-tests` at it. Partial shifts
produce confusing 404s/`ECONNREFUSED`. If you can't afford that, coordinate with the session
that owns the stack and hand it to your worktree for the duration of your test.

For frontends only, `hash_port` avoids the conflict without touching `.env`:

```bash
npm run dev -- --port {{ branch | hash_port }}   # in a .config/wt.toml hook
```

## Worktrunk commands worth knowing

| Command | Why |
|---------|-----|
| `wt switch feat` / `wt switch -c feat` | Enter / create a worktree (creates the branch too) |
| `wt switch -x omp -c feat -- '<prompt>'` | Create a worktree and launch an omp session in it |
| `wt list` | All worktrees + dirty/ahead status; `--full` adds CI/PR; `--format=json` for scripts |
| `wt step copy-ignored` | Sync gitignored files (`.env`) into the current worktree |
| `wt hook post-start` | Re-run the copy hook on demand after editing `.worktreeinclude` |
| `wt merge main` | commit → squash → rebase → hooks → fast-forward → remove — one command |
| `wt remove` | Delete this worktree + branch |
| `wt config state marker set "🤖"` | Show agent status in `wt list` |

## Don't-do list

- A second `cd Services && npm run dev` on the default ports
- `prisma migrate dev` / `db:push` / seed scripts against the shared DB from a parallel session
- Concurrent `Services/e2e-tests` runs (shared Gateway rate limiter)
- `wt step commit` / `git add -A` in a tree with untracked local artifacts
- Assuming the shared stack serves your worktree's edits
- `wt remove` while a dev server is still running in that worktree
- Committing any `.env`, `env_backup/`, or hardcoded connection string
