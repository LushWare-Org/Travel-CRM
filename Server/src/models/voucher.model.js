import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      required: false, // Auto-generated in pre-save hook
      unique: true,
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
      },
      address: String,
    },
    // Location dates - check-in/check-out for each location
    locationDates: [
      {
        location: {
          type: String,
        },
        hotelName: {
          type: String, // Added for manual vouchers
        },
        checkIn: {
          type: Date,
        },
        checkOut: {
          type: Date,
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
      price: Number,
      // Added for manual vouchers to store images directly
      coverImage: {
        url: String,
        public_id: String,
      },
      images: [
        {
          url: String,
          public_id: String,
          isCover: Boolean,
        },
      ],
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
        dayNumber: { type: Number },
        title: { type: String, default: '' },
        locations: [{ type: String }],
        activities: [{ type: String }],
        accommodation: {
          name: { type: String, default: '' },
          type: { type: String, default: '' },
        },
      },
    ],
    // Travel dates
    travelStartDate: {
      type: Date,
    },
    travelEndDate: {
      type: Date,
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

// Clean and validate itinerarySummary accommodation before saving
voucherSchema.pre('save', function (next) {
  if (this.itinerarySummary && Array.isArray(this.itinerarySummary)) {
    this.itinerarySummary = this.itinerarySummary.map((day) => {
      if (day.accommodation && typeof day.accommodation === 'object' && !Array.isArray(day.accommodation)) {
        return {
          ...day,
          accommodation: {
            name: String(day.accommodation.name || ''),
            type: String(day.accommodation.type || ''),
          },
        };
      }
      return {
        ...day,
        accommodation: {
          name: String(day.accommodation?.name || ''),
          type: String(day.accommodation?.type || ''),
        },
      };
    });
  }
  next();
});

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
