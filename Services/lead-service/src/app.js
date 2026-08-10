import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import errorHandler from './middleware/errorHandler.js';
import leadRoutes from './routes/lead.routes.js';

// The Express app, built without starting a server or connecting to the DB so
// it can be imported directly by supertest. `src/index.js` owns the lifecycle.
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

export default app;
