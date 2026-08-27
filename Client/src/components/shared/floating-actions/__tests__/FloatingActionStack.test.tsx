import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// FLOATING_ACTIONS_CONFIG reads import.meta.env at module-evaluation time,
// so each test stubs env and re-imports both the config and the component
// fresh via vi.resetModules() (see config/__tests__/pages.test.ts for the
// same pattern — dynamic import is intentional here for the same reason).
const renderStack = async () => {
  const { default: FloatingActionStack } = await import('../FloatingActionStack');
  render(<FloatingActionStack />);
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

  it('renders the remaining buttons without a gap when one is disabled', async () => {
    vi.stubEnv('VITE_FEATURE_CALL_BUTTON', 'false');
    await renderStack();

    expect(screen.getByLabelText('Chat on WhatsApp')).toBeInTheDocument();
    expect(screen.queryByLabelText('Call us')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();

    // WhatsApp stays at index 0 (bottom: 16px); with Call disabled,
    // ScrollTop moves into index 1's slot (bottom: 16 + 68 = 84px) instead
    // of index 2's (152px) — confirms no gap is left in the stack.
    const scrollTopWrapper = screen.getByLabelText('Scroll to top').parentElement;
    expect(scrollTopWrapper).toHaveStyle({ bottom: '84px' });
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
