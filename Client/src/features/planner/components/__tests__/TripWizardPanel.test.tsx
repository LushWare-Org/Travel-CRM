import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripWizardPanel from '../TripWizardPanel';
import { sendWizardTurn } from '../../../../services/api/wizardTurn';
import type { WizardTurnResultT } from '../../../../services/api/wizardTurn';

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('../../../../services/api/wizardTurn', () => ({
  sendWizardTurn: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

const sendWizardTurnMock = vi.mocked(sendWizardTurn);

const getSendButton = (): HTMLButtonElement =>
  screen.getByPlaceholderText('Tell us about your trip...').parentElement!.querySelector('button') as HTMLButtonElement;

beforeEach(() => {
  sendWizardTurnMock.mockReset();
  mocks.navigate.mockReset();
});

describe('TripWizardPanel', () => {
  it('renders the greeting on mount', () => {
    render(<TripWizardPanel />);
    expect(screen.getByText(/find real packages that match/)).toBeInTheDocument();
  });

  it('a set_slot turn shows the assistant message and disables the send button while in flight (no duplicate submit)', async () => {
    // Executor form (not Promise.withResolvers) — this project's tsconfig
    // targets ES2020/lib ES2020, which predates withResolvers.
    let resolve: (value: WizardTurnResultT) => void = () => {};
    const promise = new Promise<WizardTurnResultT>((res) => {
      resolve = res;
    });
    sendWizardTurnMock.mockReturnValue(promise);
    const user = userEvent.setup();
    render(<TripWizardPanel />);
    const input = screen.getByPlaceholderText('Tell us about your trip...');
    await user.type(input, 'Bali');
    const sendButton = getSendButton();
    await user.click(sendButton);

    expect(sendButton).toBeDisabled();
    expect(sendWizardTurnMock).toHaveBeenCalledTimes(1);
    await user.click(sendButton);
    expect(sendWizardTurnMock).toHaveBeenCalledTimes(1);

    resolve({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: { slots: { destination: 'Bali' } },
      uiComponent: 'slotPrompt',
      message: 'How long is your trip?',
    });
    expect(await screen.findByText('How long is your trip?')).toBeInTheDocument();
  });

  it('a propose_packages turn renders package cards; selecting one sends the next turn', async () => {
    sendWizardTurnMock.mockResolvedValueOnce({
      toolCall: { tool: 'propose_packages', args: {} },
      serverResult: {
        packages: [
          { id: 'pkg-1', title: 'Bali Beach Escape', destination: 'Bali', durationDays: 5, sellPrice: 999, currency: 'USD', rating: 4.5 },
        ],
      },
      updatedWizardState: { slots: { destination: 'Bali', duration: 5 } },
      uiComponent: 'packageCards',
      message: 'Here are some options!',
    });
    sendWizardTurnMock.mockResolvedValueOnce({
      toolCall: { tool: 'complete_wizard', args: {} },
      serverResult: { package: { id: 'pkg-1', title: 'Bali Beach Escape' } },
      updatedWizardState: { selectedPackageId: 'pkg-1' },
      uiComponent: 'complete',
      message: 'Great choice!',
    });

    const user = userEvent.setup();
    render(<TripWizardPanel />);
    await user.type(screen.getByPlaceholderText('Tell us about your trip...'), 'Show me options');
    await user.click(getSendButton());

    expect(await screen.findByText('Bali Beach Escape')).toBeInTheDocument();

    await user.click(screen.getByText('Bali Beach Escape'));

    expect(sendWizardTurnMock).toHaveBeenLastCalledWith(expect.objectContaining({
      wizardState: expect.objectContaining({ selectedPackageId: 'pkg-1' }),
    }));
    await screen.findByText('Great choice!');
    expect(mocks.navigate).toHaveBeenCalledWith('/package/pkg-1/customize', expect.objectContaining({ state: expect.anything() }));
  });

  it('an answered policy question renders the server-verified quote', async () => {
    sendWizardTurnMock.mockResolvedValue({
      toolCall: { tool: 'answer_policy_question', args: {} },
      serverResult: { answered: true, snippets: [{ docId: 'doc-1', title: 'Refund Policy', quote: 'Full refund within 24h.' }] },
      updatedWizardState: {},
      uiComponent: 'policyAnswer',
      message: "Here's what our policy says:",
    });
    const user = userEvent.setup();
    render(<TripWizardPanel />);

    await user.type(screen.getByPlaceholderText('Tell us about your trip...'), 'What is your refund policy?');
    await user.click(getSendButton());

    expect(await screen.findByText('Full refund within 24h.')).toBeInTheDocument();
  });

  it('a rejected turn shows the error banner with a working Retry button', async () => {
    sendWizardTurnMock.mockRejectedValueOnce(new Error('offline'));
    sendWizardTurnMock.mockResolvedValueOnce({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: {},
      uiComponent: 'slotPrompt',
      message: 'Back online!',
    });
    const user = userEvent.setup();
    render(<TripWizardPanel />);

    await user.type(screen.getByPlaceholderText('Tell us about your trip...'), 'Hi');
    await user.click(getSendButton());

    expect(await screen.findByText('offline')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Back online!')).toBeInTheDocument();
  });
});
