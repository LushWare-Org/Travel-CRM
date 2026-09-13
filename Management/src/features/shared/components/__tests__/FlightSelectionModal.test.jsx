import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../../services/flight.service', () => ({
  flightAPI: { search: vi.fn(), bookOffer: vi.fn() },
}));

vi.mock('../../../../components/AirportAutocomplete', () => ({
  default: ({ value, onChange, placeholder }) => (
    <input
      aria-label={placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('../../../../components/PassengerSelector', () => ({
  default: () => <div data-testid="passenger-selector" />,
}));

vi.mock('@/lib/toast', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import FlightSelectionModal from '../FlightSelectionModal.tsx';
import { toast } from '@/lib/toast';

function renderModal(props = {}) {
  return render(
    <FlightSelectionModal
      isOpen={true}
      onClose={vi.fn()}
      mode="template"
      onSelectTemplate={vi.fn()}
      initialData={{}}
      {...props}
    />
  );
}

describe('FlightSelectionModal — template mode swap button', () => {
  it('swaps origin and destination when clicked', async () => {
    const user = userEvent.setup();
    renderModal({ initialData: { origin: 'CMB', destination: 'DXB' } });

    expect(screen.getByLabelText('Departure airport')).toHaveValue('CMB');
    expect(screen.getByLabelText('Arrival airport')).toHaveValue('DXB');

    await user.click(screen.getByTitle('Swap origin and destination'));

    expect(screen.getByLabelText('Departure airport')).toHaveValue('DXB');
    expect(screen.getByLabelText('Arrival airport')).toHaveValue('CMB');
  });

  it('swaps correctly when only one field was set', async () => {
    const user = userEvent.setup();
    renderModal({ initialData: { origin: 'CMB', destination: '' } });

    await user.click(screen.getByTitle('Swap origin and destination'));

    expect(screen.getByLabelText('Departure airport')).toHaveValue('');
    expect(screen.getByLabelText('Arrival airport')).toHaveValue('CMB');
  });

  it('is a no-op when neither field is set', async () => {
    const user = userEvent.setup();
    renderModal({ initialData: {} });

    await user.click(screen.getByTitle('Swap origin and destination'));

    expect(screen.getByLabelText('Departure airport')).toHaveValue('');
    expect(screen.getByLabelText('Arrival airport')).toHaveValue('');
  });

  it('submits the swapped values via onSelectTemplate', async () => {
    const onSelectTemplate = vi.fn();
    const user = userEvent.setup();
    renderModal({ initialData: { origin: 'CMB', destination: 'DXB' }, onSelectTemplate });

    await user.click(screen.getByTitle('Swap origin and destination'));
    await user.click(screen.getByRole('button', { name: /save flight preferences/i }));

    expect(onSelectTemplate).toHaveBeenCalledWith(expect.objectContaining({ origin: 'DXB', destination: 'CMB' }));
  });

  it('does not touch cabinClass or airlinePreference when swapping', async () => {
    const onSelectTemplate = vi.fn();
    const user = userEvent.setup();
    renderModal({
      initialData: { origin: 'CMB', destination: 'DXB', cabinClass: 'Business', airlinePreference: 'EK' },
      onSelectTemplate,
    });

    await user.click(screen.getByTitle('Swap origin and destination'));
    await user.click(screen.getByRole('button', { name: /save flight preferences/i }));

    expect(onSelectTemplate).toHaveBeenCalledWith(expect.objectContaining({ cabinClass: 'Business', airlinePreference: 'EK' }));
  });
});

describe('FlightSelectionModal — template mode estimated cost', () => {
  it('submits the entered estimated cost as estimatedUnitPrice', async () => {
    const onSelectTemplate = vi.fn();
    const user = userEvent.setup();
    renderModal({ onSelectTemplate });

    await user.type(screen.getByLabelText('Estimated Cost (per person)'), '250');
    await user.click(screen.getByRole('button', { name: /save flight preferences/i }));

    expect(onSelectTemplate).toHaveBeenCalledWith(expect.objectContaining({ estimatedUnitPrice: 250 }));
  });

  it('defaults to 0 when left blank', async () => {
    const onSelectTemplate = vi.fn();
    const user = userEvent.setup();
    renderModal({ onSelectTemplate });

    await user.click(screen.getByRole('button', { name: /save flight preferences/i }));

    expect(onSelectTemplate).toHaveBeenCalledWith(expect.objectContaining({ estimatedUnitPrice: 0 }));
  });

  it('prefills from initialData.estimatedUnitPrice when editing', () => {
    renderModal({ initialData: { origin: 'CMB', destination: 'DXB', estimatedUnitPrice: 180 } });
    expect(screen.getByLabelText('Estimated Cost (per person)')).toHaveValue(180);
  });

  it('mentions travelers-multiplication in the field hint', () => {
    renderModal();
    expect(screen.getByText(/multiplied by the number of travelers/i)).toBeInTheDocument();
  });
});

describe('FlightSelectionModal — template mode trip type', () => {
  it('renders no trip-type control unless the consumer opts in', () => {
    renderModal();

    expect(screen.queryByRole('tab', { name: 'Round Trip' })).not.toBeInTheDocument();
    expect(screen.queryByText('Return leg')).not.toBeInTheDocument();
  });

  it('offers One Way and Round Trip when allowRoundTrip is set', () => {
    renderModal({ allowRoundTrip: true });

    expect(screen.getByRole('tab', { name: 'One Way' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Round Trip' })).toBeInTheDocument();
  });

  it('emits tripType oneWay for a plain save', async () => {
    const onSelectTemplate = vi.fn();
    const user = userEvent.setup();
    renderModal({ allowRoundTrip: true, initialData: { origin: 'CMB', destination: 'DXB' }, onSelectTemplate });

    await user.click(screen.getByRole('button', { name: /save flight preferences/i }));

    expect(onSelectTemplate).toHaveBeenCalledWith(expect.objectContaining({ tripType: 'oneWay' }));
  });

  it('emits tripType oneWay even when the consumer has no control for it', async () => {
    const onSelectTemplate = vi.fn();
    const user = userEvent.setup();
    renderModal({ initialData: { origin: 'CMB', destination: 'DXB' }, onSelectTemplate });

    await user.click(screen.getByRole('button', { name: /save flight preferences/i }));

    expect(onSelectTemplate).toHaveBeenCalledWith(expect.objectContaining({ tripType: 'oneWay' }));
  });

  it('emits tripType roundTrip when Round Trip is selected', async () => {
    const onSelectTemplate = vi.fn();
    const user = userEvent.setup();
    renderModal({ allowRoundTrip: true, initialData: { origin: 'CMB', destination: 'DXB' }, onSelectTemplate });

    await user.click(screen.getByRole('tab', { name: 'Round Trip' }));
    await user.click(screen.getByRole('button', { name: /save flight preferences/i }));

    expect(onSelectTemplate).toHaveBeenCalledWith(expect.objectContaining({ tripType: 'roundTrip' }));
  });

  it('previews the return leg as the swapped route', async () => {
    const user = userEvent.setup();
    renderModal({ allowRoundTrip: true, initialData: { origin: 'CMB', destination: 'DXB' } });

    await user.click(screen.getByRole('tab', { name: 'Round Trip' }));

    expect(screen.getByText('Return leg')).toBeInTheDocument();
    expect(screen.getByText('DXB → CMB')).toBeInTheDocument();
  });

  it('keeps the return-leg preview in step with the swap button', async () => {
    const user = userEvent.setup();
    renderModal({ allowRoundTrip: true, initialData: { origin: 'CMB', destination: 'DXB' } });

    await user.click(screen.getByRole('tab', { name: 'Round Trip' }));
    expect(screen.getByText('DXB → CMB')).toBeInTheDocument();

    await user.click(screen.getByTitle('Swap origin and destination'));

    expect(screen.getByText('CMB → DXB')).toBeInTheDocument();
  });

  it('refuses to save a round trip with a blank airport', async () => {
    const onSelectTemplate = vi.fn();
    const user = userEvent.setup();
    renderModal({ allowRoundTrip: true, initialData: { origin: 'CMB', destination: '' }, onSelectTemplate });

    await user.click(screen.getByRole('tab', { name: 'Round Trip' }));
    await user.click(screen.getByRole('button', { name: /save flight preferences/i }));

    expect(onSelectTemplate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Origin and destination are required for a round trip');
  });

  it('re-seeds every field from initialData the next time it opens', () => {
    const { rerender } = renderModal({
      isOpen: false,
      initialData: { origin: 'CMB', destination: 'DXB', cabinClass: 'Business', airlinePreference: 'EK', departureTime: 'morning', estimatedUnitPrice: 180 },
    });

    rerender(
      <FlightSelectionModal
        isOpen
        onClose={vi.fn()}
        mode="template"
        onSelectTemplate={vi.fn()}
        allowRoundTrip
        initialData={{
          origin: 'DXB',
          destination: 'CMB',
          cabinClass: 'Economy',
          airlinePreference: 'QR',
          departureTime: 'evening',
          estimatedUnitPrice: 40,
          tripType: 'roundTrip',
        }}
      />,
    );

    expect(screen.getByLabelText('Departure airport')).toHaveValue('DXB');
    expect(screen.getByLabelText('Arrival airport')).toHaveValue('CMB');
    expect(screen.getByLabelText('Estimated Cost (per person)')).toHaveValue(40);
    expect(screen.getByDisplayValue('QR')).toBeInTheDocument();
    expect(screen.getByText('CMB → DXB')).toBeInTheDocument();
  });
});
