import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: true,
      length: 6,
    },
    type: {
      type: String,
      enum: ['login', 'passwordReset', 'emailVerification'],
      default: 'login',
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    ipAddress: {
      type: String,
      sparse: true,
    },
    userAgent: {
      type: String,
      sparse: true,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete when expiration time passes
    },
  },
  {
    timestamps: true,
  },
);

// Index for quick lookups by userId and type
otpSchema.index({ userId: 1, type: 1 });

// Index for quick lookups by email
otpSchema.index({ email: 1 });

// Pre-save middleware to validate attempts
otpSchema.pre('save', async function (next) {
  if (this.attempts > 5) {
    // Delete all OTP records for this user if too many attempts
    await this.constructor.deleteMany({ userId: this.userId, type: this.type });
    throw new Error('Too many failed OTP attempts. Please request a new OTP.');
  }
  next();
});

export default mongoose.model('OTP', otpSchema);
