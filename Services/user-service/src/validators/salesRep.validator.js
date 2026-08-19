import { z } from 'zod';
import { nameField, emailField, phoneField } from './common.js';

export const createSalesRepSchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField,
  })
  .strict();

export const updateSalesRepSchema = z
  .object({
    name: nameField.optional(),
    phone: phoneField,
    email: emailField.optional(),
  })
  .strict();

export const listSalesRepsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(255).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});
