import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlightPreferenceCard from '../FlightPreferenceCard.jsx';

const prefs = {
  origin: 'CMB',
  destination: 'DXB',
  cabinClass: 'Business',
  airlinePreference: 'EK',
  departureTime: 'morning',
};

describe('FlightPreferenceCard', () => {
  it('renders nothing when prefs is null', () => {
    const { container } = render(<FlightPreferenceCard prefs={null} onEdit={vi.fn()} onRemove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the origin/destination and preference summary', () => {
    render(<FlightPreferenceCard prefs={prefs} onEdit={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('CMB → DXB')).toBeInTheDocument();
    expect(screen.getByText(/business.*ek.*morning/i)).toBeInTheDocument();
  });

  it('falls back to "?" for missing origin/destination', () => {
    render(<FlightPreferenceCard prefs={{}} onEdit={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('? → ?')).toBeInTheDocument();
  });

  it('defaults cabin class to Economy when unset', () => {
    render(<FlightPreferenceCard prefs={{ origin: 'CMB', destination: 'DXB' }} onEdit={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/economy/i)).toBeInTheDocument();
  });

  it('calls onEdit when the card itself is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<FlightPreferenceCard prefs={prefs} onEdit={onEdit} onRemove={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /edit flight preferences: cmb to dxb/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when the pencil icon is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<FlightPreferenceCard prefs={prefs} onEdit={onEdit} onRemove={vi.fn()} />);

    await user.click(screen.getByTitle('Edit preferences'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when Enter is pressed while the card is focused', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<FlightPreferenceCard prefs={prefs} onEdit={onEdit} onRemove={vi.fn()} />);

    screen.getByRole('button', { name: /edit flight preferences: cmb to dxb/i }).focus();
    await user.keyboard('{Enter}');
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove without also calling onEdit when Remove is clicked', async () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<FlightPreferenceCard prefs={prefs} onEdit={onEdit} onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('does not call onEdit twice when the pencil (inside the card) is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<FlightPreferenceCard prefs={prefs} onEdit={onEdit} onRemove={vi.fn()} />);

    await user.click(screen.getByTitle('Edit preferences'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
