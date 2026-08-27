import { z } from 'zod';

// Requests strip unknown keys by default (z.object without .passthrough),
// sanitizing the outbound payload before it leaves the browser.
export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RegisterRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(1),
  confirmPassword: z.string().min(1),
});

// Response schemas use .passthrough() — tolerate additive backend fields
// instead of breaking the frontend when the backend adds one.
export const WebsiteUser = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    role: z.string().optional(),
  })
  .passthrough();

// The `data` payload of the login/register envelope.
export const AuthResult = z.object({
  token: z.string(),
  user: WebsiteUser,
});

export const ProfileUpdateRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
});

// PUT /users/profile (user-service updateCurrentUserProfile) returns
// `{ status: 'success', data: { user } }` — the updated user is nested
// under `data.user`, not `data` directly.
export const ProfileUpdateResult = z.object({
  user: WebsiteUser,
});
