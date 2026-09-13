import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginContainer from '../LoginContainer';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    login: mocks.login,
    register: mocks.register,
    logout: vi.fn(),
    isAuthenticated: false,
  }),
}));

vi.mock('../../../services/api/auth', () => ({
  requestPasswordReset: mocks.requestPasswordReset,
}));

describe('password recovery regression', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.register.mockReset();
    mocks.requestPasswordReset.mockReset();
    mocks.requestPasswordReset.mockResolvedValue(
      'If an account exists with this email, a password reset link will be sent.',
    );
  });

  it('replaces the dead link with a working reset request and return action', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent('reset link will be sent');

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
  });
});
