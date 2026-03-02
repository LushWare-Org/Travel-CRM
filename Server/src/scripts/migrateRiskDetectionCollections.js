import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import CustomerRetentionState from '../models/customerRetentionState.model.js';
import CustomerRiskSnapshot from '../models/customerRiskSnapshot.model.js';
import EventOutbox from '../models/eventOutbox.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  await CustomerRetentionState.createCollection();
  await CustomerRiskSnapshot.createCollection();
  await EventOutbox.createCollection();

  await CustomerRetentionState.syncIndexes();
  await CustomerRiskSnapshot.syncIndexes();
  await EventOutbox.syncIndexes();

  console.log('Risk detection collections and indexes are ready.');
};

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Risk detection migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  });
