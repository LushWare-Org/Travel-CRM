import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { verifyWebhookSignature, getLeadData, mapFacebookLeadToLead } from '../utils/facebook.js';
import { submitFacebookLead } from '../services/lead.client.js';
import logger from '../config/logger.js';

export const verifyWebhook = asyncHandler(async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!mode || !token) throw new AppError('Missing mode or token', 403);

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    req.log.info('Facebook webhook verified');
    res.status(200).send(challenge);
  } else {
    throw new AppError('Verification failed', 403);
  }
});

export const handleLeadWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('X-Hub-Signature-256');
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (signature && appSecret) {
    const rawBody = JSON.stringify(req.body);
    const valid = verifyWebhookSignature(signature, rawBody, appSecret);
    if (!valid) throw new AppError('Invalid webhook signature', 401);
  } else if (process.env.NODE_ENV === 'production') {
    throw new AppError('Webhook signature verification failed', 401);
  }

  const entry = req.body.entry;
  if (!Array.isArray(entry)) return res.status(200).json({ received: true });

  for (const entryItem of entry) {
    for (const change of entryItem.changes || []) {
      if (change.value?.leadgen_id) {
        processFacebookLead(change.value.leadgen_id).catch((e) =>
          req.log.error({ err: e }, 'FB lead processing error')
        );
      }
    }
  }

  res.status(200).json({ received: true });
});

async function processFacebookLead(leadgenId) {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Facebook Page Access Token not configured');

  const fbData = await getLeadData(leadgenId, accessToken);
  const leadData = mapFacebookLeadToLead(fbData);

  if (!leadData.email && !leadData.phone) {
    throw new Error('Lead must have email or phone');
  }

  // lead-service owns dedup, creation, and assignment (round-robin honors
  // Settings.assignmentMode — no separate flag needed here).
  const result = await submitFacebookLead({
    leadgenId,
    name: leadData.name,
    email: leadData.email,
    phone: leadData.phone,
    message: leadData.message,
  });

  if (result?.data?.duplicate) {
    logger.info({ leadgenId, email: leadData.email }, 'Duplicate FB lead detected');
  } else {
    logger.info({ leadId: result?.data?.leadId }, 'Created FB lead');
  }
}
