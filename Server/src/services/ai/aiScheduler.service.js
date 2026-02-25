import Lead from '../../models/lead.model.js';
import aiEventBusService from './aiEventBus.service.js';
import logger from '../../config/logger.js';

class AISchedulerService {
  constructor() {
    this.followUpTicker = null;
  }

  start() {
    if (this.followUpTicker) return;

    this.followUpTicker = setInterval(async () => {
      try {
        const dueLeads = await Lead.find({
          followUpDate: { $lte: new Date() },
          status: { $nin: ['converted', 'lost', 'not-interested'] },
        })
          .select('_id')
          .limit(20)
          .lean();

        await Promise.all(dueLeads.map((lead) => aiEventBusService.publish({
          type: 'followup.triggered',
          source: 'ai-scheduler',
          payload: { leadId: String(lead._id) },
        })));
      } catch (error) {
        logger.error(`[AIScheduler] Error in follow-up scheduler: ${error.message}`);
      }
    }, 5 * 60 * 1000);

    logger.info('[AIScheduler] Started');
  }
}

export default new AISchedulerService();
