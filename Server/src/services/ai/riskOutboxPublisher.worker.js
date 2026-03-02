import EventOutbox from '../../models/eventOutbox.model.js';
import logger from '../../config/logger.js';
import riskEventDispatcherService from './riskEventDispatcher.service.js';

const CLAIM_STALE_MS = 10 * 60 * 1000;

class RiskOutboxPublisherWorker {
  getRetryDelayMs(attempt) {
    const baseSeconds = Math.min(3600, Math.max(15, attempt * 30));
    return baseSeconds * 1000;
  }

  async claimEvent(eventId) {
    const staleBefore = new Date(Date.now() - CLAIM_STALE_MS);
    return EventOutbox.findOneAndUpdate(
      {
        _id: eventId,
        publishedAt: null,
        $or: [{ processingAt: null }, { processingAt: { $lt: staleBefore } }],
      },
      {
        $set: { processingAt: new Date() },
      },
      { new: true },
    );
  }

  async publishPendingOutboxEvents(options = {}) {
    const {
      limit = Number(process.env.RISK_OUTBOX_BATCH_SIZE || 50),
      dispatcher = riskEventDispatcherService.dispatch.bind(riskEventDispatcherService),
    } = options;

    const now = new Date();
    const candidates = await EventOutbox.find({
      publishedAt: null,
      status: { $in: ['pending', 'failed'] },
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .select('_id');

    let published = 0;
    let failed = 0;

    for (const candidate of candidates) {
      const event = await this.claimEvent(candidate._id);
      if (!event) continue;

      const attempt = (event.attempts || 0) + 1;
      try {
        await dispatcher(event);
        await EventOutbox.updateOne(
          { _id: event._id, publishedAt: null },
          {
            $set: {
              status: 'published',
              publishedAt: new Date(),
              processingAt: null,
              nextRetryAt: null,
            },
            $inc: {
              attempts: 1,
            },
          },
        );
        published += 1;
      } catch (error) {
        const nextRetryAt = new Date(Date.now() + this.getRetryDelayMs(attempt));
        await EventOutbox.updateOne(
          { _id: event._id },
          {
            $set: {
              status: 'failed',
              processingAt: null,
              nextRetryAt,
              lastError: {
                message: error.message,
                stack: error.stack,
                code: error.code,
              },
            },
            $inc: {
              attempts: 1,
            },
          },
        );
        failed += 1;
        logger.error('[RiskOutboxPublisher] Failed to publish event', {
          outboxId: String(event._id),
          dedupeKey: event.dedupeKey,
          eventType: event.eventType,
          error: error.message,
        });
      }
    }

    if (published || failed) {
      logger.info('[RiskOutboxPublisher] Publish cycle complete', {
        published,
        failed,
      });
    }

    return { published, failed };
  }
}

export default new RiskOutboxPublisherWorker();
