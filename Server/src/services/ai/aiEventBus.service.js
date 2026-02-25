import { EventEmitter } from 'events';
import crypto from 'crypto';
import AIEvent from '../../models/aiEvent.model.js';
import logger from '../../config/logger.js';

class AIEventBusService extends EventEmitter {
  constructor() {
    super();
    this.handler = null;
    this.poller = null;
    this.retryPoller = null;
    this.isProcessing = false;
  }

  setHandler(handler) {
    this.handler = handler;
  }

  async publish({ type, source, payload = {}, correlationId }) {
    const event = await AIEvent.create({
      type,
      source,
      payload,
      correlationId: correlationId || crypto.randomUUID(),
      status: 'queued',
    });
    setImmediate(() => this.processEvent(event._id));
    return event;
  }

  async processEvent(eventId) {
    if (!this.handler) return;

    const event = await AIEvent.findById(eventId);
    if (!event) return;

    if (event.status !== 'queued' && event.status !== 'failed') {
      return;
    }

    if (event.nextRetryAt && event.nextRetryAt > new Date()) {
      return;
    }

    event.status = 'processing';
    event.attempts += 1;
    await event.save();

    try {
      const result = await this.handler(event);
      event.status = result?.failed ? 'failed' : 'processed';
      event.processedAt = new Date();
      if (Array.isArray(result?.processedBy)) {
        event.processedBy = result.processedBy;
      }
      if (result?.failed && event.attempts < event.maxAttempts) {
        event.status = 'queued';
        event.nextRetryAt = new Date(Date.now() + (event.attempts * 30 * 1000));
      } else if (result?.failed) {
        event.status = 'failed';
      }
      await event.save();
    } catch (error) {
      event.lastError = {
        message: error.message,
        stack: error.stack,
        code: error.code,
      };
      if (event.attempts < event.maxAttempts) {
        event.status = 'queued';
        event.nextRetryAt = new Date(Date.now() + (event.attempts * 30 * 1000));
      } else {
        event.status = 'failed';
      }
      await event.save();
      logger.error(`[AIEventBus] Failed event ${event.type}: ${error.message}`);
    }
  }

  start() {
    if (this.poller) return;
    this.poller = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        const queued = await AIEvent.find({
          status: 'queued',
          $or: [{ nextRetryAt: { $exists: false } }, { nextRetryAt: { $lte: new Date() } }],
        })
          .sort({ createdAt: 1 })
          .limit(10)
          .select('_id');
        await Promise.all(queued.map((evt) => this.processEvent(evt._id)));
      } finally {
        this.isProcessing = false;
      }
    }, 5000);

    logger.info('[AIEventBus] Poller started');
  }

  stop() {
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = null;
    }
  }
}

export default new AIEventBusService();
