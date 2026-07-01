import User from '../../../models/user.model.js';
import Lead from '../../../models/lead.model.js';
import CustomerRetentionState from '../../../models/customerRetentionState.model.js';
import RetentionFollowUp from '../../../models/retentionFollowUp.model.js';
import BaseAgent from './baseAgent.js';
import retentionLoggerService from '../retentionLogger.service.js';

class RetentionLifecycleAgentService extends BaseAgent {
  constructor() {
    super('retention-lifecycle-agent');
  }

  shouldHandle(eventType) {
    return ['receipt.created', 'booking.confirmed', 'retention.customer.positive_reply'].includes(eventType);
  }

  async resolveCustomerId(event) {
    if (event.payload?.customerId) return String(event.payload.customerId);
    if (event.type === 'booking.confirmed' && event.payload?.userId) return String(event.payload.userId);

    if (event.payload?.leadId) {
      const lead = await Lead.findById(event.payload.leadId).select('email').lean();
      if (!lead?.email) return null;
      const customer = await User.findOne({
        role: 'customer',
        email: String(lead.email).toLowerCase(),
      }).select('_id').lean();
      return customer?._id ? String(customer._id) : null;
    }

    return null;
  }

  async markRecoveredAndCancelFollowUps(customerId, recoveryEvent) {
    await CustomerRetentionState.findOneAndUpdate(
      { customer: customerId },
      {
        $set: {
          retentionStatus: 'RECOVERED',
          followUpStage: 0,
          nextFollowUpAt: null,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    const cancelResult = await RetentionFollowUp.updateMany(
      {
        customerId,
        type: 'churn_retention',
        status: { $in: ['pending', 'processing'] },
      },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      },
    );

    await retentionLoggerService.log(customerId, 'retention.recovered', {
      recoveryEvent,
      cancelledFollowUps: cancelResult.modifiedCount || 0,
    });

    return {
      customerId: String(customerId),
      retentionStatus: 'RECOVERED',
      cancelledFollowUps: cancelResult.modifiedCount || 0,
    };
  }

  async execute(event) {
    const customerId = await this.resolveCustomerId(event);
    if (!customerId) return { skipped: true, reason: 'customer not resolved for recovery event' };

    return this.markRecoveredAndCancelFollowUps(customerId, event.type);
  }
}

export default new RetentionLifecycleAgentService();
