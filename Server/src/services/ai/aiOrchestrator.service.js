import AIAgentLog from '../../models/aiAgentLog.model.js';
import aiAgentControlService from './aiAgentControl.service.js';
import aiEventBusService from './aiEventBus.service.js';
import messagingAgentService from './agents/messagingAgent.service.js';
import recommendationAgentService from './agents/recommendationAgent.service.js';
import followUpAgentService from './agents/followUpAgent.service.js';
import documentGenerationAgentService from './agents/documentGenerationAgent.service.js';
import retentionLifecycleAgentService from './agents/retentionLifecycleAgent.service.js';
import logger from '../../config/logger.js';

class AIOrchestratorService {
  constructor() {
    this.agents = [
      messagingAgentService,
      recommendationAgentService,
      followUpAgentService,
      documentGenerationAgentService,
      retentionLifecycleAgentService,
    ];
    this.started = false;
  }

  getAgents() {
    return this.agents.map((agent) => agent.name);
  }

  async runAgent(agent, event) {
    const startedAt = new Date();
    const log = await AIAgentLog.create({
      agentName: agent.name,
      eventType: event.type,
      eventId: String(event._id),
      correlationId: event.correlationId,
      status: 'pending',
      lead: event.payload?.leadId || undefined,
      booking: event.payload?.bookingId || undefined,
      quotation: event.payload?.quotationId || undefined,
      invoice: event.payload?.invoiceId || undefined,
      input: event.payload,
      startedAt,
    });

    try {
      const control = await aiAgentControlService.getControl(agent.name);
      if (control.isPaused) {
        log.status = 'skipped';
        log.reason = control.pauseReason || 'Agent is paused';
        log.completedAt = new Date();
        log.durationMs = log.completedAt.getTime() - startedAt.getTime();
        await log.save();
        return { status: 'skipped' };
      }

      if (control.requiresHumanApproval) {
        log.status = 'overridden';
        log.reason = 'Requires human approval';
        log.completedAt = new Date();
        log.durationMs = log.completedAt.getTime() - startedAt.getTime();
        await log.save();
        return { status: 'overridden' };
      }

      const output = await agent.execute(event);
      log.status = output?.skipped ? 'skipped' : 'completed';
      log.output = output;
      log.completedAt = new Date();
      log.durationMs = log.completedAt.getTime() - startedAt.getTime();
      await log.save();
      return { status: log.status };
    } catch (error) {
      log.status = 'failed';
      log.error = {
        message: error.message,
        stack: error.stack,
        code: error.code,
      };
      log.completedAt = new Date();
      log.durationMs = log.completedAt.getTime() - startedAt.getTime();
      await log.save();
      return { status: 'failed', error };
    }
  }

  async routeEvent(event) {
    const candidates = this.agents.filter((agent) => agent.shouldHandle(event.type, event.payload));
    const results = await Promise.all(candidates.map(async (agent) => ({
      agentName: agent.name,
      result: await this.runAgent(agent, event),
    })));
    const processedBy = results.map((item) => item.agentName);
    const failed = results.some((item) => item.result.status === 'failed');
    return { processedBy, failed };
  }

  async manualOverride({
    agentName,
    action,
    userId,
    note = '',
    eventId,
  }) {
    if (action === 'pause-agent') {
      await aiAgentControlService.setPause(agentName, true, userId, note);
    } else if (action === 'resume-agent') {
      await aiAgentControlService.setPause(agentName, false, userId, '');
    } else if (action === 'replay-event' && eventId) {
      await aiEventBusService.processEvent(eventId);
    }
    return { success: true };
  }

  start() {
    if (this.started) return;
    aiEventBusService.setHandler(this.routeEvent.bind(this));
    aiEventBusService.start();
    this.started = true;
    logger.info('[AIOrchestrator] Started');
  }
}

export default new AIOrchestratorService();
