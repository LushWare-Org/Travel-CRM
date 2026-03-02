import cron from 'node-cron';
import Lead from '../../models/lead.model.js';
import Settings from '../../models/settings.model.js';
import aiEventBusService from './aiEventBus.service.js';
import logger from '../../config/logger.js';
import riskDetectionAgentService from './agents/riskDetectionAgent.service.js';
import riskOutboxPublisherWorker from './riskOutboxPublisher.worker.js';

class AISchedulerService {
  constructor() {
    this.followUpTicker = null;
    this.riskCron = null;
    this.riskOutboxTicker = null;
    this.isRiskBatchRunning = false;
    this.isOutboxPublishing = false;
  }

  start() {
    if (!this.followUpTicker) {
      this.followUpTicker = setInterval(async () => {
        try {
          const settings = await Settings.getSingleton();
          if (!settings.autoFollowUpEmails) {
            return;
          }

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
            payload: {
              leadId: String(lead._id),
              channels: ['email'],
            },
          })));
        } catch (error) {
          logger.error(`[AIScheduler] Error in follow-up scheduler: ${error.message}`);
        }
      }, 5 * 60 * 1000);
    }

    if (!this.riskCron) {
      const cronExpression = process.env.AI_RISK_DETECTION_CRON || '15 2 * * *';
      const cronTimezone = process.env.AI_RISK_DETECTION_CRON_TZ || 'UTC';

      this.riskCron = cron.schedule(cronExpression, async () => {
        if (this.isRiskBatchRunning) {
          logger.warn('[AIScheduler] Risk detection batch skipped; previous batch still running');
          return;
        }
        this.isRiskBatchRunning = true;
        try {
          await riskDetectionAgentService.runDailyRiskDetection();
          await riskOutboxPublisherWorker.publishPendingOutboxEvents();
        } catch (error) {
          logger.error(`[AIScheduler] Risk detection batch failed: ${error.message}`);
        } finally {
          this.isRiskBatchRunning = false;
        }
      }, {
        timezone: cronTimezone,
      });
    }

    if (!this.riskOutboxTicker) {
      const outboxPollMs = Number(process.env.RISK_OUTBOX_POLL_MS || 60_000);
      this.riskOutboxTicker = setInterval(async () => {
        if (this.isOutboxPublishing) return;
        this.isOutboxPublishing = true;
        try {
          await riskOutboxPublisherWorker.publishPendingOutboxEvents();
        } catch (error) {
          logger.error(`[AIScheduler] Risk outbox publisher failed: ${error.message}`);
        } finally {
          this.isOutboxPublishing = false;
        }
      }, outboxPollMs);
    }

    logger.info('[AIScheduler] Started', {
      riskCron: process.env.AI_RISK_DETECTION_CRON || '15 2 * * *',
      riskCronTimezone: process.env.AI_RISK_DETECTION_CRON_TZ || 'UTC',
      outboxPollMs: Number(process.env.RISK_OUTBOX_POLL_MS || 60_000),
    });
  }
}

export default new AISchedulerService();
