import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Quotation must be linked to a lead'],
      index: true,
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
      gstNumber: String,
    },
    type: {
      type: String,
      enum: ['standard', 'custom', 'package-based'],
      default: 'standard',
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },
    items: [
      {
        description: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          enum: ['accommodation', 'transportation', 'activity', 'food', 'guide', 'insurance', 'visa', 'other'],
          default: 'other',
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        notes: String,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'none'],
      default: 'none',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceChargeRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceChargeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'],
      default: 'draft',
      index: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    notes: String,
    terms: String,
    paymentTerms: String,
    includedServices: [String],
    excludedServices: [String],
    convertedToInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    pdfUrl: String,
    sentAt: Date,
    viewedAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    expiresAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    version: {
      type: Number,
      default: 1,
    },
    revisionHistory: [
      {
        version: Number,
        modifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        modifiedAt: {
          type: Date,
          default: Date.now,
        },
        changes: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for outstanding validity
quotationSchema.virtual('isExpired').get(function () {
  return this.validUntil < new Date();
});

// Virtual for remaining days
quotationSchema.virtual('daysUntilExpiry').get(function () {
  const today = new Date();
  const diffTime = this.validUntil - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Generate quotation number before saving
quotationSchema.pre('save', async function (next) {
  if (this.isNew && !this.quotationNumber) {
    const count = await mongoose.model('Quotation').countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    this.quotationNumber = `QT-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  
  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate discount
  if (this.discountType === 'percentage') {
    this.discountAmount = (this.subtotal * this.discountValue) / 100;
  } else if (this.discountType === 'fixed') {
    this.discountAmount = this.discountValue;
  }
  
  // Calculate service charge
  this.serviceChargeAmount = (this.subtotal * this.serviceChargeRate) / 100;
  
  // Calculate tax
  const taxableAmount = this.subtotal - this.discountAmount + this.serviceChargeAmount;
  this.taxAmount = (taxableAmount * this.taxRate) / 100;
  
  // Calculate total
  this.totalAmount = taxableAmount + this.taxAmount;
  
  // Auto-expire check
  if (this.status === 'sent' && this.validUntil < new Date()) {
    this.status = 'expired';
  }
  
  next();
});

// Index for efficient queries
quotationSchema.index({ lead: 1, createdAt: -1 });
quotationSchema.index({ status: 1, validUntil: 1 });
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ quotationNumber: 1 });

export default mongoose.model('Quotation', quotationSchema);
