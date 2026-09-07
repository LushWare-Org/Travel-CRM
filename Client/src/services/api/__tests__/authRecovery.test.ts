import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost, put: mockPut } }));

import { requestPasswordReset, resetPassword } from '../auth';

beforeEach(() => {
  mockPost.mockReset();
  mockPut.mockReset();
});

describe('password recovery API', () => {
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
