import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      required: false, // Auto-generated in pre-save hook
      unique: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Voucher must be linked to a lead'],
      index: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },
    customizedPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomizedPackage',
    },
    customer: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: true,
      },
      address: String,
    },
    // Location dates - check-in/check-out for each location
    locationDates: [
      {
        location: {
          type: String,
          required: true,
        },
        checkIn: {
          type: Date,
          required: true,
        },
        checkOut: {
          type: Date,
          required: true,
        },
        accommodation: {
          name: String,
          type: String,
          address: String,
        },
      },
    ],
    // Package details
    packageDetails: {
      name: String,
      destination: String,
      duration: Number,
      category: String,
      inclusions: [String],
      exclusions: [String],
      highlights: [String],
    },
    // Meal plans from itinerary (day-wise)
    mealPlans: [
      {
        dayNumber: Number,
        dayTitle: String,
        breakfast: Boolean,
        lunch: Boolean,
        dinner: Boolean,
      },
    ],
    // Itinerary summary
    itinerarySummary: [
      {
        dayNumber: Number,
        title: String,
        locations: [String],
        activities: [String],
        accommodation: {
          name: String,
          type: String,
        },
      },
    ],
    // Travel dates
    travelStartDate: {
      type: Date,
      required: true,
    },
    travelEndDate: {
      type: Date,
      required: true,
    },
    // Additional information
    notes: String,
    terms: [String],
    specialInstructions: String,
    // Status
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'confirmed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    // Email and WhatsApp tracking
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: Date,
    whatsappSent: {
      type: Boolean,
      default: false,
    },
    whatsappSentAt: Date,
    viewedAt: Date,
    confirmedAt: Date,
    // PDF
    pdfUrl: String,
    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Generate voucher number before saving
voucherSchema.pre('save', async function (next) {
  if (this.isNew && !this.voucherNumber) {
    const count = await mongoose.model('Voucher').countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    this.voucherNumber = `VCH-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Indexes
voucherSchema.index({ lead: 1, createdAt: -1 });
voucherSchema.index({ status: 1 });
voucherSchema.index({ voucherNumber: 1 });

const Voucher = mongoose.model('Voucher', voucherSchema);

export default Voucher;



