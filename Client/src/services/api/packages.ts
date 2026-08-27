import httpClient from '../http/client';
import { aggregateDestinations, normalizePackage } from './packages.transform';

const DEFAULT_LIMIT = 6;

export const fetchPackages = async (params: Record<string, unknown> = {}) => {
  const response = await httpClient.get('/packages', {
    params: {
      limit: DEFAULT_LIMIT,
      status: 'published',
      ...params,
    },
  });

  const rawPackages = Array.isArray(response.data?.data) ? response.data.data : [];
  const normalizedPackages = rawPackages.map(normalizePackage);
  const destinations = aggregateDestinations(normalizedPackages);

  return {
    packages: normalizedPackages,
    destinations,
    pagination: response.data?.pagination || null,
  };
};

export const fetchFeaturedPackages = async (limit = 6) => {
  const response = await httpClient.get('/packages/featured/all', {
    params: { limit },
  });

  const rawPackages = Array.isArray(response.data?.data) ? response.data.data : [];
  return rawPackages.map(normalizePackage);
};

export const fetchPackageById = async (id: string) => {
  if (!id) {
    throw new Error('Package id is required');
  }

  const response = await httpClient.get(`/packages/${id}`);
  return normalizePackage(response.data?.data || {});
};

/**
 * Returns the raw, non-normalized `{ success, data }` envelope for a
 * package, exactly as the (now-deleted) pdf/apiService.js's `getPackage`
 * did via `fetch`. Only for pdf/pdfService.ts's `createPackagePdfBlob`,
 * which expects this specific raw shape — every other caller wants
 * `fetchPackageById`'s normalized shape instead.
 */
export const getPackageEnvelope = async (id: string) => {
  const response = await httpClient.get(`/packages/${id}`);
  return response.data;
};

interface ReviewPayload {
  name: string;
  email?: string;
  rating: number;
  comment: string;
}

export const submitReview = async (packageId: string, reviewData: ReviewPayload) => {
  if (!packageId) {
    throw new Error('Package id is required');
  }

  const response = await httpClient.post(`/reviews/package/${packageId}`, {
    name: reviewData.name,
    email: reviewData.email || '',
    rating: reviewData.rating,
    comment: reviewData.comment,
  });

  return response.data?.data || null;
};

export const fetchPackageReviews = async (packageId: string, limit = 10, page = 1) => {
  if (!packageId) {
    throw new Error('Package id is required');
  }

  const response = await httpClient.get(`/reviews/package/${packageId}`, {
    params: { limit, page },
  });

  return {
    reviews: response.data?.data || [],
    pagination: response.data?.pagination || null,
  };
};

export const fetchReviewStats = async (packageId: string) => {
  if (!packageId) {
    throw new Error('Package id is required');
  }

  const response = await httpClient.get(`/reviews/package/${packageId}/stats`);
  return response.data?.data || null;
};
