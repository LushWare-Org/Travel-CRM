import Quotation from '../models/quotation.model.js';
import Invoice from '../models/invoice.model.js';
import PaymentReceipt from '../models/paymentReceipt.model.js';
import CreditNote from '../models/creditNote.model.js';
import Lead from '../models/lead.model.js';
import AppError from '../utils/appError.js';

/**
 * Billing Service
 * Handles business logic for billing operations
 */

class BillingService {
  /**
   * Create a new quotation
   */
  static async createQuotation(data, userId) {
    // Verify lead exists
    const lead = await Lead.findById(data.lead);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Auto-populate customer info from lead
    if (!data.customer) {
      data.customer = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
      };
    }

    if (!Array.isArray(data.items)) {
      data.items = [];
    }

    data.mode = data.mode === 'detailed' ? 'detailed' : 'summary';

    // Set default valid until (30 days from now)
    if (!data.validUntil) {
      data.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    data.createdBy = userId;
    if (!data.issueDate) {
      data.issueDate = new Date();
    }

    const quotation = await Quotation.create(data);

    // Update lead status
    await Lead.findByIdAndUpdate(data.lead, {
      status: 'quoted',
      quoteSent: true,
      quoteAmount: quotation.totalAmount,
    });

    return quotation;
  }

  /**
   * Convert quotation to invoice
   */
  static async convertQuotationToInvoice(quotationId, userId, additionalData = {}) {
    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    if (quotation.status === 'converted') {
      throw new AppError('Quotation has already been converted to invoice', 400);
    }

    if (quotation.status === 'expired') {
      throw new AppError('Cannot convert expired quotation', 400);
    }

    if (quotation.status === 'rejected') {
      throw new AppError('Cannot convert rejected quotation', 400);
    }

    // Create invoice from quotation
    const invoiceData = {
      lead: quotation.lead,
      quotation: quotation._id,
      customer: quotation.customer,
      type: additionalData.type || 'invoice',
      items: quotation.items,
      subtotal: quotation.subtotal,
      taxRate: quotation.taxRate,
      taxAmount: quotation.taxAmount,
      discountType: quotation.discountType,
      discountValue: quotation.discountValue,
      discountAmount: quotation.discountAmount,
      totalAmount: quotation.totalAmount,
      notes: quotation.notes,
      terms: quotation.terms,
      paymentTerms: quotation.paymentTerms,
      issueDate: additionalData.issueDate || new Date(),
      dueDate: additionalData.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      createdBy: userId,
      ...additionalData,
    };

    const invoice = await Invoice.create(invoiceData);

    // Update quotation
    quotation.status = 'converted';
    quotation.convertedToInvoice = invoice._id;
    await quotation.save();

    // Update lead
    await Lead.findByIdAndUpdate(quotation.lead, {
      status: 'converted',
    });

    return invoice;
  }

  /**
   * Record a payment
   */
  static async recordPayment(invoiceId, paymentData, userId) {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'cancelled') {
      throw new AppError('Cannot record payment for cancelled invoice', 400);
    }

    // Calculate cumulative payments from all existing receipts for this invoice
    const PaymentReceipt = (await import('../models/paymentReceipt.model.js')).default;
    const existingReceipts = await PaymentReceipt.find({
      invoice: invoice._id,
      receiptStatus: { $ne: 'cancelled' }, // Exclude cancelled receipts
    }).select('amount').lean();

    const totalPaidAmount = existingReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
    const currentOutstandingAmount = invoice.totalAmount - totalPaidAmount;

    // Check if invoice is already fully paid
    if (currentOutstandingAmount <= 0) {
      throw new AppError('Invoice is already fully paid and settled. Cannot create more receipts.', 400);
    }

    // Validate payment amount
    if (paymentData.amount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }

    if (paymentData.amount > currentOutstandingAmount) {
      throw new AppError(`Payment amount exceeds outstanding balance of ${currentOutstandingAmount.toFixed(2)}`, 400);
    }

    // Calculate new outstanding amount after this payment
    const newPaidAmount = totalPaidAmount + paymentData.amount;
    const newOutstandingAmount = invoice.totalAmount - newPaidAmount;

