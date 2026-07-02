import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import errorHandler from './middleware/errorHandler.js';
import webhookRoutes from './routes/webhook.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();
const PORT = process.env.PORT || 3008;
const V1 = '/api/v1';

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.use(`${V1}/webhooks`, webhookRoutes);
app.use(`${V1}/notifications`, notificationRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));
app.use(errorHandler);

app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));
