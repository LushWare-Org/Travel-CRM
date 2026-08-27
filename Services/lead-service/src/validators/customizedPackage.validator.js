import { z } from 'zod';

export const customizedPackageWebsiteSchema = z
  .object({
    packageId: z.string().min(1),
    name: z.string().optional(),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    travelers: z.number().int().min(1).optional(),
    travelDate: z.string().optional().nullable(),
    budget: z.string().optional().nullable(),
    message: z.string().optional().nullable(),
    overrides: z
      .object({
        name: z.string().max(100).optional(),
        description: z.string().max(2000).optional(),
        duration: z.number().int().min(1).optional(),
        price: z.number().min(0).optional(),
        maxGroupSize: z.number().int().min(1).optional(),
        highlights: z.array(z.string()).optional(),
        inclusions: z.array(z.string()).optional(),
        exclusions: z.array(z.string()).optional(),
        terms: z.array(z.string()).optional(),
        days: z.array(z.any()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const updateCustomizedPackageSchema = z
  .object({
    name: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
    destination: z.string().optional(),
    duration: z.number().int().min(1).optional(),
    price: z.number().min(0).optional(),
    maxGroupSize: z.number().int().min(1).optional(),
    category: z.string().nullable().optional(),
    images: z.array(z.any()).optional(),
    coverImage: z.any().optional(),
    inclusions: z.array(z.string()).optional(),
    exclusions: z.array(z.string()).optional(),
    highlights: z.array(z.string()).optional(),
    terms: z.array(z.string()).optional(),
    days: z.array(z.any()).optional(),
    status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
    customizationNotes: z.string().max(500).optional(),
  })
  .strict();
