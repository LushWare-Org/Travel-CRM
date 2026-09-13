import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfferCard from '../OfferCard';

const seg = (origin, destination, departureAt, arrivalAt, durationMinutes, sequence) => ({
  origin,
  destination,
  departureAt,
  arrivalAt,
  durationMinutes,
  sequence,
});

// One offer per live shape: a nonstop round trip (1 + 1 slices) and a round trip
// with one connection each way (2 + 1 slices).
const NONSTOP_ROUND_TRIP = {
  offerId: 'off-rt-nonstop',
  airline: 'Emirates',
  airlineCode: 'EK',
  cabinClass: 'Economy',
  fareTotal: 620,
  currency: 'USD',
  legCount: 2,
  segments: [
    seg('LHR', 'DXB', '2026-08-01T08:00:00Z', '2026-08-01T15:00:00Z', 420, 1),
    seg('DXB', 'LHR', '2026-08-08T08:00:00Z', '2026-08-08T15:10:00Z', 430, 101),
  ],
};

const CONNECTING_ROUND_TRIP = {
  offerId: 'off-rt-connecting',
  airline: 'Emirates',
  airlineCode: 'EK',
  cabinClass: 'Economy',
  fareTotal: 700,
  currency: 'USD',
  legCount: 2,
  segments: [
    seg('LHR', 'IST', '2026-08-01T08:00:00Z', '2026-08-01T12:00:00Z', 240, 1),
    seg('IST', 'DXB', '2026-08-01T13:00:00Z', '2026-08-01T18:00:00Z', 300, 2),
    seg('DXB', 'LHR', '2026-08-08T08:00:00Z', '2026-08-08T15:00:00Z', 420, 101),
  ],
};

const CONNECTING_ONE_WAY = {
  offerId: 'off-ow-connecting',
  airline: 'Emirates',
  airlineCode: 'EK',
  cabinClass: 'Economy',
  fareTotal: 300,
  currency: 'USD',
  legCount: 1,
  segments: [
    seg('LHR', 'IST', '2026-08-01T08:00:00Z', '2026-08-01T12:00:00Z', 240, 1),
    seg('IST', 'DXB', '2026-08-01T13:00:00Z', '2026-08-01T18:00:00Z', 300, 2),
  ],
};

function renderCard(offer, turnPoint) {
  return render(<OfferCard offer={offer} onSelect={vi.fn()} paxCount={1} turnPoint={turnPoint} />);
}

describe('OfferCard legs', () => {
  it('reads a nonstop round trip as one nonstop row per leg', () => {
    renderCard(NONSTOP_ROUND_TRIP, 'DXB');

    expect(screen.getAllByText('Nonstop')).toHaveLength(2);
    expect(screen.queryByText(/\d+ stops?$/)).toBeNull();
    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(screen.getByText('Outbound')).toBeInTheDocument();
    expect(screen.getByText('Return')).toBeInTheDocument();
  });

  it('counts stops per leg instead of across the whole journey', () => {
    renderCard(CONNECTING_ROUND_TRIP, 'DXB');

    expect(screen.getByText('Outbound')).toBeInTheDocument();
    expect(screen.getByText('Return')).toBeInTheDocument();
    // Outbound connects once (LHR → IST → DXB); the return is nonstop.
    expect(screen.getByText('1 stop')).toBeInTheDocument();
    expect(screen.getByText('Nonstop')).toBeInTheDocument();
    expect(screen.queryByText('Direct')).toBeNull();
  });

  it('renders a connecting one-way as one unlabelled row', () => {
    renderCard(CONNECTING_ONE_WAY, 'DXB');

    expect(screen.queryByText('Outbound')).toBeNull();
    expect(screen.queryByText('Return')).toBeNull();
    expect(screen.getByText('1 stop')).toBeInTheDocument();
    expect(screen.queryByText('Direct')).toBeNull();
  });
});
