import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPut = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { put: mockPut } }));

import { updateProfile } from '../account';

beforeEach(() => {
  mockPut.mockReset();
});

describe('updateProfile', () => {
  it('resolves with the parsed { user } on a well-formed response', async () => {
    mockPut.mockResolvedValue({
      data: { status: 'success', data: { user: { name: 'Jane', email: 'jane@example.com', phone: '123' } } },
    });
    const result = await updateProfile({ name: 'Jane', email: 'jane@example.com', phone: '123' });
    expect(result).toEqual({ user: { name: 'Jane', email: 'jane@example.com', phone: '123' } });
    expect(mockPut).toHaveBeenCalledWith('/users/profile', { name: 'Jane', email: 'jane@example.com', phone: '123' });
  });

  it('rejects on a malformed response (missing user)', async () => {
    mockPut.mockResolvedValue({ data: { status: 'success', data: {} } });
    await expect(updateProfile({ name: 'Jane', email: 'jane@example.com', phone: '123' })).rejects.toThrow();
  });

  it('rejects when the backend reports a non-success envelope', async () => {
    mockPut.mockResolvedValue({ data: { status: 'error', message: 'A user with this email already exists' } });
    await expect(updateProfile({ name: 'Jane', email: 'taken@example.com', phone: '123' })).rejects.toThrow(
      'A user with this email already exists',
    );
  });
});
