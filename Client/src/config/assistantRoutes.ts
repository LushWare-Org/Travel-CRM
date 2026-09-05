import { PAGE_CONFIG } from './pages';

// Phase 1 navigable targets for the site-wide assistant's `navigate` tool —
// the shared logical-name → path table the design doc's Eng Review Decisions
// call for (docs/designs/site-wide-floating-assistant.md): PAGE_CONFIG only
// holds per-feature `enabled` flags, and the name→path mapping used to live
// hardcoded in App.tsx's handleNavigate/route registration. The client sends
// the enabled subset to assistant-service on every turn, so the model's tool
// vocabulary and the client's executable allowlist can never drift.
//
// Parameterized routes (/package/:id, /package/:id/customize) are phase 2's
// get_package_detail targets — deliberately absent here.
export const ASSISTANT_ROUTES: { name: string; path: string; enabled: boolean }[] = [
  { name: 'home', path: '/', enabled: true },
  { name: 'packages', path: '/packages', enabled: PAGE_CONFIG.packages.enabled },
  { name: 'destinations', path: '/destinations-international', enabled: PAGE_CONFIG.destinations.enabled },
  { name: 'about', path: '/about', enabled: PAGE_CONFIG.about.enabled },
  { name: 'contact', path: '/contact', enabled: PAGE_CONFIG.contact.enabled },
  { name: 'career', path: '/career', enabled: PAGE_CONFIG.career.enabled },
  { name: 'planner', path: '/planner', enabled: PAGE_CONFIG.planner.enabled },
];

// Wire shape the assistant API contract needs ({ name, path } only — the
// `enabled` flag is a client-side visibility concern, not a per-request one).
export const getEnabledAssistantRoutes = (): { name: string; path: string }[] =>
  ASSISTANT_ROUTES.filter((route) => route.enabled).map(({ name, path }) => ({ name, path }));
