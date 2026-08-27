import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost, get: mockGet } }));

import { submitCustomizationRequest, fetchUserCustomizedPackages } from '../customization';

beforeEach(() => {
  mockPost.mockReset();
  mockGet.mockReset();
});

describe('submitCustomizationRequest', () => {
  it('resolves with the parsed result on a well-formed response, accepting an empty name', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { customizedPackageId: 'cp-1', leadId: 'lead-1' } },
    });
    const result = await submitCustomizationRequest({ packageId: 'pkg-1', name: '', email: 'jane@example.com' });
    expect(result).toEqual({ customizedPackageId: 'cp-1', leadId: 'lead-1' });
  });

  it('rejects a payload missing packageId before sending', async () => {
    await expect(
      submitCustomizationRequest({ email: 'jane@example.com' } as never),
    ).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('fetchUserCustomizedPackages', () => {
  it('resolves with the parsed array on a well-formed response', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [{ name: 'Custom Bali Trip', destination: 'Bali', duration: 5, price: '1200.00' }],
      },
    });
    const result = await fetchUserCustomizedPackages();
    expect(result).toEqual([{ name: 'Custom Bali Trip', destination: 'Bali', duration: 5, price: 1200 }]);
  });

  it('rejects on a malformed array element missing required fields', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [{ name: 'Missing fields' }] } });
    await expect(fetchUserCustomizedPackages()).rejects.toThrow();
  });
});
