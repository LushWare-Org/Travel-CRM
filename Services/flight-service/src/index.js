import app from './app.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 3010;

app.listen(PORT, () => logger.info({ port: PORT }, 'Flight service started'));

