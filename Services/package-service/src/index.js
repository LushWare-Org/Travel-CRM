import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { extractUser } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import packageRoutes from './routes/package.routes.js';
import reviewRoutes from './routes/review.routes.js';
import itineraryRoutes from './routes/itinerary.routes.js';
import manualItineraryRoutes from './routes/manualItinerary.routes.js';
import customizedPackageRoutes from './routes/customizedPackage.routes.js';
import hotelSuggestionRoutes from './routes/hotelSuggestion.routes.js';
import uploadRoutes from './routes/upload.routes.js';

const app = express();
const PORT = process.env.PORT || 3003;
const V1 = '/api/v1';

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(extractUser);

app.use(`${V1}/packages`, packageRoutes);
app.use(`${V1}/reviews`, reviewRoutes);
app.use(`${V1}/itineraries`, itineraryRoutes);
app.use(`${V1}/manual-itineraries`, manualItineraryRoutes);
app.use(`${V1}/customized-packages`, customizedPackageRoutes);
app.use(`${V1}/hotels`, hotelSuggestionRoutes);
app.use(`${V1}/upload`, uploadRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'package-service' }));
app.use(errorHandler);

app.listen(PORT, () => console.log(`Package service running on port ${PORT}`));
