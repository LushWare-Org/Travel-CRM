import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// FLOATING_ACTIONS_CONFIG reads import.meta.env at module-evaluation time,
// so each test that toggles a feature flag stubs env and re-imports the
// config + component fresh via vi.resetModules() (see
// config/__tests__/pages.test.ts for the same pattern — dynamic import is
// intentional here for the same reason). The launcher reads the route via
// useLocation (the assistant-excluded gate), so every render needs a Router
// ancestor.
const renderStack = async (path = '/') => {
  const { default: FloatingActionStack } = await import('../FloatingActionStack');
  render(
    <MemoryRouter initialEntries={[path]}>
      <FloatingActionStack />
    </MemoryRouter>
  );
};

const anchor = () => screen.getByRole('button', { name: 'Contact options' });
const launcherContainer = () => anchor().parentElement as HTMLElement;

describe('FloatingActionStack', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('renders exactly one collapsed launcher anchor on a marketing route', async () => {
    await renderStack('/');

    expect(screen.getAllByRole('button', { name: 'Contact options' })).toHaveLength(1);
    // Collapsed by default: none of the actions are visible until expanded.
    expect(screen.queryByRole('link', { name: 'Chat on WhatsApp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Call us' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Travel assistant' })).not.toBeInTheDocument();
  });

  it('expands into Call, WhatsApp and Travel assistant actions with correct deep links', async () => {
    await renderStack('/');
    const user = userEvent.setup();

    await user.click(anchor());

    const whatsapp = screen.getByRole('link', { name: 'Chat on WhatsApp' });
    expect(whatsapp).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', expect.stringContaining('noopener'));

    expect(screen.getByRole('link', { name: 'Call us' })).toHaveAttribute('href', expect.stringMatching(/^tel:/));
    expect(screen.getByRole('button', { name: 'Travel assistant' })).toBeInTheDocument();
  });

  it.each([
    '/',
    '/about',
    '/packages',
    '/package/123',
    '/contact',
    '/career',
    '/destinations-international',
    '/reset-password/abc',
  ])('renders the launcher immediately, with no scroll gate, on %s', async (path) => {
    await renderStack(path);

    expect(anchor()).toBeInTheDocument();
    expect(launcherContainer()).not.toHaveClass('opacity-0');
    expect(launcherContainer()).not.toHaveClass('pointer-events-none');
  });

  it.each(['/planner', '/planner/', '/package/123/customize', '/login', '/my-account'])(
    'renders no launcher at all on the assistant-excluded route %s',
    async (path) => {
      await renderStack(path);

      expect(screen.queryByRole('button', { name: 'Contact options' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument();
    },
  );

  it('closes the menu when an action is chosen', async () => {
    await renderStack('/');
    const user = userEvent.setup();

    await user.click(anchor());
    expect(screen.getByRole('link', { name: 'Call us' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Travel assistant' }));
    expect(screen.queryByRole('link', { name: 'Call us' })).not.toBeInTheDocument();
    expect(anchor()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the remaining actions when one contact channel is disabled', async () => {
    vi.stubEnv('VITE_FEATURE_CALL_BUTTON', 'false');
    await renderStack('/');
    const user = userEvent.setup();

    await user.click(anchor());

    expect(screen.queryByRole('link', { name: 'Call us' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chat on WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Travel assistant' })).toBeInTheDocument();
  });

  it('still renders the launcher when both contact channels are disabled, because the assistant row remains', async () => {
    vi.stubEnv('VITE_FEATURE_WHATSAPP_BUTTON', 'false');
    vi.stubEnv('VITE_FEATURE_CALL_BUTTON', 'false');
    await renderStack('/');
    const user = userEvent.setup();

    await user.click(anchor());

    expect(screen.queryByRole('link', { name: 'Call us' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Chat on WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Travel assistant' })).toBeInTheDocument();
  });

  it('renders neither the launcher nor ScrollTop on an excluded route when every toggle is disabled', async () => {
    vi.stubEnv('VITE_FEATURE_WHATSAPP_BUTTON', 'false');
    vi.stubEnv('VITE_FEATURE_CALL_BUTTON', 'false');
    vi.stubEnv('VITE_FEATURE_SCROLL_TOP', 'false');
    await renderStack('/planner');

    expect(screen.queryByRole('button', { name: 'Contact options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scroll to top' })).not.toBeInTheDocument();
  });
});
