import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    assignmentMode: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    autoStrategy: {
      type: String,
      enum: ['round_robin', 'load_based'],
      default: 'round_robin',
    },
    enabledSalesReps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roundRobinIndex: { type: Number, default: 0 },
    maxOpenLeadsPerRep: { type: Number, default: 100 },
    skipInactive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Singleton helper
settingsSchema.statics.getSingleton = async function getSingleton() {
  const Settings = this;
  let doc = await Settings.findOne();
  if (!doc) {
    doc = await Settings.create({});
  }
  return doc;
};

export default mongoose.model('Settings', settingsSchema);


