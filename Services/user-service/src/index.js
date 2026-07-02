import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { extractUser } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import salesRepRoutes from './routes/salesRep.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import prisma from './db/client.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Extract user context from gateway headers
app.use(extractUser);

app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() })
);

app.use('/api/v1/users',      userRoutes);
app.use('/api/v1/admin',      adminRoutes);
app.use('/api/v1/sales-reps', salesRepRoutes);
app.use('/api/v1/vendors',    vendorRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.path}` }));
app.use(errorHandler);

const PORT = process.env.PORT || 3002;

const start = async () => {
  await prisma.$connect();
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`[user-service] Running on http://0.0.0.0:${PORT}`)
  );
};

start().catch((err) => {
  console.error('[user-service] Startup error:', err);
  process.exit(1);
});

export default app;
