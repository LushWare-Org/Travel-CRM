import AIRetentionLog from '../../models/aiRetentionLog.model.js';
import logger from '../../config/logger.js';

class RetentionLoggerService {
  async log(customerId, event, details = {}) {
    if (!customerId || !event) return null;

    try {
      return await AIRetentionLog.create({
        customerId,
        event,
        timestamp: new Date(),
        details,
      });
    } catch (error) {
      logger.error(`[AI_RETENTION_LOG] Failed to write log: ${error.message}`, {
        customerId: String(customerId),
        event,
      });
      return null;
    }
  }
}

export default new RetentionLoggerService();
