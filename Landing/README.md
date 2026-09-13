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
