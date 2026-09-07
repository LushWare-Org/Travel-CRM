import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost, put: mockPut } }));

import { login, register, requestPasswordReset, resetPassword } from '../auth';

beforeEach(() => {
  mockPost.mockReset();
  mockPut.mockReset();
});

describe('login', () => {
  it('resolves with the parsed { token, user } on a well-formed response', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { token: 'jwt-1', user: { name: 'Jane', email: 'jane@example.com' } } },
    });
    const result = await login({ email: 'jane@example.com', password: 'secret' });
    expect(result).toEqual({ token: 'jwt-1', user: { name: 'Jane', email: 'jane@example.com' } });
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'jane@example.com', password: 'secret' });
  });

  it('rejects on a malformed response missing the user', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { token: 'jwt-1' } } });
    await expect(login({ email: 'jane@example.com', password: 'secret' })).rejects.toThrow();
  });

  it('sanitizes the outbound payload, dropping unknown keys before sending', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { token: 'jwt-1', user: { name: 'Jane', email: 'jane@example.com' } } },
    });
    await login({ email: 'jane@example.com', password: 'secret', evil: 'x' } as never);
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'jane@example.com', password: 'secret' });
  });
});

describe('register', () => {
  it('normalizes the phone number to digits-only before sending', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { token: 'jwt-1', user: { name: 'Jane', email: 'jane@example.com' } } },
    });
    await register({
      name: 'Jane', email: 'jane@example.com', phone: '+94 (77) 000-0000',
      password: 'secret1', confirmPassword: 'secret1',
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ phone: '94770000000' }));
  });
});

describe('password recovery', () => {
  it('requests a reset link with a trimmed validated email', async () => {
    mockPost.mockResolvedValue({
      data: {
        status: 'success',
        message: 'If an account exists with this email, a password reset link will be sent.',
      },
    });

    await expect(requestPasswordReset('  jane@example.com  ')).resolves.toMatch(
      /reset link will be sent/,
    );
    expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'jane@example.com',
    });
  });

  it('resets a password through the token route and validates the auth response', async () => {
    mockPut.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          token: 'jwt-2',
          user: { name: 'Jane', email: 'jane@example.com' },
        },
      },
    });

    await expect(resetPassword('token-123', 'new-secret')).resolves.toEqual({
      token: 'jwt-2',
      user: { name: 'Jane', email: 'jane@example.com' },
    });
    expect(mockPut).toHaveBeenCalledWith('/auth/reset-password/token-123', {
      password: 'new-secret',
    });
  });
});
