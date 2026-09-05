import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// FLOATING_ACTIONS_CONFIG reads import.meta.env at module-evaluation time,
// so each test stubs env and re-imports both the config and the component
// fresh via vi.resetModules() (see config/__tests__/pages.test.ts for the
// same pattern — dynamic import is intentional here for the same reason).
// FloatingActionStack reads the route via useLocation (to reserve the
// assistant's slot), so every render needs a Router ancestor.
const renderStack = async (path = '/') => {
  const { default: FloatingActionStack } = await import('../FloatingActionStack');
  render(
    <MemoryRouter initialEntries={[path]}>
      <FloatingActionStack />
    </MemoryRouter>
  );
};

describe('FloatingActionStack', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('renders all three buttons when every toggle is enabled (default)', async () => {
    await renderStack();
    expect(screen.getByLabelText('Chat on WhatsApp')).toBeInTheDocument();
    expect(screen.getByLabelText('Call us')).toBeInTheDocument();
    expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();
  });

  it('reserves the assistant launcher slot, pushing ScrollTop above it, on a route where the assistant mounts', async () => {
    await renderStack('/');
    // Call(0)/WhatsApp(1) take slots 16px/84px; the assistant launcher
    // (rendered separately by AssistantWidget) reserves slot 152px; ScrollTop
    // shifts up to 220px instead of colliding with it.
    const scrollTopWrapper = screen.getByLabelText('Scroll to top').parentElement;
    expect(scrollTopWrapper).toHaveStyle({ bottom: '220px' });
  });

  it('does not reserve the assistant slot on a route where the assistant is excluded', async () => {
    await renderStack('/planner');
    // No reservation: ScrollTop stays at its plain index-2 slot (152px).
    const scrollTopWrapper = screen.getByLabelText('Scroll to top').parentElement;
    expect(scrollTopWrapper).toHaveStyle({ bottom: '152px' });
  });

  it('renders the remaining buttons without a gap when one is disabled', async () => {
    vi.stubEnv('VITE_FEATURE_CALL_BUTTON', 'false');
    await renderStack();

    expect(screen.getByLabelText('Chat on WhatsApp')).toBeInTheDocument();
    expect(screen.queryByLabelText('Call us')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();

    // Call is disabled; WhatsApp is now the sole remaining item ahead of
    // ScrollTop in stack order, taking index 0's slot (bottom: 16px).
    // ScrollTop would move into index 1's slot (84px), but the assistant's
    // reserved slot (this test's route, '/', is not excluded) still adds
    // one more step: 16 + 68 + 68 = 152px — no gap, no collision.
    const scrollTopWrapper = screen.getByLabelText('Scroll to top').parentElement;
    expect(scrollTopWrapper).toHaveStyle({ bottom: '152px' });
  });

  it('renders nothing when every toggle is disabled', async () => {
    vi.stubEnv('VITE_FEATURE_WHATSAPP_BUTTON', 'false');
    vi.stubEnv('VITE_FEATURE_CALL_BUTTON', 'false');
    vi.stubEnv('VITE_FEATURE_SCROLL_TOP', 'false');
    await renderStack();

    expect(screen.queryByLabelText('Chat on WhatsApp')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Call us')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Scroll to top')).not.toBeInTheDocument();
  });
});
