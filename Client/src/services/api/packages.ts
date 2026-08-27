import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { ApiPackage, WebsiteReviewRequest, WebsiteReview, ReviewStatsResult } from '@travel-crm/contracts';
import { aggregateDestinations, normalizePackage } from './packages.transform';

const DEFAULT_LIMIT = 6;
const ApiPackageList = z.array(ApiPackage);

export const fetchPackages = async (params: Record<string, unknown> = {}) => {
  const response = await httpClient.get('/packages', {
    params: {
      limit: DEFAULT_LIMIT,
      status: 'published',
      ...params,
    },
  });

  const rawPackages = Array.isArray(response.data?.data) ? ApiPackageList.parse(response.data.data) : [];
  const normalizedPackages = rawPackages.map((pkg) => normalizePackage(pkg as Parameters<typeof normalizePackage>[0]));
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

  const rawPackages = Array.isArray(response.data?.data) ? ApiPackageList.parse(response.data.data) : [];
  return rawPackages.map((pkg) => normalizePackage(pkg as Parameters<typeof normalizePackage>[0]));
};

export const fetchPackageById = async (id: string) => {
  if (!id) {
    throw new Error('Package id is required');
  }

  const response = await httpClient.get(`/packages/${id}`);
  const pkg = parseEnvelope(ApiPackage, response.data, 'GET /packages/:id').data;
  return normalizePackage(pkg as Parameters<typeof normalizePackage>[0]);
};

/**
 * Returns the raw, non-normalized `{ success, data }` envelope for a
 * package, exactly as the (now-deleted) pdf/apiService.js's `getPackage`
 * did via `fetch`. Only for `features/packages/pdf/pdfService.ts`'s `createPackagePdfBlob`,
 * which expects this specific raw shape — every other caller wants
 * `fetchPackageById`'s normalized shape instead.
 */
export const getPackageEnvelope = async (id: string) => {
  const response = await httpClient.get(`/packages/${id}`);
  parseEnvelope(ApiPackage, response.data, 'GET /packages/:id (raw)');
  return response.data;
};

type ReviewPayload = z.infer<typeof WebsiteReviewRequest>;

export const submitReview = async (packageId: string, reviewData: ReviewPayload) => {
  if (!packageId) {
    throw new Error('Package id is required');
  }

  const body = WebsiteReviewRequest.parse({
    name: reviewData.name,
    email: reviewData.email || '',
    rating: reviewData.rating,
    comment: reviewData.comment,
  });

  const response = await httpClient.post(`/reviews/package/${packageId}`, body);
  return parseEnvelope(WebsiteReview, response.data, 'POST /reviews/package/:id').data;
};

export const fetchPackageReviews = async (packageId: string, limit = 10, page = 1) => {
  if (!packageId) {
    throw new Error('Package id is required');
  }

  const response = await httpClient.get(`/reviews/package/${packageId}`, {
    params: { limit, page },
  });

  return {
    reviews: Array.isArray(response.data?.data) ? z.array(WebsiteReview).parse(response.data.data) : [],
    pagination: response.data?.pagination || null,
  };
};

export const fetchReviewStats = async (packageId: string) => {
  if (!packageId) {
    throw new Error('Package id is required');
  }

  const response = await httpClient.get(`/reviews/package/${packageId}/stats`);
  return parseEnvelope(ReviewStatsResult, response.data, 'GET /reviews/package/:id/stats').data;
};
