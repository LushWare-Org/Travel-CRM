import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import pino from 'pino';

import errorHandler from './middleware/errorHandler.js';
import leadRoutes from './routes/lead.routes.js';
import prisma from './db/client.js';

const logger = pino({
  name: 'lead-service',
  level: process.env.LOG_LEVEL || 'info',
});

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'lead-service', timestamp: new Date().toISOString() })
);

app.use('/api/v1/leads', leadRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.path}` }));
app.use(errorHandler);

const PORT = process.env.PORT || 3004;
const start = async () => {
  await prisma.$connect();
  app.listen(PORT, '0.0.0.0', () =>
    logger.info({ port: PORT }, 'lead-service started')
  );
};
start().catch((err) => { logger.error(err, 'Failed to start lead-service'); process.exit(1); });

export default app;
