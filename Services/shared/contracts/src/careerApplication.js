import { z } from 'zod';

// Confirmed against Services/career-service/prisma/schema.prisma's
// Vacancy model: `id` (not `_id`), `position` (not `title`), and a flat
// `experienceMin` (not a nested `experience.min`).
export const Vacancy = z
  .object({
    id: z.string(),
    position: z.string(),
    description: z.string().optional(),
    type: z.string(),
    location: z.string(),
    experienceMin: z.number().optional(),
    status: z.string().optional(),
    closingDate: z.string().nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

// Confirmed against CareerContainer.tsx's ApplicationPayload and
// career-service's applyForPosition controller (reads exactly these
// fields from req.body).
export const CareerApplicationRequest = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  position: z.string().min(1),
  coverLetter: z.string().min(1),
  agreeTerms: z.boolean(),
  resumeUrl: z.string().min(1),
  resumeFileName: z.string().optional(),
});
