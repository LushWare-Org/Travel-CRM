import 'dotenv/config';
import app from './app.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 3012;

app.listen(PORT, '0.0.0.0', () => logger.info({ port: PORT }, 'voice-service started'));
