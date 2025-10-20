import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    type: {
      type: String,
      enum: ['invoice', 'proforma'],
      default: 'invoice',
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
      default: 'draft',
    },
    dueDate: Date,
    paidDate: Date,
    notes: String,
    terms: String,
    payments: [
      {
        amount: Number,
        method: {
          type: String,
          enum: ['cash', 'card', 'online', 'bank-transfer', 'other'],
        },
        transactionId: String,
        date: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    refunds: [
      {
        amount: Number,
        reason: String,
        method: String,
        transactionId: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    pdfUrl: String,
    sentAt: Date,
  },
  {
    timestamps: true,
  },
);

// Generate invoice number
invoiceSchema.pre('save', async function generateInvoiceNumber(next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model('Invoice', invoiceSchema);
