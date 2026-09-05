import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AssistantWidget from '../AssistantWidget';

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

const renderAt = (path: string) =>
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

const eventsOf = (eventType: string) => mockSendAssistantEvent.mock.calls.filter(([payload]) => payload.eventType === eventType);

const launcher = () => screen.getByRole('button', { name: 'Travel assistant' });
const sendButton = () => screen.getByRole('button', { name: 'Send message' });
const input = () => screen.getByPlaceholderText('Ask me to help you navigate...');

const openPanel = async () => {
  const user = userEvent.setup();
  await user.click(launcher());
  return user;
};

beforeEach(() => {
  mockSendAssistantTurn.mockReset();
  mockSendAssistantEvent.mockReset();
  localStorage.clear();
});

describe('AssistantWidget', () => {
  it.each(['/', '/packages'])('renders the launcher on the public browsing route %s', (path) => {
    renderAt(path);
    expect(launcher()).toBeInTheDocument();
  });

  it('renders bottom-right, stacked one slot above the Call/WhatsApp/ScrollTop stack', () => {
    renderAt('/');
    const wrapper = launcher().parentElement;
    expect(wrapper).toHaveClass('right-3');
    expect(wrapper).not.toHaveClass('left-3');
    // Call/WhatsApp/ScrollTop occupy slots 0-2 (16px/84px/152px, all enabled
    // by default) — the launcher must sit above all three, at slot 3 (220px),
    // so it's never covering (or covered by) that stack.
    expect(wrapper).toHaveStyle({ bottom: '220px' });
  });

  it.each([
    '/planner',
    '/planner/', // trailing slash must still match — React Router treats it as the same route
    '/package/123/customize',
    '/package/123/customize/',
    '/login',
    '/my-account',
  ])('renders nothing on the excluded route %s', (path) => {
    renderAt(path);
    expect(screen.queryByRole('button', { name: 'Travel assistant' })).not.toBeInTheDocument();
    expect(mockSendAssistantEvent).not.toHaveBeenCalled();
  });

  it('fires exactly one impression event on mount on an eligible route', () => {
    renderAt('/');
    expect(eventsOf('impression')).toHaveLength(1);
    expect(eventsOf('impression')[0][0]).toMatchObject({ eventType: 'impression', tool: null, route: null });
    expect(eventsOf('impression')[0][0].sessionId).toBeTruthy();
  });

  it('fires the opened event once on first open, not on subsequent closes/reopens', async () => {
    renderAt('/');
    const user = userEvent.setup();

    await user.click(launcher());
    expect(eventsOf('opened')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Travel assistant panel' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close assistant panel' }));
    expect(screen.queryByRole('dialog', { name: 'Travel assistant panel' })).not.toBeInTheDocument();

    await user.click(launcher());
    expect(eventsOf('opened')).toHaveLength(1);
  });

  it('clicking a nav chip navigates with the resolved path and fires a nav_click event', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'navigate', args: { route: 'packages' } },
      serverResult: { route: 'packages', path: '/packages' },
      message: 'I can take you to the packages page.',
    });
    renderAt('/');
    const user = await openPanel();

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
    renderAt('/');
    const user = await openPanel();

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
    renderAt('/');
    const user = await openPanel();

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
    renderAt('/');
    const user = await openPanel();

    expect(sendButton()).toBeDisabled();

    await user.type(input(), '   ');
    expect(sendButton()).toBeDisabled();
    await user.keyboard('{Enter}');

    expect(mockSendAssistantTurn).not.toHaveBeenCalled();
    expect(eventsOf('turn')).toHaveLength(0);
  });

  it('closes the panel when the route becomes excluded, so it does not silently reopen on return', async () => {
    renderAt('/packages');
    const user = await openPanel();
    expect(screen.getByRole('dialog', { name: 'Travel assistant panel' })).toBeInTheDocument();

    // The widget never unmounts (App.tsx mounts it unconditionally) — it
    // just renders null on an excluded route, so `isOpen` state would
    // otherwise survive the round trip and pop back open unprompted.
    await user.click(screen.getByRole('button', { name: 'go-to-/planner' }));
    expect(screen.getByTestId('location-probe').textContent).toBe('/planner');
    expect(screen.queryByRole('button', { name: 'Travel assistant' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'go-to-/packages' }));
    expect(screen.getByTestId('location-probe').textContent).toBe('/packages');
    expect(screen.queryByRole('dialog', { name: 'Travel assistant panel' })).not.toBeInTheDocument();
  });
});
