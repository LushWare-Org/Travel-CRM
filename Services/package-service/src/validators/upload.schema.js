import { z } from 'zod';

export const publicIdParamSchema = z.object({
  publicId: z.string().min(1, 'publicId is required'),
});

export const deleteMultipleImagesSchema = z.object({
  publicIds: z.array(z.string().min(1)).min(1, 'publicIds array is required'),
});

export const optimizeQuerySchema = z.object({
  publicId: z.string().min(1, 'publicId is required'),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  quality: z.string().optional().default('auto'),
  format: z.string().optional().default('auto'),
});
