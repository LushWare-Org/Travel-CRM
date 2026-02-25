import mongoose from 'mongoose';

const aiEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
    },
    payload: mongoose.Schema.Types.Mixed,
    correlationId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'processed', 'failed', 'ignored'],
      default: 'queued',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    nextRetryAt: Date,
    lastError: {
      message: String,
      stack: String,
      code: String,
    },
    processedBy: [String],
    processedAt: Date,
  },
  { timestamps: true },
);

aiEventSchema.index({ status: 1, createdAt: 1 });
aiEventSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('AIEvent', aiEventSchema);
