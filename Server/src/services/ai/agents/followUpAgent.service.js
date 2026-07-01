import Lead from '../../../models/lead.model.js';
import User from '../../../models/user.model.js';
import CustomerRetentionState from '../../../models/customerRetentionState.model.js';
import RetentionFollowUp from '../../../models/retentionFollowUp.model.js';
import geminiService from '../../gemini.service.js';
import AIMemoryService from '../aiMemory.service.js';
import BaseAgent from './baseAgent.js';
import { followUpPrompt } from '../aiPromptTemplates.js';
import aiEventBusService from '../aiEventBus.service.js';
import retentionLoggerService from '../retentionLogger.service.js';

const RETENTION_TEMPLATES = {
  retention_stage_1: 'Hi {{name}}, we noticed you have not interacted recently.',
  retention_stage_2: "We would love to have you back. Here is a special offer.",
  retention_stage_3: 'Our team is ready to help you with anything.',
};

const templateToStageStatus = {
  retention_stage_1: { stage: 1, status: 'FOLLOW_UP_STAGE_1' },
  retention_stage_2: { stage: 2, status: 'FOLLOW_UP_STAGE_2' },
  retention_stage_3: { stage: 3, status: 'FOLLOW_UP_STAGE_3' },
};

class FollowUpAgentService extends BaseAgent {
  constructor() {
    super('follow-up-agent');
  }

  shouldHandle(eventType) {
    return ['quotation.sent', 'followup.triggered', 'retention.followup.triggered'].includes(eventType);
  }

  computeLeadScore(lead) {
    let score = 0;
    if (lead.destination) score += 20;
    if (lead.travelDate) score += 20;
    if (lead.budget) score += 20;
    if (lead.numberOfTravelers) score += 10;
    if (lead.quoteSent) score += 15;
    if (lead.status === 'interested') score += 15;
    return Math.min(100, score);
  }

  computeDropOffProbability(lead, leadScore) {
    const lastTouched = lead.updatedAt ? new Date(lead.updatedAt).getTime() : Date.now();
    const idleHours = (Date.now() - lastTouched) / (1000 * 60 * 60);
    let risk = 0.25;
    if (lead.status === 'new') risk += 0.2;
    if (idleHours > 24) risk += 0.2;
    if (idleHours > 72) risk += 0.2;
    risk += (100 - leadScore) / 500;
    return Math.max(0, Math.min(0.98, Number(risk.toFixed(2))));
  }

  async getStrategyAdjustment(leadId) {
    const memory = await AIMemoryService.getLatest('lead', leadId, 'follow-up');
    const feedback = memory?.content?.feedback || { total: 0, positive: 0 };
    if (!feedback.total) return 0;
    const successRate = feedback.positive / feedback.total;
    return successRate < 0.4 ? 0.1 : -0.05;
  }

  getNextFollowUpDate(dropOffProbability) {
    const now = Date.now();
    if (dropOffProbability >= 0.75) return new Date(now + (2 * 60 * 60 * 1000));
    if (dropOffProbability >= 0.55) return new Date(now + (8 * 60 * 60 * 1000));
    return new Date(now + (24 * 60 * 60 * 1000));
  }

  async generateFollowUpMessage(lead, leadScore, dropOffProbability) {
    const summary = `status=${lead.status}, destination=${lead.destination || 'n/a'}, budget=${lead.budget || 'n/a'}`;
    const prompt = followUpPrompt({
      leadName: lead.name,
      stage: lead.status,
      dropOffProbability,
      leadScore,
      summary,
    });
    try {
      return await geminiService.generateContent(prompt, { temperature: 0.5, maxTokens: 120 });
    } catch (error) {
      return `Hi ${lead.name || ''}, just checking in on your ${lead.destination || 'travel'} plan. Share your preferred dates and we will finalize your best itinerary today.`;
    }
  }

  formatRetentionTemplate(template, customerName) {
    const base = RETENTION_TEMPLATES[template] || RETENTION_TEMPLATES.retention_stage_1;
    return base.replace('{{name}}', customerName || 'there');
  }

  getNextRetentionTemplate(template) {
    if (template === 'retention_stage_1') return 'retention_stage_2';
    if (template === 'retention_stage_2') return 'retention_stage_3';
    return null;
  }

