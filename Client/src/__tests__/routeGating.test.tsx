import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';

// Exercises the exact route-gating mechanism App.jsx uses (conditionally
// include a <Route> as a JSX expression inside <Routes>, plus a trailing
// catch-all <Route path="*" element={<Navigate to="/" replace />} />),
// against the real PAGE_CONFIG (env-driven, so re-imported fresh per test
// via vi.resetModules() — same pattern as config/__tests__/pages.test.ts).
// Uses trivial placeholder elements instead of the real lazy-loaded pages
// so this stays a fast, isolated test of the gating mechanism itself.
const renderGatedRoutes = async (initialEntry: string) => {
  const { PAGE_CONFIG } = await import('../config/pages');
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<div>Home Page</div>} />
        {PAGE_CONFIG.career.enabled && <Route path="/career" element={<div>Career Page</div>} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('route gating (App.jsx mechanism)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('renders the page when its PAGE_CONFIG flag is enabled (default)', async () => {
    await renderGatedRoutes('/career');
    expect(screen.getByText('Career Page')).toBeInTheDocument();
  });

  it('redirects to / when the page is disabled via env', async () => {
    vi.stubEnv('VITE_FEATURE_CAREER', 'false');
    await renderGatedRoutes('/career');
    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Career Page')).not.toBeInTheDocument();
  });

  it('redirects an unknown path to / regardless of toggles', async () => {
    await renderGatedRoutes('/this-route-does-not-exist');
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });
});
