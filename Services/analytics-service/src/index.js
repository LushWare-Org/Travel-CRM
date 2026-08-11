import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { extractUser } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import { correlationId, requestLogger } from './middleware/requestLogger.js';
import logger from './config/logger.js';
import analyticsRoutes from './routes/analytics.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();
const PORT = process.env.PORT || 3009;
const V1 = '/api/v1';

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
// Request ID + structured logging (replaces morgan)
app.use(correlationId);
app.use(requestLogger);
app.use(express.json());
app.use(cookieParser());
app.use(extractUser);

app.use(`${V1}/analytics`, analyticsRoutes);
app.use(`${V1}/dashboard`, dashboardRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'analytics-service' }));
app.use(errorHandler);

app.listen(PORT, () => logger.info({ port: PORT }, 'analytics-service started'));
