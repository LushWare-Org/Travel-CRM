import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DestinationSelector from '../DestinationSelector';

describe('DestinationSelector', () => {
  it('renders the default placeholder when no value is selected', () => {
    render(<DestinationSelector onChange={vi.fn()} />);
    expect(screen.getByText('Select Destination')).toBeInTheDocument();
  });

  it('renders a custom placeholder when provided', () => {
    render(<DestinationSelector onChange={vi.fn()} placeholder="Choose your destination..." />);
    expect(screen.getByText('Choose your destination...')).toBeInTheDocument();
  });

  it('calls onChange with the destination option when one is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DestinationSelector onChange={onChange} />);

    await user.click(screen.getByText('Select Destination'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ value: 'Bali', label: 'Bali, Indonesia' });
  });

  it('adds a typed custom destination via the custom input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DestinationSelector onChange={onChange} />);

    await user.click(screen.getByText('Select Destination'));
    await user.type(screen.getByPlaceholderText('Type custom destination...'), 'Mars Colony');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith({ value: 'Mars Colony', label: 'Mars Colony' });
  });

  it('shows the selected value label once chosen', () => {
    render(
      <DestinationSelector
        onChange={vi.fn()}
        value={{ value: 'Bali', label: 'Bali, Indonesia' }}
      />
    );
    expect(screen.getByText('Bali, Indonesia')).toBeInTheDocument();
  });
});
