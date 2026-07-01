import mongoose from 'mongoose';

const customerRetentionStateSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    retentionStatus: {
      type: String,
      enum: ['HEALTHY', 'AT_RISK', 'FOLLOW_UP_STAGE_1', 'FOLLOW_UP_STAGE_2', 'FOLLOW_UP_STAGE_3', 'ESCALATED', 'RECOVERED', 'CHURNED'],
      default: 'HEALTHY',
      index: true,
    },
    followUpStage: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextFollowUpAt: Date,
    cooldownUntil: Date,
    lastRiskLevel: {
      type: String,
      enum: ['LOW', 'MED', 'HIGH', 'CRITICAL'],
    },
    lastScoredAt: Date,
    lastPriorityScore: {
      type: Number,
      default: 0,
    },
    lastChurnProbability: {
      type: Number,
      default: 0,
    },
    modelVersion: {
      type: String,
      default: 'advanced_xgb_churn_model',
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

customerRetentionStateSchema.index({ retentionStatus: 1, nextFollowUpAt: 1 });
customerRetentionStateSchema.index({ cooldownUntil: 1 });

export default mongoose.model('CustomerRetentionState', customerRetentionStateSchema);