    // Create payment receipt with previous and outstanding balance
    const receiptData = {
      lead: invoice.lead,
      invoice: invoice._id,
      customer: invoice.customer,
      amount: paymentData.amount,
      currency: paymentData.currency || 'LKR',
      paymentMethod: paymentData.paymentMethod,
      paymentDetails: paymentData.paymentDetails || {},
      transactionId: paymentData.transactionId,
      paymentDate: paymentData.paymentDate || new Date(),
      paymentType: paymentData.paymentType || 'installment',
      notes: paymentData.notes,
      internalNotes: paymentData.internalNotes,
      previousBalance: currentOutstandingAmount, // Outstanding before this payment
      outstandingBalance: newOutstandingAmount, // Outstanding after this payment
      createdBy: userId,
    };

    const receipt = await PaymentReceipt.create(receiptData);

    // Create payment history entry
    const PaymentHistory = (await import('../models/paymentHistory.model.js')).default;
    const paymentHistoryData = {
      receipt: receipt._id,
      lead: invoice.lead,
      invoice: invoice._id,
      customer: invoice.customer,
      amount: paymentData.amount,
      currency: paymentData.currency || 'LKR',
      paymentMethod: paymentData.paymentMethod,
      paymentDate: paymentData.paymentDate || new Date(),
      paymentType: paymentData.paymentType || 'installment',
      transactionId: paymentData.transactionId,
      notes: paymentData.notes,
      internalNotes: paymentData.internalNotes,
      status: 'pending',
      createdBy: userId,
    };
    await PaymentHistory.create(paymentHistoryData);

    // Update invoice with cumulative payments
    // The pre-save hook will automatically calculate outstandingAmount and update paymentStatus/status
    invoice.paidAmount = newPaidAmount;
    invoice.payments.push(receipt._id);
    await invoice.save();

