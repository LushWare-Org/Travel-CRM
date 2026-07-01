import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import Lead from '../models/lead.model.js';
import recommendationAgentService from '../services/ai/agents/recommendationAgent.service.js';
import documentGenerationAgentService from '../services/ai/agents/documentGenerationAgent.service.js';
import messagingAgentService from '../services/ai/agents/messagingAgent.service.js';
import followUpAgentService from '../services/ai/agents/followUpAgent.service.js';
import aiOrchestratorService from '../services/ai/aiOrchestrator.service.js';
import aiAgentControlService from '../services/ai/aiAgentControl.service.js';
import AIAgentLog from '../models/aiAgentLog.model.js';
import AIEvent from '../models/aiEvent.model.js';
import aiEventBusService from '../services/ai/aiEventBus.service.js';
import emailService from '../utils/emailService.js';
import packageAIPDFGenerator from '../utils/packageAIPDFGenerator.js';
import riskDetectionAgentService from '../services/ai/agents/riskDetectionAgent.service.js';
import riskOutboxPublisherWorker from '../services/ai/riskOutboxPublisher.worker.js';
import churnPredictionService from '../services/ai/churnPrediction.service.js';
import CustomerRetentionState from '../models/customerRetentionState.model.js';
import RetentionFollowUp from '../models/retentionFollowUp.model.js';
import User from '../models/user.model.js';
import retentionLifecycleAgentService from '../services/ai/agents/retentionLifecycleAgent.service.js';
import retentionLoggerService from '../services/ai/retentionLogger.service.js';

export const recommendPackages = asyncHandler(async (req, res) => {
  const recommendations = await recommendationAgentService.recommendPackages(req.body, req.body.limit || 5);
  res.status(200).json({
    success: true,
    data: recommendations,
  });
});

export const comparePackages = asyncHandler(async (req, res, next) => {
  const { packageIds, context } = req.body;
  if (!Array.isArray(packageIds) || packageIds.length < 2) {
    return next(new AppError('packageIds must be an array with at least 2 package ids', 400));
  }
  const comparison = await recommendationAgentService.comparePackages(packageIds, context || {});
  res.status(200).json({
    success: true,
    data: comparison,
  });
});

export const generateDocuments = asyncHandler(async (req, res, next) => {
  const { leadId, types, autoSend } = req.body;
  if (!leadId) {
    return next(new AppError('leadId is required', 400));
  }
  const docs = await documentGenerationAgentService.generateDocumentBundle({
    leadId,
    userId: req.user._id,
    types,
    autoSend,
  });
  res.status(201).json({
    success: true,
    data: docs,
  });
});

export const getAgentStatus = asyncHandler(async (req, res) => {
  const controls = await aiAgentControlService.listControls();
  res.status(200).json({
    success: true,
    data: {
      agents: aiOrchestratorService.getAgents(),
      controls,
    },
  });
});

export const overrideAgent = asyncHandler(async (req, res, next) => {
  const {
    agentName, action, note, eventId,
  } = req.body;
  if (!agentName || !action) {
    return next(new AppError('agentName and action are required', 400));
  }
  await aiOrchestratorService.manualOverride({
    agentName,
    action,
    note,
    eventId,
    userId: req.user._id,
  });
  res.status(200).json({
    success: true,
    message: 'Override applied',
  });
});

export const getAgentLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit || 30));
  const query = {};
  if (req.query.agentName) query.agentName = req.query.agentName;
  if (req.query.eventType) query.eventType = req.query.eventType;
  if (req.query.status) query.status = req.query.status;

  const logs = await AIAgentLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

export const getEventQueue = asyncHandler(async (req, res) => {
  const events = await AIEvent.find()
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Number(req.query.limit || 50)))
    .lean();
  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

export const publishEvent = asyncHandler(async (req, res, next) => {
  const { type, payload, correlationId } = req.body;
  if (!type) {
    return next(new AppError('type is required', 400));
  }
  const event = await aiEventBusService.publish({
    type,
    payload: payload || {},
    correlationId,
    source: `manual:${req.user._id}`,
  });
  res.status(201).json({
    success: true,
    data: event,
  });
});

