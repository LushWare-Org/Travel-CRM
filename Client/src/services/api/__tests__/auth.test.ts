import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { login, register } from '../auth';

beforeEach(() => {
  mockPost.mockReset();
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
