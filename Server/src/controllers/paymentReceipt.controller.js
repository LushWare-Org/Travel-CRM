import fs from 'fs';
import PaymentReceipt from '../models/paymentReceipt.model.js';
import Lead from '../models/lead.model.js';
import BillingService from '../services/billing.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import emailService from '../utils/emailService.js';
import aiEventBusService from '../services/ai/aiEventBus.service.js';
import { APIFeatures } from '../utils/apiFeatures.js';

/**
 * @desc    Get all payment receipts
 * @route   GET /api/v1/billing/receipts
 * @access  Private
 */
export const getAllPaymentReceipts = asyncHandler(async (req, res) => {
  // Build base query - filter by lead assignedTo for sales reps
  let baseQuery = PaymentReceipt.find();
  
  // If user is a sales rep, only show receipts for leads assigned to them
  if (req.user.role === 'salesRep') {
    const assignedLeadIds = await Lead.find({ assignedTo: req.user._id }).select('_id').lean();
    const leadIds = assignedLeadIds.map((lead) => lead._id);
    baseQuery = baseQuery.where('lead').in(leadIds);
  }
  // Admin can see all receipts (no filter)

  const features = new APIFeatures(
    baseQuery
      .populate('lead', 'name email phone')
      .populate('invoice', 'invoiceNumber totalAmount')
      .populate('createdBy', 'name email'),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Apply date range filter after APIFeatures processes the query
  if (req.query.startDate || req.query.endDate) {
    const dateFilter = {};
    if (req.query.startDate) {
      dateFilter.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      features.query = features.query.and({ paymentDate: dateFilter });
    }
  }

  const receipts = await features.query;
  
  // Get total count with same filter
  let countQuery = PaymentReceipt.find();
  if (req.user.role === 'salesRep') {
    const assignedLeadIds = await Lead.find({ assignedTo: req.user._id }).select('_id').lean();
    const leadIds = assignedLeadIds.map((lead) => lead._id);
    countQuery = countQuery.where('lead').in(leadIds);
  }
  
  // Apply date range filter to count query
  if (req.query.startDate || req.query.endDate) {
    const dateFilter = {};
    if (req.query.startDate) {
      dateFilter.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      countQuery = countQuery.find({ paymentDate: dateFilter });
    }
  }
  
  const total = await countQuery.countDocuments();

  res.status(200).json({
    success: true,
    count: receipts.length,
    total,
    data: receipts,
  });
});

/**
 * @desc    Get payment receipt by ID
 * @route   GET /api/v1/billing/receipts/:id
 * @access  Private
 */
export const getPaymentReceiptById = asyncHandler(async (req, res, next) => {
  const receipt = await PaymentReceipt.findById(req.params.id)
    .populate('lead', 'name email phone status assignedTo')
    .populate('invoice', 'invoiceNumber totalAmount paidAmount outstandingAmount')
    .populate('createdBy', 'name email')
    .populate('verifiedBy', 'name email')
    .populate('reconciledBy', 'name email');

  if (!receipt) {
    return next(new AppError('Payment receipt not found', 404));
  }

  // Check permissions - sales rep can only access receipts for leads assigned to them
  if (req.user.role === 'salesRep' && receipt.lead?.assignedTo?.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this receipt', 403));
  }

  res.status(200).json({
    success: true,
    data: receipt,
  });
});

/**
 * @desc    Get payment receipts by lead ID
 * @route   GET /api/v1/billing/receipts/lead/:leadId
 * @access  Private
 */
export const getPaymentReceiptsByLeadId = asyncHandler(async (req, res, next) => {
  // Check permissions - sales rep can only access receipts for leads assigned to them
  if (req.user.role === 'salesRep') {
    const lead = await Lead.findById(req.params.leadId).select('assignedTo');
    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }
    if (lead.assignedTo?.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access receipts for this lead', 403));
    }
  }

  const receipts = await PaymentReceipt.find({ lead: req.params.leadId })
    .populate('invoice', 'invoiceNumber totalAmount')
    .populate('createdBy', 'name email')
    .sort({ paymentDate: -1 });

  res.status(200).json({
    success: true,
    count: receipts.length,
    data: receipts,
  });
});

/**
 * @desc    Get payment receipts by invoice ID
 * @route   GET /api/v1/billing/receipts/invoice/:invoiceId
 * @access  Private
 */
