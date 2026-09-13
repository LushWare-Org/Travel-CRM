import app from './app.js';
import logger from './config/logger.js';
import prisma from './db/client.js';

const PORT = process.env.PORT || 3002;

const start = async () => {
  await prisma.$connect();
  app.listen(PORT, '0.0.0.0', () =>
    logger.info({ port: PORT }, 'user-service started')
  );
};

start().catch((err) => {
  logger.error({ err }, 'user-service startup error');
  process.exit(1);
});
