import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import recommendationAgentService from '../services/ai/agents/recommendationAgent.service.js';
import documentGenerationAgentService from '../services/ai/agents/documentGenerationAgent.service.js';
import followUpAgentService from '../services/ai/agents/followUpAgent.service.js';
import aiOrchestratorService from '../services/ai/aiOrchestrator.service.js';
import aiAgentControlService from '../services/ai/aiAgentControl.service.js';
import AIAgentLog from '../models/aiAgentLog.model.js';
import AIEvent from '../models/aiEvent.model.js';
import aiEventBusService from '../services/ai/aiEventBus.service.js';

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
