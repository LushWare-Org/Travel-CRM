import { z } from 'zod';

// Loose upper bound, not a hard product constraint — keeps a single document
// from growing unbounded (and blowing the wizard's retrieval/prompt budget)
// while leaving room for a genuinely long policy (e.g. full T&Cs).
export const createPolicyDocumentSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(255),
  body: z.string().trim().min(1, 'body is required').max(20000),
});

export const updatePolicyDocumentSchema = createPolicyDocumentSchema.partial();
