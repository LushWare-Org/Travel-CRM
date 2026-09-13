import { z } from 'zod';
import AppError from '../utils/appError.js';
import { UNAUTHORIZED } from '../constants/httpStatus.js';

// The forwarded identity arrives as headers from the gateway. It is trusted
// because this service is gateway-only-internal (allow_unauthenticated = false,
// the gateway's service account is the sole run.invoker) — but "trusted" is a
// property of the deployment, not of the header, so the SHAPE is validated here
// rather than parsed blind.
//
// `JSON.parse` on an unvalidated header throws inside middleware, which produces
// a 500 on every management route rather than a permission error. It also meant a
// malformed header was indistinguishable from a valid one at every call site.
// Anything that does not parse to a bounded array of short strings fails closed
// to no permissions, which narrows capability rather than widening it.
const permissionsSchema = z.array(z.string().min(1).max(64)).max(64);
const roleSchema = z.string().min(1).max(32);

function parsePermissions(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed = permissionsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function parseRole(raw) {
  const parsed = roleSchema.safeParse(typeof raw === 'string' ? raw.trim() : '');
  return parsed.success ? parsed.data : undefined;
}

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
      role: parseRole(req.headers['x-user-role']),
      email: req.headers['x-user-email'],
      name: req.headers['x-user-name'],
      permissions: parsePermissions(req.headers['x-user-permissions']),
      isSuperAdmin: req.headers['x-user-is-super-admin'] === 'true',
    };
  }
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user) return next(new AppError('Not authorized', UNAUTHORIZED));
  next();
};

// The headers to forward to domain services so their own extractUser +
// ownership/role checks run against the original caller's identity.
//
// The correlation id travels with them. Without it every evidence read and tool
// call reached lead-service, billing-service and the rest without this service's
// id, and each minted a fresh one — so a tool read could not be joined to the
// turn that made it, which is precisely what the decision log and the per-step
// trace rows exist to answer. The gateway already does this by mutating the
// header so its proxy forwards it; this is the same idea at the next hop.
export function forwardActorHeaders(req) {
  return {
    'x-user-id': req.user.id,
    'x-user-role': req.user.role,
    'x-user-email': req.user.email,
    'x-user-name': req.user.name,
    'x-user-permissions': JSON.stringify(req.user.permissions || []),
    'x-user-is-super-admin': String(req.user.isSuperAdmin || false),
    ...(req.requestId ? { 'x-request-id': req.requestId } : {}),
  };
}
