import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import riskDetectionAgentService from '../services/ai/agents/riskDetectionAgent.service.js';
import riskOutboxPublisherWorker from '../services/ai/riskOutboxPublisher.worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const scoreDate = process.argv[2] || null;

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const summary = await riskDetectionAgentService.runDailyRiskDetection(scoreDate);
  const outbox = await riskOutboxPublisherWorker.publishPendingOutboxEvents();
  console.log(JSON.stringify({ summary, outbox }, null, 2));
};

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Risk detection batch failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  });
