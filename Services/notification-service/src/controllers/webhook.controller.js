import crypto from 'crypto';
import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { verifyWebhookSignature, getLeadData, mapFacebookLeadToLead } from '../utils/facebook.js';
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

  // Duplicate check
  const dupCheck = await pool.query(
    `SELECT id FROM crm_leads."Lead" WHERE (email = $1 AND $1 != '') OR (phone = $2 AND $2 != '') LIMIT 1`,
    [leadData.email, leadData.phone]
  );

  if (dupCheck.rows.length > 0) {
    const existing = dupCheck.rows[0];
    const remarkId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO crm_leads."LeadRemark" (id, "leadId", text, "addedAt", date)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [remarkId, existing.id, `Duplicate Facebook lead submission (Lead ID: ${leadgenId})`]
    );
    logger.info({ leadgenId, email: leadData.email }, 'Duplicate FB lead detected');
    return;
  }

  // Auto-assign if configured
  let assignedToId = null;
  if (process.env.AUTO_ASSIGN_FACEBOOK_LEADS === 'true') {
    try {
      const settings = await pool.query(
        `SELECT id, "enabledSalesRepIds", "roundRobinIndex", "assignmentMode" FROM crm_leads."Settings" LIMIT 1`
      );
      const s = settings.rows[0];
      if (s?.assignmentMode === 'auto' && s.enabledSalesRepIds?.length) {
        const idx = s.roundRobinIndex % s.enabledSalesRepIds.length;
        assignedToId = s.enabledSalesRepIds[idx];
        const nextIdx = (idx + 1) % s.enabledSalesRepIds.length;
        await pool.query(
          `UPDATE crm_leads."Settings" SET "roundRobinIndex" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [nextIdx, s.id]
        );
      }
    } catch (e) {
      logger.warn({ err: e }, 'Auto-assignment failed');
    }
  }

  const leadId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO crm_leads."Lead"
      (id, name, email, phone, source, platform, message, status, tags, "assignedToId", "assignmentMode", "leadDateTime", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5::crm_leads."LeadSource",$6::crm_leads."LeadPlatform",$7,$8::crm_leads."LeadStatus",$9,$10,$11::crm_leads."AssignmentMode",NOW(),NOW(),NOW())`,
    [
      leadId, leadData.name, leadData.email, leadData.phone,
      leadData.source, leadData.platform, leadData.message || null,
      leadData.status, leadData.tags,
      assignedToId, assignedToId ? 'auto' : 'manual',
    ]
  );

  const histId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO crm_leads."LeadStatusHistory" (id, "leadId", status, "changedAt") VALUES ($1,$2,'new',NOW())`,
    [histId, leadId]
  );

  logger.info({ leadId }, 'Created FB lead');
}
