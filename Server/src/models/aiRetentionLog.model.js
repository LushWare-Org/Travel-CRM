import mongoose from 'mongoose';

const aiRetentionLogSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    details: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

aiRetentionLogSchema.index({ customerId: 1, timestamp: -1 });

export default mongoose.model('AIRetentionLog', aiRetentionLogSchema);
