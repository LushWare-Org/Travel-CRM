import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Pins the shipped brand fallbacks — the literals a deployment shows when no
// VITE_COMPANY_* env var is set. The Sidebar specs deliberately derive their
// expectations from this config, so without this file a rename could silently
// revert without failing anything.
describe('branding config fallbacks', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_COMPANY_NAME', '');
    vi.stubEnv('VITE_COMPANY_SHORT_NAME', '');
    vi.stubEnv('VITE_APP_NAME', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to the shipped brand name, short name, app name and PDF company', async () => {
    // Dynamic import (not a static one): the module must be re-evaluated after
    // vi.resetModules() + the env stubs, so no static import can work here.
    const { getSidebarInfo, default: BRANDING } = await import('../branding');

    expect(getSidebarInfo()).toMatchObject({ name: 'Lush Travel Providers', shortName: 'LTP' });
    expect(BRANDING.app.name).toBe('Lush Travel Providers Management');
    expect(BRANDING.pdf.company).toBe('Lush Travel Providers');
  });
});
