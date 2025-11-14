import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
    },
    phone: {
      type: String,
      required: false,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    salesRep: {
      type: String,
      trim: true,
    },
    time: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['manual', 'website', 'booking', 'social-media', 'phone-call', 'email', 'referral', 'walk-in', 'other'],
      default: 'manual',
    },
    platform: {
      type: String,
      enum: ['Manual Entry', 'Website Form', 'Paid Package', 'Social Media', 'Phone Call', 'Email', 'Referral', 'Walk-in'],
      default: 'Manual Entry',
    },
    fromCountry: {
      type: String,
      trim: true,
    },
    destinationCountry: {
      type: String,
      trim: true,
    },
    destination: String,
    travelDate: Date,
    endDate: Date,
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },
    customizedPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomizedPackage',
    },
    packageName: {
      type: String,
      trim: true,
    },
    leadDateTime: {
      type: Date,
      default: Date.now,
    },
    numberOfTravelers: Number,
    budget: String,
    message: String,
    remarks: [
      {
        text: {
          type: String,
          trim: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'quoted', 'converted', 'lost', 'not-interested'],
      default: 'new',
    },
    statusHistory: [
      {
        status: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignmentMode: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    currentItinerary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Itinerary',
    },
    manualItinerary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ManualItinerary',
    },
    itineraryVersions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Itinerary',
      },
    ],
    notificationSettings: {
      newLeadNotification: {
        type: Boolean,
        default: true,
      },
      statusChangeNotification: {
        type: Boolean,
        default: true,
      },
      assignmentNotification: {
        type: Boolean,
        default: true,
      },
      followUpReminder: {
        type: Boolean,
        default: true,
      },
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
  },
);

// Index for efficient queries
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ followUpDate: 1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ platform: 1 });
leadSchema.index({ fromCountry: 1, destinationCountry: 1 });
leadSchema.index({ leadDateTime: -1 });
leadSchema.index({ assignmentMode: 1 });
leadSchema.index({ city: 1 });

export default mongoose.model('Lead', leadSchema);
