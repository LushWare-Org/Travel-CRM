import mongoose from 'mongoose';

const aiMemorySchema = new mongoose.Schema(
  {
    scopeType: {
      type: String,
      enum: ['lead', 'user', 'booking', 'global'],
      required: true,
      index: true,
    },
    scopeId: {
      type: String,
      required: true,
      index: true,
    },
    memoryType: {
      type: String,
      enum: ['conversation', 'preference', 'recommendation', 'follow-up', 'document', 'lifecycle'],
      required: true,
      index: true,
    },
    summary: String,
    content: mongoose.Schema.Types.Mixed,
    lastAgent: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    tags: [String],
    expiresAt: Date,
  },
  { timestamps: true },
);

aiMemorySchema.index({
  scopeType: 1, scopeId: 1, memoryType: 1, updatedAt: -1,
});

export default mongoose.model('AIMemory', aiMemorySchema);
