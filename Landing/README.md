# Landing

Marketing landing page for LushTravelCloud. Presents the platform's features and
sends visitors to the two product surfaces:

- **Management Portal** — `app.lushtravelcloud.com` (agency staff)
- **Client Site** — `user.lushtravelcloud.com` (travelers)

Standalone Vite + React + Tailwind app, no backend of its own — every link
points at an already-deployed portal. Portal URLs are configurable via
`VITE_MANAGEMENT_URL` / `VITE_CLIENT_URL` (see `.env.example`) for staging use.

## Commands

```bash
npm install
npm run dev       # http://localhost:5175
npm run build
npm run preview
npm test          # vitest
npm run lint
```

## Deployment

Ships to the Firebase Hosting site `lush-ware-landing-dev`
(https://lush-ware-landing-dev.web.app), deployed in two ways:

- `scripts/deploy-landing.sh [dev|staging|prod]` — builds and deploys by hand.
- CI's `deploy-hosting` job in `.github/workflows/deploy.yml` — builds and
  deploys `hosting:landing-$TARGET_ENV` on every push to `microservices`
  (`dev`), or on a manual `workflow_dispatch` to another environment.

The build's only inputs are the portal URLs in `src/config/portals.js`, which
read `VITE_MANAGEMENT_URL` / `VITE_CLIENT_URL`. They fall back to the
production custom domains, so a non-prod deploy that leaves them unset would
quietly hand visitors off to production: both the script and CI pass the
target environment's URLs explicitly, and the script refuses to deploy a
bundle that does not contain them.
