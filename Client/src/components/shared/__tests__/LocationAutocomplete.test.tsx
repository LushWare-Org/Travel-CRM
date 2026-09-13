import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationAutocomplete from '../LocationAutocomplete';

const nominatimResponse = [
  {
    place_id: 123,
    name: 'Colombo',
    display_name: 'Colombo, Western Province, Sri Lanka',
    lat: '6.9271',
    lon: '79.8612',
    address: { city: 'Colombo', state: 'Western Province', country: 'Sri Lanka' },
  },
];

describe('LocationAutocomplete', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the input with the default placeholder', () => {
    render(<LocationAutocomplete onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('e.g., Colombo, Sri Lanka')).toBeInTheDocument();
  });

  it('calls onChange and onSelect with the picked suggestion display name', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => nominatimResponse });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<LocationAutocomplete onChange={onChange} onSelect={onSelect} />);

    await user.type(screen.getByPlaceholderText('e.g., Colombo, Sri Lanka'), 'Colombo');

    // The search is debounced by 500ms after the last keystroke.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('nominatim.openstreetmap.org/search?q=Colombo'),
      expect.anything()
    );

    const suggestion = await screen.findByRole('button', {
      name: 'Colombo, Western Province, Sri Lanka',
    });
    await user.click(suggestion);

    expect(onChange).toHaveBeenCalledWith('Colombo, Western Province, Sri Lanka');
    expect(onSelect).toHaveBeenCalledWith('Colombo, Western Province, Sri Lanka');
  });

  it('keeps the list hidden after a pick when a debounced search was still pending', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => nominatimResponse });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<LocationAutocomplete onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('e.g., Colombo, Sri Lanka');
    await user.type(input, 'Colombo');
    const suggestion = await screen.findByRole('button', {
      name: 'Colombo, Western Province, Sri Lanka',
    });

    // One more keystroke leaves the 500ms debounce pending while the earlier
    // results are still on screen — the state a pick is normally made in.
    await user.type(input, 'x');
    await user.click(suggestion);

    // Let the whole debounce window pass before asserting, so a search that was
    // already scheduled has had every chance to put the list back.
    const debounceWindowEnds = Date.now() + 700;
    await vi.waitUntil(() => Date.now() >= debounceWindowEnds, { timeout: 3000, interval: 25 });

    expect(
      screen.queryByRole('button', { name: 'Colombo, Western Province, Sri Lanka' })
    ).not.toBeInTheDocument();
  });

  it('clears the value via the clear button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LocationAutocomplete value="Colombo" onChange={onChange} />);

    await user.click(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
