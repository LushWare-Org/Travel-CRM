import { z } from 'zod';
import { nameField, emailField, phoneField, permissionsField, USER_ROLES, AVAILABLE_PERMISSIONS } from './common.js';

export const createStaffSchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField,
    role: z.enum(USER_ROLES, { message: `role must be one of: ${USER_ROLES.join(', ')}` }),
    permissions: permissionsField,
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: nameField.optional(),
    phone: phoneField,
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
    permissions: permissionsField,
  })
  .strict();

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

// Setting permissions is this endpoint's entire job — matches the pre-existing
// controller behavior of treating an absent `permissions` key as "clear the list".
export const updateAdminPermissionsSchema = z
  .object({
    permissions: z.array(z.enum(AVAILABLE_PERMISSIONS)).default([]),
  })
  .strict();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  search: z.string().trim().max(255).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const promoteSuperAdminSchema = z
  .object({
    userId: z.string().uuid('userId must be a valid UUID'),
  })
  .strict();

export const demoteSuperAdminSchema = promoteSuperAdminSchema;
