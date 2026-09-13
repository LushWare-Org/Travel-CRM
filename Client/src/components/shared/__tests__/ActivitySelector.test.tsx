import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivitySelector from '../ActivitySelector';

describe('ActivitySelector', () => {
  it('renders the toggle button and help text when empty', () => {
    render(<ActivitySelector activities={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Add Activities' })).toBeInTheDocument();
    expect(screen.getByText(/Click "Add Activities"/)).toBeInTheDocument();
  });

  it('calls onChange with the picked activity label when one is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ActivitySelector activities={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add Activities' }));
    await user.click(screen.getByRole('button', { name: 'City Tour' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['City Tour']);
  });

  it('calls onChange with the remaining activities when a chip is removed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <ActivitySelector activities={['City Tour', 'Safari']} onChange={onChange} />
    );

    // The chip remove buttons render before the "Add Activities" toggle.
    const removeButtons = container.querySelectorAll('button');
    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(['Safari']);
  });

  it('accepts a comma-separated string of activities', () => {
    render(<ActivitySelector activities="City Tour, Safari" onChange={vi.fn()} />);
    expect(screen.getByText('City Tour')).toBeInTheDocument();
    expect(screen.getByText('Safari')).toBeInTheDocument();
  });
});
