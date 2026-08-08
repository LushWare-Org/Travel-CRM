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

vi.mock('react-hot-toast', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import FlightSelectionModal from '../FlightSelectionModal.jsx';

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