export const getPaymentReceiptsByInvoiceId = asyncHandler(async (req, res) => {
  const receipts = await PaymentReceipt.find({ invoice: req.params.invoiceId })
    .populate('createdBy', 'name email')
    .sort({ paymentDate: -1 });

  res.status(200).json({
    success: true,
    count: receipts.length,
    data: receipts,
  });
});

/**
 * @desc    Create payment receipt (Record payment)
 * @route   POST /api/v1/billing/receipts
 * @access  Private (Admin, Staff)
 */
export const createPaymentReceipt = asyncHandler(async (req, res) => {
  const receipt = await BillingService.recordPayment(
    req.body.invoice,
    req.body,
    req.user.id,
  );

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: receipt,
  });

  aiEventBusService.publish({
    type: 'receipt.created',
    source: 'payment-receipt.controller',
    payload: {
      leadId: String(receipt.lead),
      receiptId: String(receipt._id),
      invoiceId: String(receipt.invoice),
    },
  }).catch(() => null);
});

/**
 * @desc    Update payment receipt
 * @route   PUT /api/v1/billing/receipts/:id
 * @access  Private (Admin)
 */
export const updatePaymentReceipt = asyncHandler(async (req, res, next) => {
  const receipt = await PaymentReceipt.findById(req.params.id);

  if (!receipt) {
    return next(new AppError('Payment receipt not found', 404));
  }

  if (receipt.verified) {
    return next(new AppError('Cannot update verified payment receipt', 400));
  }

  if (receipt.receiptStatus === 'cancelled') {
    return next(new AppError('Cannot update cancelled payment receipt', 400));
  }

  // Prevent updating critical fields that affect payment tracking
  const restrictedFields = ['amount', 'invoice', 'lead', 'customer', 'paymentDate', 'paymentMethod', 'paymentType', 'currency', 'transactionId'];
  const hasRestrictedFields = restrictedFields.some(field => req.body[field] !== undefined);
  if (hasRestrictedFields) {
    return next(new AppError('Cannot update payment amount, invoice, or other critical fields. Create a new receipt for additional payments.', 400));
  }

  receipt.lastModifiedBy = req.user.id;

  // Update allowed fields (only non-critical fields)
  const allowedUpdates = ['notes', 'internalNotes', 'paymentDetails'];
  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
      receipt[key] = req.body[key];
    }
  });

  await receipt.save();

  res.status(200).json({
    success: true,
    message: 'Payment receipt updated successfully',
    data: receipt,
  });
});

/**
 * @desc    Cancel payment receipt
 * @route   PUT /api/v1/billing/receipts/:id/cancel
 * @access  Private (Admin)
 */
export const cancelPaymentReceipt = asyncHandler(async (req, res, next) => {
  const receipt = await PaymentReceipt.findById(req.params.id);

  if (!receipt) {
    return next(new AppError('Payment receipt not found', 404));
  }

  if (receipt.receiptStatus === 'cancelled') {
    return next(new AppError('Payment receipt is already cancelled', 400));
  }

  if (receipt.reconciled) {
    return next(new AppError('Cannot cancel reconciled payment receipt', 400));
  }

  receipt.receiptStatus = 'cancelled';
  receipt.cancelledAt = new Date();
  receipt.cancellationReason = req.body.reason;
  receipt.cancelledBy = req.user.id;

  await receipt.save();

  // Update invoice to deduct payment
  const Invoice = (await import('../models/invoice.model.js')).default;
  await Invoice.findByIdAndUpdate(receipt.invoice, {
    $inc: { paidAmount: -receipt.amount },
    $pull: { payments: receipt._id },
  });

  res.status(200).json({
    success: true,
    message: 'Payment receipt cancelled successfully',
    data: receipt,
  });
});

/**
 * @desc    Verify payment receipt
 * @route   PUT /api/v1/billing/receipts/:id/verify
 * @access  Private (Admin, Manager)
 */
export const verifyPaymentReceipt = asyncHandler(async (req, res) => {
  const receipt = await BillingService.verifyPaymentReceipt(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Payment receipt verified successfully',
    data: receipt,
  });
});

/**
 * @desc    Reconcile payment receipt
 * @route   PUT /api/v1/billing/receipts/:id/reconcile
 * @access  Private (Admin, Accountant)
 */
export const reconcilePaymentReceipt = asyncHandler(async (req, res) => {
  const receipt = await BillingService.reconcilePaymentReceipt(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Payment receipt reconciled successfully',
    data: receipt,
  });
});