    return receipt;
  }

  /**
   * Create a credit note
   */
  static async createCreditNote(invoiceId, creditNoteData, userId) {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'cancelled') {
      throw new AppError('Cannot create credit note for cancelled invoice', 400);
    }

    // Validate credit amount
    if (creditNoteData.totalAmount > invoice.totalAmount) {
      throw new AppError('Credit amount cannot exceed invoice total', 400);
    }

    const creditNote = await CreditNote.create({
      lead: invoice.lead,
      invoice: invoice._id,
      customer: invoice.customer,
      ...creditNoteData,
      createdBy: userId,
    });

    return creditNote;
  }

  /**
   * Apply credit note to invoice
   */
  static async applyCreditNote(creditNoteId, userId) {
    const creditNote = await CreditNote.findById(creditNoteId);

    if (!creditNote) {
      throw new AppError('Credit note not found', 404);
    }

    if (creditNote.status !== 'issued') {
      throw new AppError('Credit note must be in issued status to apply', 400);
    }

    if (!creditNote.isApproved) {
      throw new AppError('Credit note must be approved before applying', 400);
    }

    creditNote.status = 'applied';
    creditNote.appliedToInvoice = true;
    creditNote.appliedAt = new Date();
    creditNote.lastModifiedBy = userId;

    await creditNote.save();

    return creditNote;
  }

  /**
   * Get billing summary for a lead
   */
  static async getLeadBillingSummary(leadId) {
    const [quotations, invoices, receipts, creditNotes] = await Promise.all([
      Quotation.find({ lead: leadId }).sort({ createdAt: -1 }),
      Invoice.find({ lead: leadId }).sort({ createdAt: -1 }),
      PaymentReceipt.find({ lead: leadId }).sort({ paymentDate: -1 }),
      CreditNote.find({ lead: leadId }).sort({ issueDate: -1 }),
    ]);

    // Calculate totals
    const totalQuoted = quotations
      .filter((q) => ['sent', 'viewed', 'accepted'].includes(q.status))
      .reduce((sum, q) => sum + q.totalAmount, 0);

    const totalInvoiced = invoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const totalPaid = receipts
      .filter((r) => r.receiptStatus !== 'cancelled')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalCredited = creditNotes
      .filter((cn) => cn.status === 'applied')
      .reduce((sum, cn) => sum + cn.totalAmount, 0);

    const totalOutstanding = invoices
      .filter((i) => i.status !== 'cancelled' && i.status !== 'paid')
      .reduce((sum, i) => sum + i.outstandingAmount, 0);

    return {
      quotations: {
        count: quotations.length,
        total: totalQuoted,
        data: quotations,
      },
      invoices: {
        count: invoices.length,
        total: totalInvoiced,
        outstanding: totalOutstanding,
        data: invoices,
      },
      payments: {
        count: receipts.length,
        total: totalPaid,
        data: receipts,
      },
      creditNotes: {
        count: creditNotes.length,
        total: totalCredited,
        data: creditNotes,
      },
      summary: {
        totalQuoted,
        totalInvoiced,
        totalPaid,
        totalCredited,
        totalOutstanding,
        netBalance: totalInvoiced - totalPaid - totalCredited,
      },
    };
  }

  /**
   * Get overdue invoices
   */
  static async getOverdueInvoices(filters = {}) {
    const query = {
      status: { $in: ['sent', 'partial', 'overdue'] },
      dueDate: { $lt: new Date() },
      paymentStatus: { $ne: 'paid' },
      ...filters,
    };

    const invoices = await Invoice.find(query)
      .populate('lead', 'name email phone')
      .sort({ dueDate: 1 });

    return invoices;
  }

  /**
   * Get financial reports
   */
  static async getFinancialReports(startDate, endDate, filters = {}) {
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const [invoices, receipts, creditNotes] = await Promise.all([
      Invoice.find({ ...dateFilter, ...filters }),
      PaymentReceipt.find({
        paymentDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        ...filters,
      }),
      CreditNote.find({ ...dateFilter, ...filters }),
    ]);

    // Calculate metrics
    const totalRevenue = invoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const totalCollected = receipts
      .filter((r) => r.receiptStatus !== 'cancelled')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalRefunded = creditNotes
      .filter((cn) => cn.refundStatus === 'completed')
      .reduce((sum, cn) => sum + cn.totalAmount, 0);

    const outstandingAmount = invoices
      .filter((i) => i.status !== 'cancelled' && i.status !== 'paid')
      .reduce((sum, i) => sum + i.outstandingAmount, 0);

    // Payment method breakdown
    const paymentMethodBreakdown = receipts.reduce((acc, receipt) => {
      const method = receipt.paymentMethod;
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count += 1;
      acc[method].total += receipt.amount;
      return acc;
    }, {});

    // Invoice status breakdown
    const invoiceStatusBreakdown = invoices.reduce((acc, invoice) => {
      const { status } = invoice;
      if (!acc[status]) {
        acc[status] = { count: 0, total: 0 };
      }
      acc[status].count += 1;
      acc[status].total += invoice.totalAmount;
      return acc;
    }, {});

    return {
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalRevenue,
        totalCollected,
        totalRefunded,
        outstandingAmount,
        collectionRate: totalRevenue > 0 ? ((totalCollected / totalRevenue) * 100).toFixed(2) : 0,
      },
      invoices: {
        count: invoices.length,
        statusBreakdown: invoiceStatusBreakdown,
      },
      payments: {
        count: receipts.length,
        methodBreakdown: paymentMethodBreakdown,
      },
      creditNotes: {
        count: creditNotes.length,
        total: totalRefunded,
      },
    };
  }

  /**
   * Verify payment receipt
   */
  static async verifyPaymentReceipt(receiptId, userId) {
    const receipt = await PaymentReceipt.findById(receiptId);

    if (!receipt) {
      throw new AppError('Payment receipt not found', 404);
    }

    if (receipt.verified) {
      throw new AppError('Payment receipt is already verified', 400);
    }

    receipt.verified = true;
    receipt.verifiedBy = userId;
    receipt.verifiedAt = new Date();

    await receipt.save();

    return receipt;
  }

  /**
   * Reconcile payment receipt
   */
  static async reconcilePaymentReceipt(receiptId, userId) {
    const receipt = await PaymentReceipt.findById(receiptId);

    if (!receipt) {
      throw new AppError('Payment receipt not found', 404);
    }

    if (!receipt.verified) {
      throw new AppError('Payment receipt must be verified before reconciliation', 400);
    }

    if (receipt.reconciled) {
      throw new AppError('Payment receipt is already reconciled', 400);
    }

    receipt.reconciled = true;
    receipt.reconciledBy = userId;
    receipt.reconciledAt = new Date();

    await receipt.save();

    return receipt;
  }
}

export default BillingService;