export const submitFollowUpFeedback = asyncHandler(async (req, res, next) => {
  const { leadId, outcome } = req.body;
  if (!leadId || !outcome) {
    return next(new AppError('leadId and outcome are required', 400));
  }
  await followUpAgentService.recordFeedback(leadId, outcome);
  res.status(200).json({
    success: true,
    message: 'Follow-up feedback recorded',
  });
});

export const runRiskDetectionBatch = asyncHandler(async (req, res) => {
  const { date } = req.body || {};
  const churn = await churnPredictionService.runDailyChurnPrediction(date);
  const risk = await riskDetectionAgentService.runRiskDetectionFromLatestScores(date);
  res.status(200).json({
    success: true,
    data: {
      churn,
      risk,
    },
  });
});

export const publishRiskOutbox = asyncHandler(async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.body?.limit || 50)));
  const result = await riskOutboxPublisherWorker.publishPendingOutboxEvents({ limit });
  res.status(200).json({
    success: true,
    data: result,
  });
});

const getLeadContext = (lead) => ({
  leadId: String(lead._id),
  budget: lead.budget ? Number(lead.budget) : undefined,
  destination: lead.destination || lead.destinationCountry,
  numberOfTravelers: lead.numberOfTravelers,
  travelPurpose: Array.isArray(lead.tags) ? lead.tags.join(' ') : undefined,
});

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatCurrency = (amount) => {
  const numeric = Number(amount || 0);
  const currencyCode = process.env.CURRENCY_CODE || 'USD';
  return numeric.toLocaleString('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const buildRecommendationMessage = (lead, recommendations) => {
  const greetingName = lead.name || 'there';
  const leadDestination = lead.destination || lead.destinationCountry || 'your destination';
  const intro = `Hi ${greetingName}, based on your travel details, here are our top package recommendations for ${leadDestination}:`;
  const packageLines = recommendations.map((item, index) => {
    const pkg = item.package || {};
    const reasons = Array.isArray(item.explainability) ? item.explainability.filter(Boolean).slice(0, 2) : [];
    const reasonText = reasons.length ? ` (${reasons.join('; ')})` : '';
    return `${index + 1}. ${pkg.name || 'Travel Package'} - ${pkg.destination || 'Destination'} - ${pkg.price ? `USD ${pkg.price}` : 'Price on request'}${reasonText}`;
  });
  const outro = 'Reply to this email and we will finalize the best option for you.';
  return [intro, ...packageLines, '', outro].join('\n');
};

const buildRecommendationEmailHtml = (lead, recommendations, packageAttachments = []) => {
  const greetingName = escapeHtml(lead.name || 'there');
  const leadDestination = escapeHtml(lead.destination || lead.destinationCountry || 'your destination');

  const recommendationRows = recommendations.map((item, index) => {
    const pkg = item.package || {};
    const reasons = Array.isArray(item.explainability) ? item.explainability.filter(Boolean).slice(0, 2) : [];
    const reasonsText = reasons.length ? `<div style="color: #64748B; font-size: 13px; margin-top: 6px;">Why this fits: ${escapeHtml(reasons.join(' | '))}</div>` : '';
    return `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #E2E8F0;">
          <div style="color: #0F172A; font-size: 16px; font-weight: 600;">${index + 1}. ${escapeHtml(pkg.name || 'Travel Package')}</div>
          <div style="color: #334155; font-size: 14px; margin-top: 4px;">
            ${escapeHtml(pkg.destination || 'Destination')} | ${pkg.duration ? `${escapeHtml(String(pkg.duration))} days` : 'Duration on request'} | ${pkg.price ? escapeHtml(formatCurrency(pkg.price)) : 'Price on request'}
          </div>
          ${reasonsText}
        </td>
      </tr>
    `;
  }).join('');

  const packageRows = packageAttachments.map((entry) => {
    const packageName = escapeHtml(entry.packageName || 'Travel Package');
    const totalAmount = entry.packagePrice ? ` (${escapeHtml(formatCurrency(entry.packagePrice))})` : '';
    return `
      <li style="margin: 8px 0; color: #334155; font-size: 14px;">
        <strong>${packageName}</strong>${totalAmount}
      </li>
    `;
  }).join('');

  const content = `
    <h1 style="color: #0F172A; font-size: 28px; margin: 0 0 8px 0;">Your Recommended Travel Options</h1>
    <p style="color: #64748B; line-height: 1.6; margin: 0 0 24px 0;">Hi ${greetingName}, based on your travel details, here are our top package recommendations for <strong>${leadDestination}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      ${recommendationRows}
    </table>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <h2 style="color: #0F172A; font-size: 18px; margin: 0 0 10px 0;">Attached Package PDFs</h2>
      <p style="color: #64748B; font-size: 14px; margin: 0 0 8px 0;">We attached detailed package PDFs for your recommended options:</p>
      <ul style="padding-left: 20px; margin: 0;">
        ${packageRows}
      </ul>
    </div>

    <p style="color: #334155; line-height: 1.6; margin: 20px 0 0 0;">Reply to this email and we will finalize the best option for you.</p>
  `;

  return emailService.getEmailTemplate(content);
};

const buildFollowUpEmailHtml = (lead, followUpResult) => {
  const greetingName = escapeHtml(lead.name || 'there');
  const destination = escapeHtml(lead.destination || lead.destinationCountry || 'your trip');
  const message = escapeHtml(followUpResult?.message || '')
    .replace(/\n/g, '<br/>');

  const content = `
    <h1 style="color: #0F172A; font-size: 28px; margin: 0 0 8px 0;">Following Up On Your Travel Plan</h1>
    <p style="color: #64748B; line-height: 1.6; margin: 0 0 24px 0;">Hi ${greetingName}, we wanted to check in regarding your plan for <strong>${destination}</strong>.</p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 0;">${message}</p>
    </div>

    <p style="color: #334155; line-height: 1.6; margin: 20px 0 0 0;">Reply to this email and we will help you finalize everything quickly.</p>
  `;

  return emailService.getEmailTemplate(content);
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40) || 'package';

const createRecommendationPackageAttachment = async ({
  recommendation,
}) => {
  const pkg = recommendation?.package || {};
  if (!pkg._id) {
    throw new AppError('Recommended package is missing an ID', 400);
  }
  const pdfBuffer = await packageAIPDFGenerator.generatePackagePDF(pkg._id);
  const filename = `package-${slugify(pkg.name)}-${String(pkg._id)}.pdf`;

  return {
    attachment: {
      filename,
      content: pdfBuffer,
    },
    packageName: pkg.name || 'Travel Package',
    packagePrice: Number(pkg.price) > 0 ? Number(pkg.price) : undefined,
  };
};

export const sendLeadRecommendationsEmail = asyncHandler(async (req, res, next) => {
  const { leadId } = req.params;
  const limit = Math.min(10, Math.max(1, Number(req.body?.limit || 5)));
  const lead = await Lead.findById(leadId).lean();

  if (!lead) {
    return next(new AppError(`Lead not found for Id: ${leadId}`, 404));
  }

  if (!lead.email) {
    return next(new AppError('Lead does not have an email address', 400));
  }

  const recommendationOutput = await recommendationAgentService.execute({
    type: 'ai.recommendation.requested',
    correlationId: req.body?.correlationId || crypto.randomUUID(),
    payload: {
      ...getLeadContext(lead),
      limit,
    },
  });

  const recommendations = recommendationOutput?.recommendations || [];
  if (!recommendations.length) {
    return next(new AppError('No package recommendations found for this lead', 400));
  }

  const message = buildRecommendationMessage(lead, recommendations);
  const packageArtifacts = [];
  const attachments = [];
  const attachedPackageIds = [];
  const seenPackageIds = new Set();

  for (const recommendation of recommendations) {
    const packageId = String(recommendation?.package?._id || '');
    if (!packageId || seenPackageIds.has(packageId)) {
      continue;
    }
    seenPackageIds.add(packageId);
    attachedPackageIds.push(packageId);

    // Use existing package PDF generation API for attachments.
    const artifact = await createRecommendationPackageAttachment({
      recommendation,
    });
    packageArtifacts.push(artifact);
    attachments.push(artifact.attachment);
  }

  const html = buildRecommendationEmailHtml(lead, recommendations, packageArtifacts);
  const subject = `Recommended packages for ${lead.destination || lead.destinationCountry || 'your trip'}`;

  const delivery = await messagingAgentService.execute({
    type: 'recommendation.message.requested',
    correlationId: req.body?.correlationId || crypto.randomUUID(),
    payload: {
      leadId: String(lead._id),
      subject,
      message,
      html,
      attachments,
      channels: ['email'],
    },
  });

  res.status(200).json({
    success: true,
    message: 'Recommendation email sent',
    data: {
      leadId: String(lead._id),
      recommendations,
      attachedPackageIds,
      delivery,
    },
  });
});

export const sendLeadFollowUpEmail = asyncHandler(async (req, res, next) => {
  const { leadId } = req.params;
  const lead = await Lead.findById(leadId).lean();

  if (!lead) {
    return next(new AppError('Lead not found', 404));
  }

  if (!lead.email) {
    return next(new AppError('Lead does not have an email address', 400));
  }

  const followUpResult = await followUpAgentService.execute({
    type: 'followup.triggered',
    correlationId: req.body?.correlationId || crypto.randomUUID(),
    payload: {
      leadId: String(lead._id),
      channels: ['email'],
      suppressPublish: true,
    },
  });

  if (followUpResult?.skipped) {
    return next(new AppError(followUpResult.reason || 'Unable to generate follow-up message', 400));
  }

  const delivery = await messagingAgentService.execute({
    type: 'followup.message.requested',
    correlationId: req.body?.correlationId || crypto.randomUUID(),
    payload: {
      leadId: String(lead._id),
      subject: `Quick follow-up on your ${lead.destination || lead.destinationCountry || 'travel'} plan`,
      message: followUpResult.message,
      html: buildFollowUpEmailHtml(lead, followUpResult),
      channels: ['email'],
    },
  });

  res.status(200).json({
    success: true,
    message: 'Follow-up email sent',
    data: {
      leadId: String(lead._id),
      followUp: followUpResult,
      delivery,
    },
  });
});

const getSimulatorSnapshot = async (customerId) => {
  const [customer, retentionState, pendingFollowUp] = await Promise.all([
    User.findById(customerId).select('_id name email').lean(),
    CustomerRetentionState.findOne({ customer: customerId }).lean(),
    RetentionFollowUp.findOne({
      customerId,
      type: 'churn_retention',
      status: { $in: ['pending', 'processing', 'sent'] },
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return {
    customer: customer || null,
    retentionState: retentionState || null,
    followUp: pendingFollowUp || null,
  };
};

export const simulateChurnPrediction = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const prediction = await churnPredictionService.predictCustomerChurn(customerId);
  await retentionLoggerService.log(customerId, 'simulation.churn.predicted', prediction);
  const snapshot = await getSimulatorSnapshot(customerId);

  res.status(200).json({
    success: true,
    data: {
      prediction,
      ...snapshot,
      activeStage: 'churn_model',
      priority: prediction.riskLevel,
    },
  });
});

export const simulateRiskDetection = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const result = await riskDetectionAgentService.detectRiskFromLatestScore(customerId);
  const snapshot = await getSimulatorSnapshot(customerId);

  res.status(200).json({
    success: true,
    data: {
      riskDetection: result,
      ...snapshot,
      activeStage: 'risk_detection',
    },
  });
});

export const simulateFollowUp = asyncHandler(async (req, res, next) => {
  const { customerId } = req.params;
  const action = req.body?.action || 'create';

  if (action === 'create') {
    const state = await CustomerRetentionState.findOne({ customer: customerId }).lean();
    if (!state || state.retentionStatus !== 'AT_RISK') {
      return next(new AppError('Customer is not in AT_RISK state', 400));
    }
    const created = await riskDetectionAgentService.ensureChurnFollowUpForCustomer({
      customerId,
      scheduledAt: state.nextFollowUpAt || new Date(),
      template: 'retention_stage_1',
      metadata: {
        source: 'simulation',
      },
    });
    const snapshot = await getSimulatorSnapshot(customerId);
    return res.status(200).json({
      success: true,
      data: {
        action,
        created,
        ...snapshot,
        activeStage: 'retention_state',
      },
    });
  }

  if (action === 'run') {
    const followUp = await RetentionFollowUp.findOne({
      customerId,
      type: 'churn_retention',
      status: 'pending',
    })
      .sort({ scheduledAt: 1 })
      .lean();
    if (!followUp) {
      return next(new AppError('No pending churn follow-up found', 404));
    }

    const followUpResult = await followUpAgentService.execute({
      type: 'retention.followup.triggered',
      source: 'simulation',
      correlationId: req.body?.correlationId || crypto.randomUUID(),
      payload: {
        followUpId: String(followUp._id),
        customerId,
        suppressPublish: true,
      },
    });

    const delivery = await messagingAgentService.execute({
      type: 'retention.message.requested',
      source: 'simulation',
      correlationId: req.body?.correlationId || crypto.randomUUID(),
      payload: {
        customerId,
        leadId: followUpResult?.leadId,
        message: followUpResult?.message,
        template: followUpResult?.template,
        channels: followUpResult?.channels || ['email'],
      },
    });

    const snapshot = await getSimulatorSnapshot(customerId);
    return res.status(200).json({
      success: true,
      data: {
        action,
        followUpResult,
        delivery,
        ...snapshot,
        activeStage: 'messaging_agent',
      },
    });
  }

  return next(new AppError('Unsupported follow-up simulation action', 400));
});

export const simulateRecovery = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const event = req.body?.event || 'reply_positive';

  let result = null;
  if (['purchase', 'book_service', 'reply_positive'].includes(event)) {
    const eventType = event === 'purchase'
      ? 'receipt.created'
      : (event === 'book_service' ? 'booking.confirmed' : 'retention.customer.positive_reply');

    result = await retentionLifecycleAgentService.execute({
      type: eventType,
      source: 'simulation',
      payload: {
        customerId,
      },
    });
  } else if (event === 'ignore') {
    const state = await CustomerRetentionState.findOne({ customer: customerId });
    const nextStatus = (state?.followUpStage || 0) >= 3 ? 'CHURNED' : 'ESCALATED';
    await CustomerRetentionState.findOneAndUpdate(
      { customer: customerId },
      {
        $set: {
          retentionStatus: nextStatus,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );
    await retentionLoggerService.log(customerId, 'simulation.customer.ignored', {
      retentionStatus: nextStatus,
    });
    result = { customerId, retentionStatus: nextStatus };
  } else if (event === 'reply_negative') {
    await CustomerRetentionState.findOneAndUpdate(
      { customer: customerId },
      {
        $set: {
          retentionStatus: 'CHURNED',
          nextFollowUpAt: null,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );
    await retentionLoggerService.log(customerId, 'simulation.customer.replied_negative', {
      retentionStatus: 'CHURNED',
    });
    result = { customerId, retentionStatus: 'CHURNED' };
  } else {
    result = { skipped: true, reason: 'unsupported recovery event' };
  }

  const snapshot = await getSimulatorSnapshot(customerId);
  res.status(200).json({
    success: true,
    data: {
      event,
      result,
      ...snapshot,
      finalState: snapshot.retentionState?.retentionStatus || null,
      activeStage: 'retention_state',
    },
  });
});
