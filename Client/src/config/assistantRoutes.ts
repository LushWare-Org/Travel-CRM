import { PAGE_CONFIG } from './pages';

// Phase 1 navigable targets for the site-wide assistant's `navigate` tool —
// the shared logical-name → path table the design doc's Eng Review Decisions
// call for (docs/designs/site-wide-floating-assistant.md): PAGE_CONFIG only
// holds per-feature `enabled` flags, and the name→path mapping used to live
// hardcoded in App.tsx's handleNavigate/route registration. The client sends
// the enabled subset to assistant-service on every turn, so the model's tool
// vocabulary and the client's executable allowlist can never drift.
//
// Path-parameterized routes (/package/:id, /package/:id/customize) are phase
// 2's get_package_detail targets — deliberately absent here. Query filters are
// supported, and are a different thing: each entry declares the query keys its
// own page reads via `params`, which travels with the route on every turn so
// the assistant can build a filtered URL without this list being duplicated
// server-side. A route with no filters declares an empty array.
export const ASSISTANT_ROUTES: {
  name: string;
  path: string;
  enabled: boolean;
  params: string[];
}[] = [
  { name: 'home', path: '/', enabled: true, params: [] },
  {
    name: 'packages',
    path: '/packages',
    enabled: PAGE_CONFIG.packages.enabled,
    // Exactly the filters PackagesContainer reads that a visitor can ask for
    // by name. `view` and `page` are deliberately excluded: nobody asks to be
    // on page 3 in grid mode, and the page resets `page` on every filter
    // change, so forwarding either would fight the page's own behaviour.
    params: [
      'destination',
      'category',
      'priceMin',
      'priceMax',
      'durationMin',
      'durationMax',
      'rating',
      'sort',
    ],
  },
  { name: 'destinations', path: '/destinations-international', enabled: PAGE_CONFIG.destinations.enabled, params: [] },
  { name: 'about', path: '/about', enabled: PAGE_CONFIG.about.enabled, params: [] },
  { name: 'contact', path: '/contact', enabled: PAGE_CONFIG.contact.enabled, params: [] },
  { name: 'career', path: '/career', enabled: PAGE_CONFIG.career.enabled, params: [] },
  { name: 'planner', path: '/planner', enabled: PAGE_CONFIG.planner.enabled, params: [] },
];

// Route predicates below compare paths that React Router resolves
// slash-insensitively but exact-string checks do not (see the trailing-slash
// note on isAssistantExcludedPath): strip trailing slashes once, here.
const normalizePath = (pathname: string): string => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

// Routes where the floating assistant deliberately does not mount — exactly
// the design doc's Target User exclusions: /planner owns its own in-tab chat
// surface, /package/:id/customize is the planner-gated conversion funnel the
// widget must not compete with, and /login + /my-account are auth-adjacent.
// Lives here (not in AssistantWidget.tsx) so FloatingActionStack can also
// read it — the launcher is the assistant's only opener, so the same four
// routes are its render gate — without importing the whole widget
// component tree.
export const isAssistantExcludedPath = (pathname: string): boolean => {
  // React Router matches "/planner" and "/planner/" identically when
  // resolving which page renders, but an exact-string check wouldn't — a
  // trailing-slash URL would leave the widget mounted directly over the
  // excluded page it exists to avoid (found in /ship's Codex adversarial
  // review). Normalize before comparing.
  const normalized = normalizePath(pathname);
  return (
    normalized === '/planner' ||
    /^\/package\/[^/]+\/customize$/.test(normalized) ||
    normalized === '/login' ||
    normalized === '/my-account'
  );
};

// Wire shape the assistant API contract needs. `enabled` is dropped — it is a
// client-side visibility concern, not a per-request one. `params` is kept: it
// is the permission half of the filter contract, telling the server which
// query keys this page actually honours so a filter can never be invented.
export const getEnabledAssistantRoutes = (): { name: string; path: string; params: string[] }[] =>
  ASSISTANT_ROUTES.filter((route) => route.enabled).map(({ name, path, params }) => ({ name, path, params }));
