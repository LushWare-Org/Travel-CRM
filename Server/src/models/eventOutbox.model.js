import mongoose from 'mongoose';

const eventOutboxSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      default: 'risk-detection-agent',
    },
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'failed', 'published'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 10,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
    processingAt: {
      type: Date,
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastError: {
      message: String,
      stack: String,
      code: String,
    },
  },
  { timestamps: true },
);

eventOutboxSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });

export default mongoose.model('EventOutbox', eventOutboxSchema);
