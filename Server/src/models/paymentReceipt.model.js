import mongoose from 'mongoose';

const paymentReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Payment receipt must be linked to a lead'],
      index: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Payment receipt must be linked to an invoice'],
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
    amount: {
      type: Number,
      required: [true, 'Please provide payment amount'],
      min: [0.01, 'Payment amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'LKR',
      enum: ['LKR', 'USD', 'EUR', 'GBP', 'AUD', 'INR'],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'card', 'bank-transfer', 'online', 'cheque', 'upi', 'wallet', 'other'],
    },
    paymentDetails: {
      // For card payments
      cardType: {
        type: String,
        enum: ['visa', 'mastercard', 'amex', 'discover', 'other'],
      },
      cardLastFour: String,

      // For bank transfer
      bankName: String,
      accountNumber: String,
      transactionReference: String,

      // For cheque
      chequeNumber: String,
      chequeDate: Date,
      chequeBank: String,

      // For online payment
      paymentGateway: {
        type: String,
        enum: ['stripe', 'razorpay', 'paypal', 'square', 'other'],
      },
      gatewayTransactionId: String,
      gatewayPaymentId: String,

      // For UPI
      upiId: String,
      upiTransactionId: String,
    },
    transactionId: {
      type: String,
      index: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    receiptStatus: {
      type: String,
      enum: ['paid-in-advance', 'paid-in-full', 'partial-payment', 'refunded', 'cancelled'],
      required: true,
      default: 'partial-payment',
    },
    paymentType: {
      type: String,
      enum: ['advance', 'installment', 'full-payment', 'final-payment', 'refund'],
      required: true,
    },
    notes: String,
    internalNotes: String,

    // References
    previousBalance: {
      type: Number,
      default: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },

    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,

    // Reconciliation
    reconciled: {
      type: Boolean,
      default: false,
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reconciledAt: Date,

    // PDF and Communication
    pdfUrl: String,
    sentAt: Date,
    emailSent: {
      type: Boolean,
      default: false,
    },

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

    // Cancellation
    cancelledAt: Date,
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // For refund receipts
    refundFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentReceipt',
    },
    refundReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Generate receipt number before saving
paymentReceiptSchema.pre('save', async function (next) {
  if (this.isNew && !this.receiptNumber) {
    const count = await mongoose.model('PaymentReceipt').countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    this.receiptNumber = `REC-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Automatically determine receipt status based on invoice
paymentReceiptSchema.pre('save', async function (next) {
  if (this.isNew && this.invoice) {
    try {
      const Invoice = mongoose.model('Invoice');
      const invoice = await Invoice.findById(this.invoice);

      if (invoice) {
        this.previousBalance = invoice.outstandingAmount;
        this.outstandingBalance = invoice.outstandingAmount - this.amount;

        // Determine receipt status
        const totalPaid = invoice.paidAmount + this.amount;

        if (totalPaid >= invoice.totalAmount) {
          this.receiptStatus = 'paid-in-full';
        } else if (this.paymentType === 'advance') {
          this.receiptStatus = 'paid-in-advance';
        } else {
          this.receiptStatus = 'partial-payment';
        }
      }
    } catch (error) {
      // Continue without failing
    }
  }
  next();
});

// Index for efficient queries
paymentReceiptSchema.index({ lead: 1, createdAt: -1 });
paymentReceiptSchema.index({ invoice: 1, paymentDate: -1 });
paymentReceiptSchema.index({ receiptStatus: 1 });
paymentReceiptSchema.index({ paymentDate: -1 });
paymentReceiptSchema.index({ createdAt: -1 });
paymentReceiptSchema.index({ paymentMethod: 1 });
paymentReceiptSchema.index({ verified: 1, reconciled: 1 });

export default mongoose.model('PaymentReceipt', paymentReceiptSchema);
