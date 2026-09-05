import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ASSISTANT_ROUTES reads PAGE_CONFIG, which reads import.meta.env at
// module-evaluation time — each test stubs the env and re-imports the module
// fresh via vi.resetModules(), same convention as config/__tests__/pages.test.ts.
const importAssistantRoutes = async () => (await import('../assistantRoutes')).ASSISTANT_ROUTES;
const loadEnabledRoutes = async () => (await import('../assistantRoutes')).getEnabledAssistantRoutes();

const EXPECTED_TARGETS = [
  { name: 'home', path: '/' },
  { name: 'packages', path: '/packages' },
  { name: 'destinations', path: '/destinations-international' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'career', path: '/career' },
  { name: 'planner', path: '/planner' },
];

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
  it('returns the full { name, path } list when every page is enabled', async () => {
    const enabled = await loadEnabledRoutes();
    expect(enabled).toEqual(EXPECTED_TARGETS);
  });

  it('drops a route whose PAGE_CONFIG flag is disabled and strips the enabled key', async () => {
    vi.stubEnv('VITE_FEATURE_PLANNER', 'false');
    const enabled = await loadEnabledRoutes();
    expect(enabled).not.toContainEqual({ name: 'planner', path: '/planner' });
    expect(enabled).toContainEqual({ name: 'packages', path: '/packages' });
    expect(enabled.every((route) => Object.keys(route).sort().join(',') === 'name,path')).toBe(true);
  });

  it('keeps home enabled regardless of feature flags', async () => {
    vi.stubEnv('VITE_FEATURE_PLANNER', 'false');
    const enabled = await loadEnabledRoutes();
    expect(enabled).toContainEqual({ name: 'home', path: '/' });
  });
});
