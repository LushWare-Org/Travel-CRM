import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DestinationSelector from '../DestinationSelector';

describe('destination selector accessibility', () => {
  it('opens from the keyboard through a semantic expanded-state trigger', async () => {
    const user = userEvent.setup();
    render(<DestinationSelector onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Select Destination' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByPlaceholderText('Search destinations...')).toHaveFocus();
  });
});