/**
 * @desc    Send payment receipt to customer
 * @route   POST /api/v1/billing/receipts/:id/send
 * @access  Private (Admin, Staff)
 */
export const sendPaymentReceipt = asyncHandler(async (req, res, next) => {
  const receiptDoc = await PaymentReceipt.findById(req.params.id)
    .populate('lead', 'name email phone')
    .populate({ path: 'invoice', populate: { path: 'lead', select: 'name email phone' } });

  if (!receiptDoc) {
    return next(new AppError('Payment receipt not found', 404));
  }

  if (receiptDoc.receiptStatus === 'cancelled') {
    return next(new AppError('Cannot send cancelled payment receipt', 400));
  }

  const receipt = receiptDoc.toObject({ virtuals: true });
  const invoice = receiptDoc.invoice ? receiptDoc.invoice.toObject({ virtuals: true }) : null;

  const recipientEmail = (req.body?.email || receipt.customer?.email || receipt.lead?.email || invoice?.customer?.email || '').trim();

  if (!recipientEmail) {
    return next(new AppError('No recipient email found for this receipt', 400));
  }

  try {
    const { generateReceiptPDF } = await import('../utils/billingPDFGenerator.js');
    const pdfPath = await generateReceiptPDF(receiptDoc, receiptDoc.invoice, receiptDoc.lead);

    await emailService.sendReceiptEmail({
      receipt,
      invoice,
      recipientEmail,
      pdfPath,
    });

    await fs.promises.unlink(pdfPath).catch(() => {});
  } catch (error) {
    return next(new AppError(`Error sending payment receipt email: ${error.message}`, 500));
  }

  receiptDoc.sentAt = new Date();
  receiptDoc.emailSent = true;
  await receiptDoc.save();

  const updatedReceipt = receiptDoc.toObject({ virtuals: true });

  res.status(200).json({
    success: true,
    message: 'Payment receipt sent successfully',
    data: updatedReceipt,
  });
});

/**
 * @desc    Get payment receipt statistics
 * @route   GET /api/v1/billing/receipts/stats
 * @access  Private (Admin, Staff)
 */
export const getPaymentReceiptStats = asyncHandler(async (req, res) => {
  const stats = await PaymentReceipt.aggregate([
    {
      $match: { receiptStatus: { $ne: 'cancelled' } },
    },
    {
      $group: {
        _id: '$receiptStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  const methodStats = await PaymentReceipt.aggregate([
    {
      $match: { receiptStatus: { $ne: 'cancelled' } },
    },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  const total = await PaymentReceipt.countDocuments({ receiptStatus: { $ne: 'cancelled' } });
  const totalAmount = await PaymentReceipt.aggregate([
    {
      $match: { receiptStatus: { $ne: 'cancelled' } },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  const unverified = await PaymentReceipt.countDocuments({ verified: false, receiptStatus: { $ne: 'cancelled' } });
  const unreconciled = await PaymentReceipt.countDocuments({ reconciled: false, receiptStatus: { $ne: 'cancelled' } });

  res.status(200).json({
    success: true,
    data: {
      total,
      totalAmount: totalAmount[0]?.total || 0,
      unverified,
      unreconciled,
      byStatus: stats,
      byPaymentMethod: methodStats,
    },
  });
});

/**
 * @desc    Download payment receipt PDF
 * @route   GET /api/v1/billing/receipts/:id/pdf
 * @access  Private
 */
export const downloadPaymentReceiptPDF = asyncHandler(async (req, res, next) => {
  const receipt = await PaymentReceipt.findById(req.params.id)
    .populate('lead')
    .populate('invoice')
    .populate('createdBy');

  if (!receipt) {
    return next(new AppError('Payment receipt not found', 404));
  }

  try {
    const { generateReceiptPDF } = await import('../utils/billingPDFGenerator.js');
    const invoice = receipt.invoice || null;
    const pdfPath = await generateReceiptPDF(receipt, invoice, receipt.lead);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${receipt.receiptNumber || receipt._id}.pdf"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      // Optionally delete the file after sending (or keep it for caching)
      // fs.unlinkSync(pdfPath);
    });

    fileStream.on('error', (error) => {
      return next(new AppError('Error reading PDF file', 500));
    });
  } catch (error) {
    return next(new AppError(`Error generating PDF: ${error.message}`, 500));
  }
});
