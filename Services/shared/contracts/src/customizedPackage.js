import { z } from 'zod';
import { moneyField } from './money.js';

export const WebsiteCustomizationOverrides = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  duration: z.number().int().min(1).optional(),
  price: z.number().min(0).optional(),
  maxGroupSize: z.number().int().min(1).optional(),
  highlights: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  terms: z.array(z.string()).optional(),
  days: z.array(z.unknown()).optional(),
});

// `name` is optional: CustomizePackageContainer.tsx's tested submit flow
// allows an empty name (no client-side requirement), mirroring
// WebsiteBookingRequest's identical relaxation. lead-service's
// customizedPackageWebsiteSchema mirrors this.
export const WebsiteCustomizationRequest = z.object({
  packageId: z.string(),
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  travelers: z.number().int().min(1).optional(),
  travelDate: z.string().optional(),
  budget: z.string().optional(),
  message: z.string().optional(),
  overrides: WebsiteCustomizationOverrides.optional(),
});

export const WebsiteCustomizationResult = z.object({
  customizedPackageId: z.string(),
  leadId: z.string(),
  salesRepId: z.string().nullable().optional(),
});

export const CustomizedPackageSummary = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    destination: z.string(),
    duration: z.number(),
    price: moneyField,
    maxGroupSize: z.number().optional(),
    category: z.string().nullable().optional(),
    images: z.array(z.unknown()).nullable().optional(),
    coverImage: z.unknown().nullable().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();