  async handleRetentionFollowUp(event) {
    const followUpId = event.payload?.followUpId;
    if (!followUpId) return { skipped: true, reason: 'missing followUpId' };

    const followUp = await RetentionFollowUp.findById(followUpId);
    if (!followUp) return { skipped: true, reason: 'follow-up not found' };
    if (followUp.status !== 'pending') return { skipped: true, reason: `follow-up status is ${followUp.status}` };

    followUp.status = 'processing';
    await followUp.save();

    const customer = await User.findById(followUp.customerId).select('_id name email');
    if (!customer) {
      followUp.status = 'failed';
      await followUp.save();
      return { skipped: true, reason: 'customer not found' };
    }

    let leadId = followUp.leadId ? String(followUp.leadId) : null;
    if (!leadId && customer.email) {
      const lead = await Lead.findOne({ email: String(customer.email).toLowerCase() })
        .sort({ updatedAt: -1 })
        .select('_id')
        .lean();
      leadId = lead?._id ? String(lead._id) : null;
      if (leadId) {
        followUp.leadId = leadId;
      }
    }

    const message = this.formatRetentionTemplate(followUp.template, customer.name);
    if (!event.payload?.suppressPublish) {
      await aiEventBusService.publish({
        type: 'retention.message.requested',
        source: this.name,
        payload: {
          customerId: String(customer._id),
          leadId: leadId || undefined,
          message,
          template: followUp.template,
          channels: followUp.channels || ['email'],
        },
        correlationId: event.correlationId,
      });
    }

    const stageInfo = templateToStageStatus[followUp.template] || templateToStageStatus.retention_stage_1;
    const nextTemplate = this.getNextRetentionTemplate(followUp.template);
    const nextFollowUpAt = nextTemplate ? new Date(Date.now() + (24 * 60 * 60 * 1000)) : null;

    await CustomerRetentionState.findOneAndUpdate(
      { customer: customer._id },
      {
        $set: {
          retentionStatus: stageInfo.status,
          followUpStage: stageInfo.stage,
          nextFollowUpAt,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (nextTemplate) {
      await RetentionFollowUp.create({
        customerId: customer._id,
        leadId: leadId || null,
        type: 'churn_retention',
        template: nextTemplate,
        scheduledAt: nextFollowUpAt,
        status: 'pending',
        channels: followUp.channels || ['email'],
        metadata: {
          previousFollowUpId: String(followUp._id),
        },
      });
    }

    followUp.status = 'sent';
    followUp.sentAt = new Date();
    await followUp.save();

    await retentionLoggerService.log(customer._id, 'retention.followup.executed', {
      followUpId: String(followUp._id),
      template: followUp.template,
      nextTemplate,
      nextFollowUpAt,
      leadId,
    });

    return {
      followUpId: String(followUp._id),
      customerId: String(customer._id),
      leadId,
      template: followUp.template,
      message,
      channels: followUp.channels || ['email'],
    };
  }

  async execute(event) {
    if (event.type === 'retention.followup.triggered') {
      return this.handleRetentionFollowUp(event);
    }

    const leadId = event.payload?.leadId;
    if (!leadId) return { skipped: true, reason: 'missing leadId' };
    const lead = await Lead.findById(leadId);
    if (!lead) return { skipped: true, reason: 'lead not found' };

    const leadScore = this.computeLeadScore(lead);
    const adjustment = await this.getStrategyAdjustment(lead._id);
    const dropOffProbability = Math.max(0, Math.min(1, this.computeDropOffProbability(lead, leadScore) + adjustment));
    const followUpDate = this.getNextFollowUpDate(dropOffProbability);
    const message = await this.generateFollowUpMessage(lead, leadScore, dropOffProbability);

    lead.followUpDate = followUpDate;
    await lead.save();

    await AIMemoryService.upsertMemory({
      scopeType: 'lead',
      scopeId: lead._id,
      memoryType: 'follow-up',
      summary: `Lead score ${leadScore}, dropoff ${dropOffProbability}`,
      content: {
        leadScore, dropOffProbability, followUpDate, message,
      },
      lastAgent: this.name,
      confidence: 0.72,
      tags: ['follow-up'],
    });

    if (!event.payload?.suppressPublish) {
      await aiEventBusService.publish({
        type: 'followup.message.requested',
        source: this.name,
        payload: {
          leadId: String(lead._id),
          message,
          channels: event.payload?.channels || ['email', 'whatsapp'],
        },
        correlationId: event.correlationId,
      });
    }

    return {
      leadScore, dropOffProbability, followUpDate, message,
    };
  }

  async recordFeedback(leadId, outcome) {
    const existing = await AIMemoryService.getLatest('lead', leadId, 'follow-up');
    const feedback = existing?.content?.feedback || { total: 0, positive: 0 };
    feedback.total += 1;
    if (['responded', 'converted'].includes(outcome)) {
      feedback.positive += 1;
    }
    return AIMemoryService.upsertMemory({
      scopeType: 'lead',
      scopeId: leadId,
      memoryType: 'follow-up',
      summary: `Follow-up feedback updated (${feedback.positive}/${feedback.total})`,
      content: {
        ...(existing?.content || {}),
        feedback,
      },
      lastAgent: this.name,
      confidence: 0.7,
      tags: ['follow-up', 'feedback'],
    });
  }
}

export default new FollowUpAgentService();
