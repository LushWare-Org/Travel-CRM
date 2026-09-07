import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPasswordPage from '../../../pages/ResetPasswordPage';
import { resetPassword } from '../../../services/api/auth';

vi.mock('../../../services/api/auth', () => ({
  resetPassword: vi.fn(),
}));

const resetPasswordMock = vi.mocked(resetPassword);

const renderPage = (path = '/reset-password/token-123') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    resetPasswordMock.mockReset();
    resetPasswordMock.mockResolvedValue({ token: 'jwt-2', user: {} } as never);
  });

  it('blocks mismatched passwords before calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    const [password, confirmation] = screen.getAllByLabelText(/Password/i);
    await user.type(password, 'new-secret');
    await user.type(confirmation, 'different-secret');
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('submits the route token and provides a return-to-login action', async () => {
    const user = userEvent.setup();
    renderPage();

    const [password, confirmation] = screen.getAllByLabelText(/Password/i);
    await user.type(password, 'new-secret');
    await user.type(confirmation, 'new-secret');
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(resetPasswordMock).toHaveBeenCalledWith('token-123', 'new-secret');
    expect(await screen.findByRole('heading', { name: 'Password reset successfully' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to sign in' })).toHaveAttribute('href', '/login');
  });
});
