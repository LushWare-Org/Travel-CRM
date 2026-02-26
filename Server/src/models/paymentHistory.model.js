import mongoose from 'mongoose';

const paymentHistorySchema = new mongoose.Schema(
  {
    paymentHistoryNumber: {
      type: String,
      required: false,
      unique: true,
      index: true,
    },
    receipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentReceipt',
      required: [true, 'Payment history must be linked to a receipt'],
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Payment history must be linked to a lead'],
      index: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Payment history must be linked to an invoice'],
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
    paymentDate: {
      type: Date,
      required: [true, 'Please provide payment date'],
      index: true,
    },
    transactionId: String,
    paymentType: {
      type: String,
      enum: ['advance', 'installment', 'full-payment', 'refund'],
      default: 'installment',
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'reconciled', 'cancelled'],
      default: 'pending',
    },
    notes: String,
    internalNotes: String,

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    reconciledAt: Date,
    cancelledAt: Date,
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

// Generate payment history number before saving
paymentHistorySchema.pre('save', async function (next) {
  if (this.isNew && !this.paymentHistoryNumber) {
    const count = await mongoose.model('PaymentHistory').countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    this.paymentHistoryNumber = `PH-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Indexes for better query performance
paymentHistorySchema.index({ lead: 1, paymentDate: -1 });
paymentHistorySchema.index({ invoice: 1, paymentDate: -1 });
paymentHistorySchema.index({ receipt: 1 });
paymentHistorySchema.index({ paymentDate: -1 });
paymentHistorySchema.index({ status: 1 });

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);

export default PaymentHistory;
