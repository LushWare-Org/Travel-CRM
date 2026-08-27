import { z } from 'zod';

export const Vacancy = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

// .passthrough() placeholder: ApplicationForm.tsx's exact field set
// (likely includes resume/cover-letter upload refs) is finalized in
// Phase 4 against the real form; named fields replace this once read.
export const CareerApplicationRequest = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  })
  .passthrough();
