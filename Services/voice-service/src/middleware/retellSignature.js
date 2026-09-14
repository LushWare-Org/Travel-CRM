import { verify } from 'retell-sdk/lib/webhook_auth.js';
import AppError from '../utils/appError.js';

export async function verifyRetellSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  try {
    return await verify(body, secret, String(signature));
  } catch {
    return false;
  }
}

export const requireRetellSignature = async (req, res, next) => {
  const secret = process.env.RETELL_WEBHOOK_SECRET;
  if (!secret) {
    req.log?.error('RETELL_WEBHOOK_SECRET is not configured — rejecting webhook');
    return next(new AppError('Webhook verification unavailable', 503));
  }

  const ok = await verifyRetellSignature(req.rawBody, req.get('x-retell-signature'), secret);
  if (!ok) {
    req.log?.warn({ path: req.path }, 'Rejected webhook with invalid Retell signature');
    return next(new AppError('Invalid webhook signature', 401));
  }

  next();
};
