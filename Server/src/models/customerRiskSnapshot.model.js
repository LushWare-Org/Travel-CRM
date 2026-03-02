import mongoose from 'mongoose';

const customerRiskSnapshotSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scoreDate: {
      type: Date,
      required: true,
      index: true,
    },
    churnProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MED', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    priorityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      index: true,
    },
    ltv: {
      type: Number,
      required: true,
      min: 0,
    },
    ltvP95: {
      type: Number,
      required: true,
      min: 0,
    },
    normalizedLtv: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    modelVersion: {
      type: String,
      default: 'advanced_xgb_churn_model',
    },
    featurePayload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

customerRiskSnapshotSchema.index({ customer: 1, scoreDate: 1 }, { unique: true });
customerRiskSnapshotSchema.index({ scoreDate: 1, riskLevel: 1 });

export default mongoose.model('CustomerRiskSnapshot', customerRiskSnapshotSchema);
