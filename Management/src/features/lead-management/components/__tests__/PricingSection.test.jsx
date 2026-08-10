import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockCalculateSelectionPricing, mockPreviewPricing } = vi.hoisted(() => ({
  mockCalculateSelectionPricing: vi.fn(),
  mockPreviewPricing: vi.fn(),
}));

vi.mock('../../../../services/api', () => ({
  leadAPI: { calculateSelectionPricing: mockCalculateSelectionPricing, previewPricing: mockPreviewPricing },
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import PricingSection from '../PricingSection.jsx';

const financialsFixture = (overrides = {}) => ({
  estimatedTotal: 1000,
  sellSubtotal: 1100,
  taxAmount: 198,
  totalAmount: 1298,
  depositAmount: 389.4,
  ...overrides,
});

beforeEach(() => {
  mockCalculateSelectionPricing.mockReset();
  mockPreviewPricing.mockReset();
  mockCalculateSelectionPricing.mockResolvedValue({ data: { financials: financialsFixture() } });
  mockPreviewPricing.mockResolvedValue({ data: { financials: financialsFixture() } });
});

describe('PricingSection — leadId/selectionId routing', () => {
  it('calls calculateSelectionPricing when both leadId and selectionId are present', async () => {
    render(<PricingSection leadId="lead-1" selectionId="sel-1" days={[]} travelers={2} />);

    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledWith('lead-1', 'sel-1', expect.objectContaining({ days: [], travelers: 2 })));
    expect(mockPreviewPricing).not.toHaveBeenCalled();
  });

  it('calls previewPricing when there is no leadId (new lead)', async () => {
    render(<PricingSection days={[]} travelers={1} />);

    await waitFor(() => expect(mockPreviewPricing).toHaveBeenCalled());
    expect(mockCalculateSelectionPricing).not.toHaveBeenCalled();
  });

  it('calls previewPricing when leadId is present but selectionId is not (no package attached yet)', async () => {
    render(<PricingSection leadId="lead-1" days={[]} travelers={1} />);

    await waitFor(() => expect(mockPreviewPricing).toHaveBeenCalled());
    expect(mockCalculateSelectionPricing).not.toHaveBeenCalled();
  });
});

describe('PricingSection — recomputes on relevant changes', () => {
  it('recomputes when days changes', async () => {
    const { rerender } = render(<PricingSection leadId="lead-1" selectionId="sel-1" days={[]} travelers={2} />);
    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledTimes(1));
    mockCalculateSelectionPricing.mockClear();

    rerender(<PricingSection leadId="lead-1" selectionId="sel-1" days={[{ dayNumber: 1 }]} travelers={2} />);

    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledTimes(1));
  });

  it('recomputes when travelers changes', async () => {
    const { rerender } = render(<PricingSection leadId="lead-1" selectionId="sel-1" days={[]} travelers={2} />);
    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledTimes(1));
    mockCalculateSelectionPricing.mockClear();

    rerender(<PricingSection leadId="lead-1" selectionId="sel-1" days={[]} travelers={3} />);

    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledWith('lead-1', 'sel-1', expect.objectContaining({ travelers: 3 })));
  });

  it('recomputes when the active selection tab changes', async () => {
    const { rerender } = render(<PricingSection leadId="lead-1" selectionId="sel-1" days={[]} travelers={2} />);
    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledTimes(1));
    mockCalculateSelectionPricing.mockClear();

    rerender(<PricingSection leadId="lead-1" selectionId="sel-2" days={[]} travelers={2} />);

    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledWith('lead-1', 'sel-2', expect.anything()));
  });
});

describe('PricingSection — refreshToken (transfer flight changes)', () => {
  it('recomputes when refreshToken changes even though days/travelers/settings are unchanged', async () => {
    const days = [];
    const { rerender } = render(<PricingSection leadId="lead-1" selectionId="sel-1" days={days} travelers={2} refreshToken={0} />);
    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledTimes(1));
    mockCalculateSelectionPricing.mockClear();

    // Same days reference, same travelers — only refreshToken bumps, as
    // EditLeadDialog does after LeadFlightBookingsSection reports a change.
    rerender(<PricingSection leadId="lead-1" selectionId="sel-1" days={days} travelers={2} refreshToken={1} />);

    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledTimes(1));
  });

  it('does not recompute on a re-render where nothing — including refreshToken — changed', async () => {
    const days = [];
    const { rerender } = render(<PricingSection leadId="lead-1" selectionId="sel-1" days={days} travelers={2} refreshToken={0} />);
    await waitFor(() => expect(mockCalculateSelectionPricing).toHaveBeenCalledTimes(1));
    mockCalculateSelectionPricing.mockClear();

    rerender(<PricingSection leadId="lead-1" selectionId="sel-1" days={days} travelers={2} refreshToken={0} />);

    // Give the (non-existent) debounce a moment, then confirm it never fired.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(mockCalculateSelectionPricing).not.toHaveBeenCalled();
  });

  it('reflects the updated total after a refreshToken-triggered recompute', async () => {
    mockCalculateSelectionPricing.mockResolvedValueOnce({ data: { financials: financialsFixture({ totalAmount: 1298 }) } });
    const { rerender } = render(<PricingSection leadId="lead-1" selectionId="sel-1" days={[]} travelers={2} refreshToken={0} />);
    expect(await screen.findByText('$1,298.00')).toBeInTheDocument();

    // A transfer flight was just added server-side — same days, new total.
    mockCalculateSelectionPricing.mockResolvedValueOnce({ data: { financials: financialsFixture({ totalAmount: 1798 }) } });
    rerender(<PricingSection leadId="lead-1" selectionId="sel-1" days={[]} travelers={2} refreshToken={1} />);

    expect(await screen.findByText('$1,798.00')).toBeInTheDocument();
  });
});
