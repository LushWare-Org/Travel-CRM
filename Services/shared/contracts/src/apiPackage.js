import { z } from 'zod';
import { moneyField } from './money.js';

// Light contract check on the fields the Client's own
// packages.transform.ts normalization layer already reads defensively —
// not a full re-typing of the package-service model (that stays
// packages.transform.ts's job). .passthrough() so backend-only fields
// (e.g. admin metadata) don't break parsing.
export const ApiPackage = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    destination: z.string().optional(),
    durationDays: z.number().optional(),
    duration: z.number().optional(),
    category: z.string().nullable().optional(),
    basePrice: moneyField.optional(),
    price: moneyField.optional(),
    images: z.array(z.unknown()).optional(),
    inclusions: z.array(z.unknown()).optional(),
    exclusions: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const PackageListResult = z
  .object({
    packages: z.array(ApiPackage).optional(),
  })
  .passthrough();

export const ReviewStatsResult = z
  .object({
    average: z.number().optional(),
    count: z.number().optional(),
  })
  .passthrough();

export const WebsiteReviewRequest = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  name: z.string().optional(),
});

export const WebsiteReview = z
  .object({
    _id: z.string().optional(),
    rating: z.number(),
    comment: z.string(),
    name: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();
