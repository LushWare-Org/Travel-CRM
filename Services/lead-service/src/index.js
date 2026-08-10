import 'dotenv/config';
import pino from 'pino';

import app from './app.js';
import prisma from './db/client.js';

const logger = pino({
  name: 'lead-service',
  level: process.env.LOG_LEVEL || 'info',
});

const PORT = process.env.PORT || 3004;
const start = async () => {
  await prisma.$connect();
  app.listen(PORT, '0.0.0.0', () =>
    logger.info({ port: PORT }, 'lead-service started')
  );
};
start().catch((err) => { logger.error(err, 'Failed to start lead-service'); process.exit(1); });

export default app;
