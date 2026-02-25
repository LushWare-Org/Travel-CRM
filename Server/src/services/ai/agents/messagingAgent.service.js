import twilio from 'twilio';
import Lead from '../../../models/lead.model.js';
import geminiService from '../../gemini.service.js';
import emailService from '../../../utils/emailService.js';
import AIMemoryService from '../aiMemory.service.js';
import BaseAgent from './baseAgent.js';
import { messagingPrompt } from '../aiPromptTemplates.js';

const STAGE_MAP = {
  'lead.created': 'new lead',
  'lead.website.inquiry': 'inquiry submitted',
  'quotation.sent': 'quotation sent',
  'booking.confirmed': 'booking confirmed',
  'travel.pre_reminder': 'pre-travel reminders',
  'travel.during_support': 'during-travel assistance',
  'travel.post_feedback': 'post-travel feedback',
  'followup.message.requested': 'follow-up',
};

class MessagingAgentService extends BaseAgent {
  constructor() {
    super('customer-messaging-agent');
  }

  shouldHandle(eventType) {
    return Object.keys(STAGE_MAP).includes(eventType);
  }

  getTwilioClient() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return null;
    return twilio(sid, token);
  }

  async sendEmail(lead, content) {
    if (!lead?.email) return { channel: 'email', status: 'skipped', reason: 'missing email' };
    await emailService.sendEmail({
      to: lead.email,
      subject: 'Travel Update',
      text: content,
      html: `<p>${content}</p>`,
    });
    return { channel: 'email', status: 'sent' };
  }

  async sendWhatsApp(lead, content) {
    const client = this.getTwilioClient();
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = lead?.whatsapp || lead?.phone;
    if (!client || !fromNumber || !toNumber) {
      return { channel: 'whatsapp', status: 'skipped', reason: 'twilio whatsapp not configured' };
    }
    await client.messages.create({
      from: fromNumber,
      to: `whatsapp:${toNumber}`,
      body: content,
    });
    return { channel: 'whatsapp', status: 'sent' };
  }

  async sendSMS(lead, content) {
    const client = this.getTwilioClient();
    const fromNumber = process.env.TWILIO_SMS_FROM;
    if (!client || !fromNumber || !lead?.phone) {
      return { channel: 'sms', status: 'skipped', reason: 'twilio sms not configured' };
    }
    await client.messages.create({
      from: fromNumber,
      to: lead.phone,
      body: content,
    });
    return { channel: 'sms', status: 'sent' };
  }

  async generateMessage({ lead, stage, forcedMessage }) {
    if (forcedMessage) return forcedMessage;
    const memory = await AIMemoryService.getLatest('lead', lead._id, 'conversation');
    const prompt = messagingPrompt({
      stage,
      leadName: lead.name,
      destination: lead.destination,
      travelDate: lead.travelDate ? new Date(lead.travelDate).toDateString() : '',
      budget: lead.budget,
      preferences: lead.tags?.join(', ') || '',
      conversationSummary: memory?.summary || '',
    });
    try {
      return await geminiService.generateContent(prompt, { temperature: 0.6, maxTokens: 180 });
    } catch (error) {
      return `Hi ${lead.name || 'there'}, sharing an update for your ${lead.destination || 'trip'}. Reply here and we will finalize the next steps for your travel plan.`;
    }
  }

  async execute(event) {
    const leadId = event.payload?.leadId;
    if (!leadId) return { skipped: true, reason: 'missing leadId' };

    const lead = await Lead.findById(leadId);
    if (!lead) return { skipped: true, reason: 'lead not found' };

    const stage = STAGE_MAP[event.type] || 'customer update';
    const content = await this.generateMessage({
      lead,
      stage,
      forcedMessage: event.payload?.message,
    });

    const channels = event.payload?.channels || ['email', 'whatsapp', 'sms', 'inapp'];
    const deliveries = [];

    if (channels.includes('email')) deliveries.push(await this.sendEmail(lead, content));
    if (channels.includes('whatsapp')) deliveries.push(await this.sendWhatsApp(lead, content));
    if (channels.includes('sms')) deliveries.push(await this.sendSMS(lead, content));
    if (channels.includes('inapp')) deliveries.push({ channel: 'inapp', status: 'queued' });

    lead.communicationLogs.push({
      type: 'message',
      notes: `[${stage}] ${content}`,
      date: new Date(),
    });
    await lead.save();

    await AIMemoryService.upsertMemory({
      scopeType: 'lead',
      scopeId: lead._id,
      memoryType: 'conversation',
      summary: `${stage} message sent`,
      content: {
        stage,
        message: content,
        deliveries,
      },
      lastAgent: this.name,
      confidence: 0.8,
      tags: ['messaging'],
    });

    return { stage, message: content, deliveries };
  }
}

export default new MessagingAgentService();
