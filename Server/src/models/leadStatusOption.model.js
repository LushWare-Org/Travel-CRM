import mongoose from 'mongoose';

const leadStatusOptionSchema = new mongoose.Schema(
  {
    statusName: {
      type: String,
      required: [true, 'Status name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      default: '#6B7280', // Gray
    },
    icon: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
leadStatusOptionSchema.index({ order: 1 });
leadStatusOptionSchema.index({ isActive: 1 });

export default mongoose.model('LeadStatusOption', leadStatusOptionSchema);
