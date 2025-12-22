import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import FacebookService from '../services/facebook.service.js';
import { mapFacebookLeadToLeadModel, checkDuplicateLead } from '../utils/facebookLeadMapper.js';
import Lead from '../models/lead.model.js';
import User from '../models/user.model.js';
import { assignSalesRepIfNeeded } from '../services/assignment.service.js';
import logger from '../config/logger.js';

/**
 * @desc    Verify Facebook webhook (GET request)
 * @route   GET /api/v1/webhooks/facebook
 * @access  Public (Facebook calls this)
 */
export const verifyWebhook = asyncHandler(async (req, res) => {
  // Workaround: Manually parse query string if req.query is empty
  let mode, token, challenge;
  
  if (Object.keys(req.query).length === 0 && req.url.includes('?')) {
    // Parse query string manually
    const queryString = req.url.split('?')[1];
    const params = new URLSearchParams(queryString);
    mode = params.get('hub.mode');
    token = params.get('hub.verify_token');
    challenge = params.get('hub.challenge');
    
    logger.info('Manually parsed query parameters', { mode, token, challenge });
  } else {
    mode = req.query['hub.mode'];
    token = req.query['hub.verify_token'];
    challenge = req.query['hub.challenge'];
  }

  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;

  logger.info('Facebook webhook verification attempt', { 
    mode, 
    hasToken: !!token, 
    tokenMatch: token === verifyToken,
    challenge: challenge ? 'present' : 'missing'
  });

  // Check if mode and token are present
  if (!mode || !token) {
    logger.error('Webhook verification failed - missing parameters', {
      hasMode: !!mode,
      hasToken: !!token,
      hasChallenge: !!challenge,
      queryParams: req.query
    });
    throw new AppError('Missing mode or token', 403);
  }

  // Check if mode is 'subscribe' and token matches
  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('Facebook webhook verified successfully', { challenge });
    // Respond with challenge token as plain text
    res.status(200).type('text/plain').send(challenge);
  } else {
    logger.warn('Facebook webhook verification failed - invalid token or mode', {
      expectedMode: 'subscribe',
      actualMode: mode,
      tokenMatches: token === verifyToken
    });
    throw new AppError('Verification failed', 403);
  }
});

/**
 * @desc    Handle Facebook lead webhook (POST request)
 * @route   POST /api/v1/webhooks/facebook
 * @access  Public (Facebook calls this)
 */
export const handleLeadWebhook = asyncHandler(async (req, res) => {
  // Verify webhook signature
  const signature = req.get('X-Hub-Signature-256');
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  // Use stringified body for signature verification
  const rawBody = JSON.stringify(req.body);

  if (!signature || !appSecret) {
    logger.warn('Facebook webhook signature verification skipped - missing signature or secret');
    // In development, you might want to allow this, but in production it's a security risk
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Webhook signature verification failed', 401);
    }
  } else {
    const isValid = FacebookService.verifyWebhookSignature(signature, rawBody, appSecret);
    if (!isValid) {
      logger.error('Facebook webhook signature verification failed');
      throw new AppError('Invalid webhook signature', 401);
    }
    logger.info('Facebook webhook signature verified successfully');
  }

  // Handle webhook event
  const entry = req.body.entry;
  if (!entry || !Array.isArray(entry)) {
    logger.warn('Invalid webhook payload - no entry array');
    return res.status(200).json({ received: true });
  }

  // Process each entry
  for (const entryItem of entry) {
    const changes = entryItem.changes;
    if (!changes || !Array.isArray(changes)) {
      continue;
    }

    for (const change of changes) {
      // Check if this is a leadgen event
      if (change.value && change.value.leadgen_id) {
        const leadgenId = change.value.leadgen_id;
        
        try {
          await processFacebookLead(leadgenId);
          logger.info(`Successfully processed Facebook lead: ${leadgenId}`);
        } catch (error) {
          logger.error(`Error processing Facebook lead ${leadgenId}:`, error);
          // Continue processing other leads even if one fails
        }
      }
    }
  }

  // Always return 200 OK to Facebook (even if processing failed)
  // Facebook will retry if we return an error, which could cause duplicates
  res.status(200).json({ received: true });
});

/**
 * Process a single Facebook lead
 * @param {string} leadgenId - Facebook leadgen ID
 */
const processFacebookLead = async (leadgenId) => {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Facebook Page Access Token not configured');
  }

  // Fetch lead data from Facebook Graph API
  const facebookLeadData = await FacebookService.getLeadData(leadgenId, accessToken);

  if (!facebookLeadData || !facebookLeadData.field_data) {
    throw new Error('Invalid lead data from Facebook');
  }

  // Get system user for assignment (optional - can be null)
  let systemUser = null;
  try {
    systemUser = await User.findOne({ role: 'admin' }).select('_id');
  } catch (error) {
    logger.warn('Could not find system user for lead assignment');
  }

  // Map Facebook data to Lead model
  const leadData = mapFacebookLeadToLeadModel(facebookLeadData, {
    createdBy: systemUser?._id || null,
  });

  // Validate required fields
  if (!leadData.email && !leadData.phone) {
    throw new Error('Lead must have at least email or phone number');
  }

  // Check for duplicates
  const existingLead = await checkDuplicateLead(
    leadData.email,
    leadData.phone,
    leadData.leadDateTime,
    Lead
  );

  if (existingLead) {
    logger.info(`Duplicate lead detected: ${leadData.email || leadData.phone} - skipping creation`);
    
    // Add remark to existing lead about new Facebook submission
    if (!existingLead.remarks) {
      existingLead.remarks = [];
    }
    existingLead.remarks.push({
      text: `New Facebook Lead Ad submission received (Lead ID: ${leadgenId}) - Duplicate detected`,
      date: new Date(),
      addedBy: systemUser?._id || null,
    });
    await existingLead.save();
    
    return existingLead;
  }

  // Auto-assign sales rep if configured
  if (process.env.AUTO_ASSIGN_FACEBOOK_LEADS === 'true') {
    try {
      const assignedUser = await assignSalesRepIfNeeded(leadData);
      if (assignedUser) {
        leadData.assignedTo = assignedUser._id;
        leadData.assignedBy = systemUser?._id || null;
        leadData.assignmentMode = 'auto';
      }
    } catch (error) {
      logger.warn('Failed to auto-assign sales rep:', error);
    }
  }

  // Create lead
  const lead = await Lead.create(leadData);

  logger.info(`Created new lead from Facebook: ${lead._id} (Email: ${leadData.email}, Phone: ${leadData.phone})`);

  return lead;
};


