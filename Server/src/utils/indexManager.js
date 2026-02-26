import mongoose from 'mongoose';
import logger from '../config/logger.js';

export const dropReviewsIndexes = async () => {
  try {
    const { db } = mongoose.connection;
    if (!db) {
      logger.warn('Database connection not ready');
      return;
    }

    const collection = db.collection('reviews');
    const indexes = await collection.listIndexes().toArray();
    for (const index of indexes) {
      if (index.name === 'userId_1_packageId_1') {
        await collection.dropIndex('userId_1_packageId_1');
        logger.info('Successfully dropped userId_1_packageId_1 unique index');
        return;
      }
    }

    logger.info('No problematic indexes found to drop');
  } catch (error) {
    logger.error('Error managing indexes:', error.message);
  }
};
