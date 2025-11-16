import apiClient from './apiClient';
import { normalizePackage, aggregateDestinations } from './packageTransform';

const DEFAULT_LIMIT = 50;

export const fetchPackages = async (params = {}) => {
  const response = await apiClient.get('/packages', {
    params: {
      limit: DEFAULT_LIMIT,
      isActive: true,
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
  const response = await apiClient.get('/packages/featured/all', {
    params: { limit },
  });

  const rawPackages = Array.isArray(response.data?.data) ? response.data.data : [];
  return rawPackages.map(normalizePackage);
};

export const fetchPackageById = async (id) => {
  if (!id) {
    throw new Error('Package id is required');
  }

  const response = await apiClient.get(`/packages/${id}`);
  return normalizePackage(response.data?.data || {});
};

