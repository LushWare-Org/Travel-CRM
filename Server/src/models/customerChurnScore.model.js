import mongoose from 'mongoose';

const customerChurnScoreSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pChurn: {
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
    scoredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

customerChurnScoreSchema.index({ customer: 1, scoredAt: -1 });

export default mongoose.model('CustomerChurnScore', customerChurnScoreSchema);
