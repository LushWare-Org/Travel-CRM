import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AssistantWidget from '../AssistantWidget';
import FloatingActionStack from '../../../../components/shared/floating-actions/FloatingActionStack';
import {
  setAssistantLauncherOpen,
  getAssistantLauncherOpen,
} from '../../../../components/shared/floating-actions/assistantLauncherState';

const mockSendAssistantTurn = vi.hoisted(() => vi.fn());
const mockSendAssistantEvent = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api/assistantTurn', () => ({
  sendAssistantTurn: mockSendAssistantTurn,
}));

vi.mock('../../../../services/api/assistantEvents', () => ({
  sendAssistantEvent: mockSendAssistantEvent,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
};

// Simulates the router-level navigation the widget doesn't control itself
// (e.g. an email link to /login, a bookmark to /planner) so a test can drive
// the widget through a route change without going via one of its own chips.
const NavTo = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      go-to-{to}
    </button>
  );
};

const renderWidget = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <AssistantWidget />
              <LocationProbe />
              <NavTo to="/planner" />
              <NavTo to="/packages" />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

// Phase 1: AssistantWidget has no launcher of its own — the FloatingActionStack
// anchor's "Travel assistant" item is the only way the panel opens, and it
// opens through the shared store. These tests drive that same seam directly;
// the anchor→row→panel click path itself is covered by the launcher
// integration test below (real FloatingActionStack + real AssistantWidget).
const openPanel = () => {
  act(() => {
    setAssistantLauncherOpen(true);
  });
};

// jsdom's window.scrollY is a fixed 0; the launcher's reveal-on-scroll reads
// it, so integration tests override the property and dispatch a scroll event.
const setWindowScrollY = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
  fireEvent.scroll(window);
};

const resetWindowScrollY = () => {
  Reflect.deleteProperty(window, 'scrollY');
};

const renderLauncherAndWidget = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <FloatingActionStack />
              <AssistantWidget />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const eventsOf = (eventType: string) => mockSendAssistantEvent.mock.calls.filter(([payload]) => payload.eventType === eventType);

const dialog = () => screen.queryByRole('dialog', { name: 'Travel assistant panel' });
const sendButton = () => screen.getByRole('button', { name: 'Send message' });
const input = () => screen.getByPlaceholderText('Ask me to help you navigate...');

beforeEach(() => {
  mockSendAssistantTurn.mockReset();
  mockSendAssistantEvent.mockReset();
  setAssistantLauncherOpen(false);
  localStorage.clear();
});

afterEach(() => {
  setAssistantLauncherOpen(false);
  resetWindowScrollY();
});

