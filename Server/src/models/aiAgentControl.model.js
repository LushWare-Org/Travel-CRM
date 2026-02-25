import mongoose from 'mongoose';

const aiAgentControlSchema = new mongoose.Schema(
  {
    agentName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    requiresHumanApproval: {
      type: Boolean,
      default: false,
    },
    pauseReason: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedAt: Date,
    config: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

export default mongoose.model('AIAgentControl', aiAgentControlSchema);
