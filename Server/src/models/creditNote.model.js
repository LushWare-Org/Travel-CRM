import mongoose from 'mongoose';

const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Credit note must be linked to a lead'],
      index: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Credit note must be linked to an invoice'],
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
    },
    type: {
      type: String,
      enum: ['refund', 'cancellation', 'discount', 'error-correction', 'service-not-provided', 'quality-issue', 'other'],
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Please provide reason for credit note'],
    },
    items: [
      {
        description: {
          type: String,
          required: true,
        },
        originalAmount: {
          type: Number,
          required: true,
        },
        creditAmount: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
        notes: String,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
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
      enum: ['draft', 'issued', 'applied', 'refunded', 'cancelled'],
      default: 'draft',
      index: true,
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'not-applicable'],
      default: 'not-applicable',
    },
    refundMethod: {
      type: String,
      enum: ['original-method', 'bank-transfer', 'cheque', 'credit-balance', 'voucher', 'other'],
    },
    refundDetails: {
      transactionId: String,
      processedAt: Date,
      bankName: String,
      accountNumber: String,
      chequeNumber: String,
      notes: String,
    },
    appliedToInvoice: {
      type: Boolean,
      default: false,
    },
    appliedAt: Date,
    voucherGenerated: {
      type: Boolean,
      default: false,
    },
    voucherCode: String,
    voucherValue: Number,
    voucherExpiryDate: Date,
    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    notes: String,
    internalNotes: String,
    approvalRequired: {
      type: Boolean,
      default: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: Date,
    rejectionReason: String,
    pdfUrl: String,
    sentAt: Date,
    emailSent: {
      type: Boolean,
      default: false,
    },
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

// Virtual for approval status
creditNoteSchema.virtual('isApproved').get(function () {
  return !!this.approvedAt && !this.rejectedAt;
});

// Generate credit note number before saving
creditNoteSchema.pre('save', async function (next) {
  if (this.isNew && !this.creditNoteNumber) {
    const count = await mongoose.model('CreditNote').countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    this.creditNoteNumber = `CN-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }

  // Calculate totals if items exist
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.creditAmount, 0);
    this.totalAmount = this.subtotal + this.taxAmount;
  }

  next();
});

// Update invoice when credit note is applied
creditNoteSchema.post('save', async function () {
  if (this.appliedToInvoice && this.status === 'applied') {
    try {
      const Invoice = mongoose.model('Invoice');
      await Invoice.findByIdAndUpdate(this.invoice, {
        $inc: { paidAmount: this.totalAmount },
        $push: { creditNotes: this._id },
      });
    } catch (error) {
      console.error('Error updating invoice with credit note:', error);
    }
  }
});

// Index for efficient queries
creditNoteSchema.index({ lead: 1, createdAt: -1 });
creditNoteSchema.index({ invoice: 1, issueDate: -1 });
creditNoteSchema.index({ status: 1 });
creditNoteSchema.index({ refundStatus: 1 });
creditNoteSchema.index({ createdAt: -1 });
creditNoteSchema.index({ type: 1 });

export default mongoose.model('CreditNote', creditNoteSchema);
