import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ASSISTANT_ROUTES reads PAGE_CONFIG, which reads import.meta.env at
// module-evaluation time — each test stubs the env and re-imports the module
// fresh via vi.resetModules(), same convention as config/__tests__/pages.test.ts.
const importAssistantRoutes = async () => (await import('../assistantRoutes')).ASSISTANT_ROUTES;
const loadEnabledRoutes = async () => (await import('../assistantRoutes')).getEnabledAssistantRoutes();
const loadExcludedPath = async () => (await import('../assistantRoutes')).isAssistantExcludedPath;

const EXPECTED_TARGETS = [
  { name: 'home', path: '/' },
  { name: 'packages', path: '/packages' },
  { name: 'destinations', path: '/destinations-international' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'career', path: '/career' },
  { name: 'planner', path: '/planner' },
];

// The filter keys /packages honours. Only that route declares any — a route
// with no filters sends an empty array, which is what lets the server read a
// missing list as "this page takes no filters".
const PACKAGE_PARAMS = [
  'destination',
  'category',
  'priceMin',
  'priceMax',
  'durationMin',
  'durationMax',
  'rating',
  'sort',
];

const EXPECTED_ENABLED = EXPECTED_TARGETS.map((target) => ({
  ...target,
  params: target.name === 'packages' ? PACKAGE_PARAMS : [],
}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ASSISTANT_ROUTES', () => {
  it('exposes exactly the seven Phase 1 navigable targets with their resolved paths', async () => {
    const routes = await importAssistantRoutes();
    expect(routes.map(({ name, path }) => ({ name, path }))).toEqual(EXPECTED_TARGETS);
  });

  it('sources every flag-gated entry from PAGE_CONFIG (defaults to enabled)', async () => {
    const routes = await importAssistantRoutes();
    expect(routes.every((route) => route.enabled)).toBe(true);
  });

  it('does not include parameterized package routes (phase 2 targets)', async () => {
    const routes = await importAssistantRoutes();
    expect(routes.some((route) => route.path.includes(':id'))).toBe(false);
  });
});

describe('getEnabledAssistantRoutes', () => {
  it('returns the full { name, path, params } list when every page is enabled', async () => {
    const enabled = await loadEnabledRoutes();
    expect(enabled).toEqual(EXPECTED_ENABLED);
  });

  it('sends the filter keys each page honours, and an empty list for the rest', async () => {
    const enabled = await loadEnabledRoutes();
    expect(enabled.find((route) => route.name === 'packages')?.params).toEqual(PACKAGE_PARAMS);
    expect(enabled.filter((route) => route.name !== 'packages').every((route) => route.params.length === 0)).toBe(
      true,
    );
  });

  it('drops a route whose PAGE_CONFIG flag is disabled and strips the enabled key', async () => {
    vi.stubEnv('VITE_FEATURE_PLANNER', 'false');
    const enabled = await loadEnabledRoutes();
    expect(enabled).not.toContainEqual(expect.objectContaining({ name: 'planner' }));
    expect(enabled).toContainEqual(expect.objectContaining({ name: 'packages', path: '/packages' }));
    expect(enabled.every((route) => Object.keys(route).sort().join(',') === 'name,params,path')).toBe(true);
  });

  it('keeps home enabled regardless of feature flags', async () => {
    vi.stubEnv('VITE_FEATURE_PLANNER', 'false');
    const enabled = await loadEnabledRoutes();
    expect(enabled).toContainEqual(expect.objectContaining({ name: 'home', path: '/' }));
  });
});

describe('isAssistantExcludedPath', () => {
  it('excludes exactly the four assistant-free routes, tolerating a trailing slash', async () => {
    const isAssistantExcludedPath = await loadExcludedPath();

    expect(isAssistantExcludedPath('/planner')).toBe(true);
    expect(isAssistantExcludedPath('/planner/')).toBe(true);
    expect(isAssistantExcludedPath('/package/123/customize')).toBe(true);
    expect(isAssistantExcludedPath('/login')).toBe(true);
    expect(isAssistantExcludedPath('/my-account')).toBe(true);

    expect(isAssistantExcludedPath('/')).toBe(false);
    expect(isAssistantExcludedPath('/about')).toBe(false);
    expect(isAssistantExcludedPath('/packages')).toBe(false);
    expect(isAssistantExcludedPath('/package/123')).toBe(false);
    expect(isAssistantExcludedPath('/package/123/customize/extra')).toBe(false);
  });
});
