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

// Routes where the floating assistant deliberately does not mount — exactly
// the design doc's Target User exclusions: /planner owns its own in-tab chat
// surface, /package/:id/customize is the planner-gated conversion funnel the
// widget must not compete with, and /login + /my-account are auth-adjacent.
// Lives here (not in AssistantWidget.tsx) so FloatingActionStack can also
// read it — reserving the assistant's stack slot on the same routes it
// actually renders on — without importing the whole widget component tree.
export const isAssistantExcludedPath = (pathname: string): boolean => {
  // React Router matches "/planner" and "/planner/" identically when
  // resolving which page renders, but an exact-string check wouldn't — a
  // trailing-slash URL would leave the widget mounted directly over the
  // excluded page it exists to avoid (found in /ship's Codex adversarial
  // review). Normalize before comparing.
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return (
    normalized === '/planner' ||
    /^\/package\/[^/]+\/customize$/.test(normalized) ||
    normalized === '/login' ||
    normalized === '/my-account'
  );
};

// Wire shape the assistant API contract needs ({ name, path } only — the
// `enabled` flag is a client-side visibility concern, not a per-request one).
export const getEnabledAssistantRoutes = (): { name: string; path: string }[] =>
  ASSISTANT_ROUTES.filter((route) => route.enabled).map(({ name, path }) => ({ name, path }));
