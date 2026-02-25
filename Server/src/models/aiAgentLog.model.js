import mongoose from 'mongoose';

const aiAgentLogSchema = new mongoose.Schema(
  {
    agentName: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    correlationId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'skipped', 'overridden'],
      required: true,
      default: 'pending',
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    reason: String,
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    error: {
      message: String,
      stack: String,
      code: String,
    },
    startedAt: Date,
    completedAt: Date,
    durationMs: Number,
    manualOverride: {
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      note: String,
      at: Date,
      action: {
        type: String,
        enum: ['pause-agent', 'resume-agent', 'skip-event', 'replay-event', 'manual-message', 'manual-document'],
      },
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

aiAgentLogSchema.index({ createdAt: -1, agentName: 1 });
aiAgentLogSchema.index({ lead: 1, createdAt: -1 });

export default mongoose.model('AIAgentLog', aiAgentLogSchema);
