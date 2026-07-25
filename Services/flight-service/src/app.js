import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import flightRoutes from './routes/flight.routes.js';
import { extractUser } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(extractUser);

app.use('/api/v1/flights', flightRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'flight-service' }));
app.use(errorHandler);

export default app;
