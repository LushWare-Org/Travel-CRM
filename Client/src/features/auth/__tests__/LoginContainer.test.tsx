import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, type MemoryRouterProps } from 'react-router-dom';
import LoginContainer from '../LoginContainer';
import { setPostLoginRedirect } from '../../../services/auth/tokenStorage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));

// Mock the untyped AuthContext module boundary so the container's
// useAuth() destructuring is controllable without hitting real storage/API.
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

const renderContainer = () =>
  render(
    <MemoryRouter>
      <LoginContainer />
    </MemoryRouter>
  );

/** Renders the container next to a probe that reports the router location,
 *  so tests can assert where a successful submit navigated to. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="current-location">{location.pathname + location.search}</span>;
}

const renderWithLocationProbe = (
  initialEntries: MemoryRouterProps['initialEntries'] = ['/login'],
) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <LoginContainer />
      <LocationProbe />
    </MemoryRouter>
  );

const fillValidLogin = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
  await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
};

describe('LoginContainer', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.register.mockReset();
    mocks.login.mockResolvedValue({});
    mocks.register.mockResolvedValue({});
    sessionStorage.clear();
  });

  it('renders the login form by default', () => {
    renderContainer();

    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
  });

  it('submits valid credentials to the mocked login with the exact payload', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.type(screen.getByPlaceholderText('you@example.com'), '  user@example.com  ');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(mocks.login).toHaveBeenCalledTimes(1);
    // email is trimmed by the zod schema before it reaches useAuth().login
    expect(mocks.login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret123' });
  });

  it('shows the error message when the mocked login rejects', async () => {
    mocks.login.mockRejectedValueOnce(new Error('Invalid email or password'));
    const user = userEvent.setup();
    renderContainer();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('shows a field-level validation error and skips register when passwords do not match', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwordInputs[0], 'password123');
    await user.type(passwordInputs[1], 'password124');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    // zod's password-match refine points at confirmPassword, so the error
    // surfaces as a field-level Form error rather than a top-of-form string.
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('blocks register with a friendly field error when full name is left blank (matches the RegisterRequest contract requiring name)', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByRole('button', { name: 'Register' }));
    await user.type(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwordInputs[0], 'password123');
    await user.type(passwordInputs[1], 'password123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('redirects to location.state.from after a successful login', async () => {
    const user = userEvent.setup();
    renderWithLocationProbe([
      { pathname: '/login', state: { from: { pathname: '/my-account', search: '' } } },
    ]);

    await fillValidLogin(user);

    expect(await screen.findByTestId('current-location')).toHaveTextContent('/my-account');
  });

  it('redirects to the session-expiry redirect target after a successful login', async () => {
    // Simulates the 401 interceptor having bounced the visitor here mid-flow.
    setPostLoginRedirect('/planner?step=2');
    const user = userEvent.setup();
    renderWithLocationProbe(['/login']);

    await fillValidLogin(user);

    expect(await screen.findByTestId('current-location')).toHaveTextContent('/planner?step=2');
  });

  it('falls back to / when neither a router state target nor a stored redirect exists', async () => {
    const user = userEvent.setup();
    renderWithLocationProbe(['/login']);

    await fillValidLogin(user);

    expect(await screen.findByTestId('current-location')).toHaveTextContent('/');
  });
});
