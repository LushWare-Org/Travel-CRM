import mongoose from 'mongoose';

const retentionFollowUpSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: true,
      default: 'churn_retention',
      index: true,
    },
    template: {
      type: String,
      required: true,
      default: 'retention_stage_1',
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },
    channels: {
      type: [String],
      default: ['email'],
    },
    metadata: mongoose.Schema.Types.Mixed,
    sentAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);

retentionFollowUpSchema.index({ customerId: 1, type: 1, status: 1 });
retentionFollowUpSchema.index({ scheduledAt: 1, status: 1 });

export default mongoose.model('RetentionFollowUp', retentionFollowUpSchema);
