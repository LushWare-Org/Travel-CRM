import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
    },
    source: {
      type: String,
      enum: ['website', 'social-media', 'phone-call', 'email', 'referral', 'walk-in', 'other'],
      default: 'website',
    },
    destination: String,
    travelDate: Date,
    numberOfTravelers: Number,
    budget: String,
    message: String,
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'quoted', 'converted', 'lost', 'not-interested'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    communicationLogs: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ['call', 'email', 'meeting', 'message', 'other'],
        },
        notes: String,
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    followUpDate: Date,
    quoteSent: {
      type: Boolean,
      default: false,
    },
    quoteAmount: Number,
    convertedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    lostReason: String,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ followUpDate: 1 });

export default mongoose.model('Lead', leadSchema);
