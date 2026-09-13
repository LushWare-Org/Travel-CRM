import app from './app.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 3009;

app.listen(PORT, () => logger.info({ port: PORT }, 'analytics-service started'));
