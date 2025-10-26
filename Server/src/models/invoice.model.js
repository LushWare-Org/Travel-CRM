import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Invoice must be linked to a lead'],
      index: true,
    },
    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
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
      enum: ['invoice', 'proforma', 'tax-invoice', 'commercial-invoice'],
      default: 'invoice',
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
        taxRate: {
          type: Number,
          default: 0,
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
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'],
      default: 'draft',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overpaid', 'refunded'],
      default: 'unpaid',
    },
    dueDate: {
      type: Date,
      required: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    paidDate: Date,
    notes: String,
    terms: String,
    paymentTerms: String,
    paymentInstructions: String,
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
      swiftCode: String,
      branch: String,
    },
    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentReceipt',
      },
    ],
    creditNotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CreditNote',
      },
    ],
    pdfUrl: String,
    sentAt: Date,
    viewedAt: Date,
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderSent: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: Date,
    cancellationReason: String,
    cancelledBy: {
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

// Virtual for checking if overdue
invoiceSchema.virtual('isOverdue').get(function () {
  return this.status !== 'paid' && this.status !== 'cancelled' && this.dueDate < new Date();
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function () {
  if (!this.isOverdue) return 0;
  const today = new Date();
  const diffTime = today - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Generate invoice number before saving
invoiceSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const prefix = this.type === 'proforma' ? 'PI' : 'INV';
    this.invoiceNumber = `${prefix}-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  
  // Calculate totals if items exist
  if (this.items && this.items.length > 0) {
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
  }
  
  // Calculate outstanding amount
  this.outstandingAmount = this.totalAmount - this.paidAmount;
  
  // Update payment status
  if (this.paidAmount === 0) {
    this.paymentStatus = 'unpaid';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
    if (!this.paidDate) this.paidDate = new Date();
  } else {
    this.paymentStatus = 'partial';
  }
  
  // Update status based on payment
  if (this.paymentStatus === 'paid' && this.status !== 'cancelled') {
    this.status = 'paid';
  } else if (this.paymentStatus === 'partial' && this.status === 'sent') {
    this.status = 'partial';
  }
  
  // Check if overdue
  if (this.status !== 'paid' && this.status !== 'cancelled' && this.dueDate < new Date()) {
    this.status = 'overdue';
  }
  
  next();
});

// Index for efficient queries
invoiceSchema.index({ lead: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ type: 1 });

export default mongoose.model('Invoice', invoiceSchema);
