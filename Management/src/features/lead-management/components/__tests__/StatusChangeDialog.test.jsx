import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusChangeDialog from '../StatusChangeDialog';

function renderDialog(props = {}) {
  return render(
    <StatusChangeDialog
      isOpen
      onClose={vi.fn()}
      lead={{ name: 'Chat Lead', lifecycleStatus: 'PENDING_VERIFICATION' }}
      onStatusChange={vi.fn()}
      {...props}
    />
  );
}

describe('StatusChangeDialog — PENDING_VERIFICATION', () => {
  it('renders only claim (NEW) and reject (CLOSED_LOST) options', () => {
    renderDialog();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Closed Lost')).toBeInTheDocument();

    // No other lifecycle status is a legal target from PENDING_VERIFICATION.
    expect(screen.queryByText('Drafting')).not.toBeInTheDocument();
    expect(screen.queryByText('Quoted')).not.toBeInTheDocument();
    expect(screen.queryByText('Revision')).not.toBeInTheDocument();
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();
    expect(screen.queryByText('Booking')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
  });

  it('claims the lead (NEW) when the claim option is clicked', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    renderDialog({ onStatusChange });

    await user.click(screen.getByText('New'));
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Chat Lead', lifecycleStatus: 'PENDING_VERIFICATION' }),
      'NEW',
      undefined
    );
  });
});
