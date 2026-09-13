import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationSelector from '../LocationSelector';

describe('LocationSelector', () => {
  it('renders the toggle button and help text when empty', () => {
    render(<LocationSelector onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Add Locations' })).toBeInTheDocument();
    expect(screen.getByText(/Click "Add Locations"/)).toBeInTheDocument();
  });

  it('lists destination locations and calls onChange when one is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LocationSelector onChange={onChange} destination="Bali, Indonesia" />);

    await user.click(screen.getByRole('button', { name: 'Add Locations' }));
    expect(screen.getByText('Popular Locations in Bali, Indonesia')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Uluwatu Temple' }));

    expect(onChange).toHaveBeenCalledWith(['Uluwatu Temple']);
  });

  it('accepts a destination object like the one DestinationSelector emits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <LocationSelector
        onChange={onChange}
        destination={{ value: 'Bali', label: 'Bali, Indonesia' }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add Locations' }));
    expect(screen.getByText('Popular Locations in Bali, Indonesia')).toBeInTheDocument();
  });
});
