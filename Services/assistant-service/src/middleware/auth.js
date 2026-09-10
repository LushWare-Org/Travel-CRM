import AppError from '../utils/appError.js';
import { UNAUTHORIZED } from '../constants/httpStatus.js';

// ─── Management copilot auth ──────────────────────────────────────────────
// Mirrors lead-service's auth middleware. The gateway verifies the JWT and
// forwards x-user-* actor headers; this service trusts them ONLY because it
// is deployed gateway-only-internal (allow_unauthenticated=false, gateway's
// service account is the sole run.invoker). Scoped to the management route —
// never applied globally, because /assistant/turn and /events are public.

export const extractUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.user = {
      id: userId,
      role: req.headers['x-user-role'],
      email: req.headers['x-user-email'],
      name: req.headers['x-user-name'],
      permissions: JSON.parse(req.headers['x-user-permissions'] || '[]'),
      isSuperAdmin: req.headers['x-user-is-super-admin'] === 'true',
    };
  }
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user) return next(new AppError('Not authorized', UNAUTHORIZED));
  next();
};

// The actor headers to forward to domain services so their own extractUser +
// ownership/role checks run against the original caller's identity.
export function forwardActorHeaders(req) {
  return {
    'x-user-id': req.user.id,
    'x-user-role': req.user.role,
    'x-user-email': req.user.email,
    'x-user-name': req.user.name,
    'x-user-permissions': JSON.stringify(req.user.permissions || []),
    'x-user-is-super-admin': String(req.user.isSuperAdmin || false),
  };
}
