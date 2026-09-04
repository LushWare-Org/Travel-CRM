import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItineraryChatPanel from '../ItineraryChatPanel';
import { sendItineraryChatMessage } from '../../../../services/api/itineraryChat';

vi.mock('../../../../services/api/itineraryChat', () => ({
  sendItineraryChatMessage: vi.fn(),
}));

const sendItineraryChatMessageMock = vi.mocked(sendItineraryChatMessage);

const CURRENT_MONTH_DAY_A = 15;
const CURRENT_MONTH_DAY_B = 19;

/** The send button is icon-only (no accessible name) — select it relative to the input. */
const getSendButton = (): HTMLButtonElement =>
  screen.getByPlaceholderText('Tell us about your trip...').parentElement!.querySelector('button') as HTMLButtonElement;

beforeAll(() => {
  // DateRangeCalendar's outside-click-to-close listener isn't exercised here.
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  sendItineraryChatMessageMock.mockReset();
});

describe('ItineraryChatPanel', () => {
  it('renders the greeting bubble on mount', () => {
    render(<ItineraryChatPanel onReady={vi.fn()} />);
    expect(screen.getByText(/Tell me about the trip you're dreaming of/)).toBeInTheDocument();
  });

  it('typing and sending a message shows the user bubble immediately and disables the send button while sending', async () => {
    // Executor form (not Promise.withResolvers) — this project's tsconfig
    // targets ES2020/lib ES2020, which predates withResolvers.
    let resolve: (value: { reply: string; slots: { destination: string }; readyToGenerate: boolean }) => void = () => {};
    const promise = new Promise<{ reply: string; slots: { destination: string }; readyToGenerate: boolean }>((res) => {
      resolve = res;
    });
    sendItineraryChatMessageMock.mockReturnValue(promise);
    const user = userEvent.setup();
    render(<ItineraryChatPanel onReady={vi.fn()} />);

    const input = screen.getByPlaceholderText('Tell us about your trip...');
    await user.type(input, 'A trip to Kandy');
    const sendButton = getSendButton();
    await user.click(sendButton);

    expect(screen.getByText('A trip to Kandy')).toBeInTheDocument();
    expect(sendButton).toBeDisabled();

    resolve({ reply: 'How long?', slots: { destination: 'Kandy' }, readyToGenerate: false });
    await screen.findByText('How long?');
  });

  it('after the mocked API resolves with readyToGenerate: false, only the assistant reply renders (no date picker)', async () => {
    sendItineraryChatMessageMock.mockResolvedValue({ reply: 'How long is your trip?', slots: { destination: 'Kandy' }, readyToGenerate: false });
    const user = userEvent.setup();
    render(<ItineraryChatPanel onReady={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Tell us about your trip...'), 'Kandy');
    await user.click(getSendButton());

    expect(await screen.findByText('How long is your trip?')).toBeInTheDocument();
    expect(screen.queryByText(/Confirm your travel dates/)).not.toBeInTheDocument();
  });

  it('after the mocked API resolves with readyToGenerate: true, the inline confirmation card and calendar render, and selecting dates calls onReady', async () => {
    sendItineraryChatMessageMock.mockResolvedValue({
      reply: 'Sounds great!',
      slots: { destination: 'Bali', duration: 5 },
      readyToGenerate: true,
    });
    const onReady = vi.fn();
    const user = userEvent.setup();
    render(<ItineraryChatPanel onReady={onReady} />);

    await user.type(screen.getByPlaceholderText('Tell us about your trip...'), '5 days in Bali');
    await user.click(getSendButton());

    expect(await screen.findByText(/Sounds like a 5-day trip to Bali!/)).toBeInTheDocument();

    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));

    expect(onReady).toHaveBeenCalledWith(
      expect.objectContaining({ destination: 'Bali', travelers: undefined, preferences: undefined }),
    );
  });

  it('a rejected send shows the error banner with a working Retry button', async () => {
    sendItineraryChatMessageMock.mockRejectedValueOnce(new Error('offline'));
    sendItineraryChatMessageMock.mockResolvedValueOnce({ reply: 'Back online!', slots: {}, readyToGenerate: false });
    const user = userEvent.setup();
    render(<ItineraryChatPanel onReady={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Tell us about your trip...'), 'Hi');
    await user.click(getSendButton());

    expect(await screen.findByText('offline')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Back online!')).toBeInTheDocument();
  });
});
