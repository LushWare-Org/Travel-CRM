import Lead from '../../../models/lead.model.js';
import geminiService from '../../gemini.service.js';
import AIMemoryService from '../aiMemory.service.js';
import BaseAgent from './baseAgent.js';
import { followUpPrompt } from '../aiPromptTemplates.js';
import aiEventBusService from '../aiEventBus.service.js';

class FollowUpAgentService extends BaseAgent {
  constructor() {
    super('follow-up-agent');
  }

  shouldHandle(eventType) {
    return ['lead.created', 'lead.updated', 'quotation.sent', 'followup.triggered'].includes(eventType);
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

  async execute(event) {
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
      content: { leadScore, dropOffProbability, followUpDate, message },
      lastAgent: this.name,
      confidence: 0.72,
      tags: ['follow-up'],
    });

    await aiEventBusService.publish({
      type: 'followup.message.requested',
      source: this.name,
      payload: {
        leadId: String(lead._id),
        message,
        channels: ['email', 'whatsapp'],
      },
      correlationId: event.correlationId,
    });

    return { leadScore, dropOffProbability, followUpDate, message };
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
