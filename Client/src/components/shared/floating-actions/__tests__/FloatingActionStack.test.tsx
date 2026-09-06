import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// FLOATING_ACTIONS_CONFIG reads import.meta.env at module-evaluation time,
// so each test that toggles a feature flag stubs env and re-imports the
// config + component fresh via vi.resetModules() (see
// config/__tests__/pages.test.ts for the same pattern — dynamic import is
// intentional here for the same reason). The launcher reads the route via
// useLocation (launcher visibility scope + assistant availability), so every
// render needs a Router ancestor.
const renderStack = async (path = '/') => {
  const { default: FloatingActionStack } = await import('../FloatingActionStack');
  render(
    <MemoryRouter initialEntries={[path]}>
      <FloatingActionStack />
    </MemoryRouter>
  );
};

// jsdom's window.scrollY is a fixed 0; the launcher's reveal-on-scroll and
// ScrollTop's own listener both read it, so tests override the property and
// dispatch a scroll event to wake every listener.
const setWindowScrollY = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
  fireEvent.scroll(window);
};

const resetWindowScrollY = () => {
  Reflect.deleteProperty(window, 'scrollY');
};

const anchor = () => screen.getByRole('button', { name: 'Contact options' });
const launcherContainer = () => anchor().parentElement as HTMLElement;

describe('FloatingActionStack', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    resetWindowScrollY();
  });

  it('renders exactly one collapsed launcher anchor on a marketing route', async () => {
    setWindowScrollY(600);
    await renderStack('/');

    expect(screen.getAllByRole('button', { name: 'Contact options' })).toHaveLength(1);
    // Collapsed by default: none of the actions are visible until expanded.
    expect(screen.queryByRole('link', { name: 'Chat on WhatsApp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Call us' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Travel assistant' })).not.toBeInTheDocument();
  });

  it('expands into Call, WhatsApp and Travel assistant actions with correct deep links', async () => {
    setWindowScrollY(600);
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

  it('is hidden above the hero on a marketing route and fades in past the scroll threshold', async () => {
    await renderStack('/');

    expect(launcherContainer()).toHaveClass('opacity-0');
    expect(launcherContainer()).toHaveClass('pointer-events-none');

    setWindowScrollY(600);

    expect(launcherContainer()).not.toHaveClass('opacity-0');
    expect(launcherContainer()).not.toHaveClass('pointer-events-none');
  });

  it.each(['/planner', '/planner/', '/package/123/customize', '/login', '/my-account'])(
    'is always visible immediately on the app route %s (no scroll gating)',
    async (path) => {
      await renderStack(path);

      expect(launcherContainer()).not.toHaveClass('opacity-0');
      expect(launcherContainer()).not.toHaveClass('pointer-events-none');
    },
  );

  it('omits the Travel assistant action on a route where the assistant is excluded', async () => {
    await renderStack('/planner');
    const user = userEvent.setup();

    await user.click(anchor());

    expect(screen.getByRole('link', { name: 'Call us' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chat on WhatsApp' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Travel assistant' })).not.toBeInTheDocument();
  });

  it('closes the menu when an action is chosen', async () => {
    setWindowScrollY(600);
    await renderStack('/');
    const user = userEvent.setup();

    await user.click(anchor());
    expect(screen.getByRole('link', { name: 'Call us' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Travel assistant' }));
    expect(screen.queryByRole('link', { name: 'Call us' })).not.toBeInTheDocument();
    expect(anchor()).toHaveAttribute('aria-expanded', 'false');
  });

  it('collapses the open menu when the user scrolls back above the threshold', async () => {
    setWindowScrollY(600);
    await renderStack('/');
    const user = userEvent.setup();

    await user.click(anchor());
    expect(screen.getByRole('link', { name: 'Call us' })).toBeInTheDocument();

    setWindowScrollY(0);

    expect(screen.queryByRole('link', { name: 'Call us' })).not.toBeInTheDocument();
    expect(launcherContainer()).toHaveClass('opacity-0');
  });

  it('keeps the remaining actions when one contact channel is disabled', async () => {
    vi.stubEnv('VITE_FEATURE_CALL_BUTTON', 'false');
    setWindowScrollY(600);
    await renderStack('/');
    const user = userEvent.setup();

    await user.click(anchor());

    expect(screen.queryByRole('link', { name: 'Call us' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chat on WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Travel assistant' })).toBeInTheDocument();
  });

  it('renders nothing when every toggle is disabled on a route with no assistant', async () => {
    vi.stubEnv('VITE_FEATURE_WHATSAPP_BUTTON', 'false');
    vi.stubEnv('VITE_FEATURE_CALL_BUTTON', 'false');
    vi.stubEnv('VITE_FEATURE_SCROLL_TOP', 'false');
    await renderStack('/planner');

    expect(screen.queryByRole('button', { name: 'Contact options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scroll to top' })).not.toBeInTheDocument();
  });
});
