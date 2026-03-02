import aiEventBusService from './aiEventBus.service.js';
import logger from '../../config/logger.js';

class RiskEventDispatcherService {
  async dispatch(outboxEvent) {
    await aiEventBusService.publish({
      type: outboxEvent.eventType,
      source: outboxEvent.source || 'risk-outbox-worker',
      payload: outboxEvent.payload || {},
      correlationId: outboxEvent.payload?.correlationId,
    });

    logger.info('[RiskEventDispatcher] Event delivered', {
      outboxId: String(outboxEvent._id),
      eventType: outboxEvent.eventType,
      dedupeKey: outboxEvent.dedupeKey,
    });
  }
}

export default new RiskEventDispatcherService();
