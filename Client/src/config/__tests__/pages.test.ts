import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// PAGE_CONFIG reads import.meta.env at module-evaluation time, so each test
// stubs the env and re-imports the module fresh via vi.resetModules().
// Dynamic import is intentional here (rule exception: test intentionally
// exercises module-loading/module-cache boundaries) — a static import would
// only ever see the module's first-evaluation env snapshot.
const importPageConfig = async () => (await import('../pages')).PAGE_CONFIG;

describe('PAGE_CONFIG', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults every togglable page to enabled when env vars are unset', async () => {
    const PAGE_CONFIG = await importPageConfig();
    expect(PAGE_CONFIG.career.enabled).toBe(true);
    expect(PAGE_CONFIG.planner.enabled).toBe(true);
    expect(PAGE_CONFIG.destinations.enabled).toBe(true);
    expect(PAGE_CONFIG.about.enabled).toBe(true);
    expect(PAGE_CONFIG.account.enabled).toBe(true);
  });

  it('always keeps core-funnel pages enabled regardless of env', async () => {
    const PAGE_CONFIG = await importPageConfig();
    expect(PAGE_CONFIG.home.enabled).toBe(true);
    expect(PAGE_CONFIG.packages.enabled).toBe(true);
    expect(PAGE_CONFIG.packageDetails.enabled).toBe(true);
    expect(PAGE_CONFIG.contact.enabled).toBe(true);
  });

  it('disables a page when its flag is explicitly "false"', async () => {
    vi.stubEnv('VITE_FEATURE_CAREER', 'false');
    const PAGE_CONFIG = await importPageConfig();
    expect(PAGE_CONFIG.career.enabled).toBe(false);
  });

  it('treats any non-"false" value as enabled', async () => {
    vi.stubEnv('VITE_FEATURE_CAREER', 'true');
    const PAGE_CONFIG = await importPageConfig();
    expect(PAGE_CONFIG.career.enabled).toBe(true);
  });
});
