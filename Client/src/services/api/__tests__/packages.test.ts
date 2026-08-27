import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { get: mockGet, post: mockPost } }));

const mockNormalizePackage = vi.hoisted(() => vi.fn((pkg: unknown) => ({ normalized: true, raw: pkg })));
const mockAggregateDestinations = vi.hoisted(() => vi.fn(() => []));
vi.mock('../packages.transform', () => ({
  normalizePackage: mockNormalizePackage,
  aggregateDestinations: mockAggregateDestinations,
}));

import {
  fetchPackages, fetchPackageById, fetchFeaturedPackages, submitReview, fetchReviewStats,
} from '../packages';

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockNormalizePackage.mockClear();
  mockAggregateDestinations.mockClear();
});

describe('fetchPackages', () => {
  it('validates the raw array, then normalizes each package', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [{ id: 'pkg-1', title: 'Bali' }], pagination: { page: 1 } } });
    const result = await fetchPackages();
    expect(mockNormalizePackage).toHaveBeenCalledWith(expect.objectContaining({ id: 'pkg-1', title: 'Bali' }));
    expect(result.packages).toEqual([{ normalized: true, raw: { id: 'pkg-1', title: 'Bali' } }]);
    expect(result.pagination).toEqual({ page: 1 });
  });

  it('rejects when a raw package entry fails validation (e.g. non-numeric price)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [{ id: 'pkg-1', basePrice: 'free' }] } });
    await expect(fetchPackages()).rejects.toThrow();
  });
});

describe('fetchFeaturedPackages', () => {
  it('validates and normalizes the featured list', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [{ id: 'pkg-2' }] } });
    const result = await fetchFeaturedPackages();
    expect(result).toEqual([{ normalized: true, raw: { id: 'pkg-2' } }]);
  });
});

describe('fetchPackageById', () => {
  it('resolves with the normalized package on a well-formed envelope', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { id: 'pkg-3', title: 'Kyoto' } } });
    const result = await fetchPackageById('pkg-3');
    expect(result).toEqual({ normalized: true, raw: { id: 'pkg-3', title: 'Kyoto' } });
  });

  it('rejects on a malformed envelope', async () => {
    mockGet.mockResolvedValue({ data: { success: false, message: 'Package not found' } });
    await expect(fetchPackageById('pkg-missing')).rejects.toThrow('Package not found');
  });
});

describe('submitReview', () => {
  it('sanitizes the outbound payload and resolves with the parsed review', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { id: 'rev-1', rating: 5, comment: 'Great trip!' } },
    });
    const result = await submitReview('pkg-1', { rating: 5, comment: 'Great trip!', name: 'Jane' });
    expect(result).toEqual({ id: 'rev-1', rating: 5, comment: 'Great trip!' });
  });

  it('rejects a rating outside 1-5 before sending', async () => {
    await expect(submitReview('pkg-1', { rating: 9, comment: 'Too good' })).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('fetchReviewStats', () => {
  it('resolves with the parsed { avgRating, count }', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { avgRating: 4.5, count: 12 } } });
    const result = await fetchReviewStats('pkg-1');
    expect(result).toEqual({ avgRating: 4.5, count: 12 });
  });
});