describe('AssistantWidget', () => {
  it.each(['/', '/packages'])('renders no panel on the public browsing route %s until the launcher opens it', (path) => {
    renderWidget(path);
    expect(dialog()).not.toBeInTheDocument();
    expect(getAssistantLauncherOpen()).toBe(false);
  });

  it.each([
    '/planner',
    '/planner/', // trailing slash must still match — React Router treats it as the same route
    '/package/123/customize',
    '/package/123/customize/',
    '/login',
    '/my-account',
  ])('renders nothing on the excluded route %s', (path) => {
    renderWidget(path);
    expect(dialog()).not.toBeInTheDocument();
    expect(mockSendAssistantEvent).not.toHaveBeenCalled();
  });

  it('fires exactly one impression event on mount on an eligible route', () => {
    renderWidget('/');
    expect(eventsOf('impression')).toHaveLength(1);
    expect(eventsOf('impression')[0][0]).toMatchObject({ eventType: 'impression', tool: null, route: null });
    expect(eventsOf('impression')[0][0].sessionId).toBeTruthy();
  });

  it('opens the panel while the launcher store is open and fires the opened event once per mount', async () => {
    renderWidget('/');
    const user = userEvent.setup();

    openPanel();
    expect(eventsOf('opened')).toHaveLength(1);
    expect(dialog()).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close assistant panel' }));
    expect(dialog()).not.toBeInTheDocument();
    expect(getAssistantLauncherOpen()).toBe(false);

    openPanel();
    expect(eventsOf('opened')).toHaveLength(1);
    expect(dialog()).toBeInTheDocument();
  });

  it('renders the panel bottom-right, floating above the launcher anchor', () => {
    renderWidget('/');
    openPanel();
    const wrapper = dialog()?.parentElement as HTMLElement;
    expect(wrapper).toHaveClass('right-3');
    expect(wrapper).not.toHaveClass('left-3');
    // Anchor bottom edge is 16px, anchor is 56px tall, 12px gap — the panel
    // clears the anchor at 84px instead of covering it.
    expect(wrapper).toHaveStyle({ bottom: '84px' });
  });

  it('clicking a nav chip navigates with the resolved path and fires a nav_click event', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'navigate', args: { route: 'packages' } },
      serverResult: { route: 'packages', path: '/packages' },
      message: 'I can take you to the packages page.',
    });
    renderWidget('/');
    const user = userEvent.setup();
    openPanel();

    await user.type(input(), 'Take me to packages');
    await user.click(sendButton());

    const chip = await screen.findByRole('button', { name: 'Go to Packages' });
    await user.click(chip);

    expect(screen.getByTestId('location-probe').textContent).toBe('/packages');
    expect(eventsOf('nav_click')).toHaveLength(1);
    expect(eventsOf('nav_click')[0][0]).toMatchObject({ eventType: 'nav_click', tool: 'navigate', route: 'packages' });
  });

  it('an answer_faq_policy no-match turn renders the server fallback message in the transcript', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'answer_faq_policy', args: { question: 'llama trekking' } },
      serverResult: { answered: false, fallbackMessage: "I don't have a confirmed answer to that — please contact support." },
      message: "I don't have a confirmed answer to that.",
    });
    renderWidget('/');
    const user = userEvent.setup();
    openPanel();

    await user.type(input(), 'Do you offer llama trekking?');
    await user.click(sendButton());

    expect(await screen.findByText("I don't have a confirmed answer to that — please contact support.")).toBeInTheDocument();
  });

  it('a failed turn renders the exact degraded-state banner and previous nav chips stay clickable', async () => {
    mockSendAssistantTurn
      .mockResolvedValueOnce({
        toolCall: { tool: 'navigate', args: { route: 'packages' } },
        serverResult: { route: 'packages', path: '/packages' },
        message: 'I can take you to the packages page.',
      })
      .mockRejectedValueOnce(new Error('network down'));
    renderWidget('/');
    const user = userEvent.setup();
    openPanel();

    await user.type(input(), 'Take me to packages');
    await user.click(sendButton());
    const chip = await screen.findByRole('button', { name: 'Go to Packages' });

    await user.type(input(), 'What about refunds?');
    await user.click(sendButton());
    expect(await screen.findByText('Failed to reach the assistant. Please try again.')).toBeInTheDocument();
    expect(eventsOf('error')).toHaveLength(1);

    // Degraded state never disables already-rendered chips — they are static
    // client-side links by then.
    await user.click(chip);
    expect(screen.getByTestId('location-probe').textContent).toBe('/packages');
    expect(eventsOf('nav_click')).toHaveLength(1);
  });

  it('blank or whitespace-only input never triggers a send', async () => {
    renderWidget('/');
    const user = userEvent.setup();
    openPanel();

    expect(sendButton()).toBeDisabled();

    await user.type(input(), '   ');
    expect(sendButton()).toBeDisabled();
    await user.keyboard('{Enter}');

    expect(mockSendAssistantTurn).not.toHaveBeenCalled();
    expect(eventsOf('turn')).toHaveLength(0);
  });

  it('closes the panel when the route becomes excluded, so it does not silently reopen on return', async () => {
    renderWidget('/packages');
    const user = userEvent.setup();
    openPanel();
    expect(dialog()).toBeInTheDocument();

    // The widget never unmounts (App.tsx mounts it unconditionally) — it
    // just renders null on an excluded route, so the store's open state
    // would otherwise survive the round trip and pop back open unprompted.
    await user.click(screen.getByRole('button', { name: 'go-to-/planner' }));
    expect(screen.getByTestId('location-probe').textContent).toBe('/planner');
    expect(dialog()).not.toBeInTheDocument();
    expect(getAssistantLauncherOpen()).toBe(false);

    await user.click(screen.getByRole('button', { name: 'go-to-/packages' }));
    expect(screen.getByTestId('location-probe').textContent).toBe('/packages');
    expect(dialog()).not.toBeInTheDocument();
    expect(getAssistantLauncherOpen()).toBe(false);
  });

  it('opens through the launcher: Contact options → Travel assistant', async () => {
    setWindowScrollY(600);
    renderLauncherAndWidget('/');
    const user = userEvent.setup();

    expect(dialog()).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Contact options' }));
    await user.click(screen.getByRole('button', { name: 'Travel assistant' }));

    expect(dialog()).toBeInTheDocument();
    expect(eventsOf('opened')).toHaveLength(1);
  });

  it('closes the assistant panel when the launcher scrolls out of view on a marketing route', async () => {
    setWindowScrollY(600);
    renderLauncherAndWidget('/');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Contact options' }));
    await user.click(screen.getByRole('button', { name: 'Travel assistant' }));
    expect(dialog()).toBeInTheDocument();

    setWindowScrollY(0);

    expect(dialog()).not.toBeInTheDocument();
    expect(getAssistantLauncherOpen()).toBe(false);
  });
});
