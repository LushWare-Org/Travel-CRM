import CreditNote from '../models/creditNote.model.js';
import BillingService from '../services/billing.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { APIFeatures } from '../utils/apiFeatures.js';

/**
 * @desc    Get all credit notes
 * @route   GET /api/v1/billing/credit-notes
 * @access  Private
 */
export const getAllCreditNotes = asyncHandler(async (req, res) => {
  const features = new APIFeatures(
    CreditNote.find()
      .populate('lead', 'name email phone')
      .populate('invoice', 'invoiceNumber totalAmount')
      .populate('createdBy', 'name email'),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const creditNotes = await features.query;
  const total = await CreditNote.countDocuments();

  res.status(200).json({
    success: true,
    count: creditNotes.length,
    total,
    data: creditNotes,
  });
});

/**
 * @desc    Get credit note by ID
 * @route   GET /api/v1/billing/credit-notes/:id
 * @access  Private
 */
export const getCreditNoteById = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id)
    .populate('lead', 'name email phone status')
    .populate('invoice', 'invoiceNumber totalAmount paidAmount')
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email');

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  res.status(200).json({
    success: true,
    data: creditNote,
  });
});

/**
 * @desc    Get credit notes by lead ID
 * @route   GET /api/v1/billing/credit-notes/lead/:leadId
 * @access  Private
 */
export const getCreditNoteByLeadId = asyncHandler(async (req, res, next) => {
  const creditNotes = await CreditNote.find({ lead: req.params.leadId })
    .populate('invoice', 'invoiceNumber totalAmount')
    .populate('createdBy', 'name email')
    .sort({ issueDate: -1 });

  res.status(200).json({
    success: true,
    count: creditNotes.length,
    data: creditNotes,
  });
});

/**
 * @desc    Get credit notes by invoice ID
 * @route   GET /api/v1/billing/credit-notes/invoice/:invoiceId
 * @access  Private
 */
export const getCreditNoteByInvoiceId = asyncHandler(async (req, res, next) => {
  const creditNotes = await CreditNote.find({ invoice: req.params.invoiceId })
    .populate('createdBy', 'name email')
    .sort({ issueDate: -1 });

  res.status(200).json({
    success: true,
    count: creditNotes.length,
    data: creditNotes,
  });
});

/**
 * @desc    Create credit note
 * @route   POST /api/v1/billing/credit-notes
 * @access  Private (Admin, Staff)
 */
export const createCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await BillingService.createCreditNote(
    req.body.invoice,
    req.body,
    req.user.id,
  );

  res.status(201).json({
    success: true,
    message: 'Credit note created successfully',
    data: creditNote,
  });
});

/**
 * @desc    Update credit note
 * @route   PUT /api/v1/billing/credit-notes/:id
 * @access  Private (Admin)
 */
export const updateCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  if (creditNote.status !== 'draft') {
    return next(new AppError('Can only update draft credit notes', 400));
  }

  creditNote.lastModifiedBy = req.user.id;

  // Update fields
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && key !== 'creditNoteNumber' && key !== 'lead' && key !== 'invoice') {
      creditNote[key] = req.body[key];
    }
  });

  await creditNote.save();

  res.status(200).json({
    success: true,
    message: 'Credit note updated successfully',
    data: creditNote,
  });
});

/**
 * @desc    Issue credit note
 * @route   PUT /api/v1/billing/credit-notes/:id/issue
 * @access  Private (Admin)
 */
export const issueCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  if (creditNote.status !== 'draft') {
    return next(new AppError('Credit note has already been issued', 400));
  }

  if (creditNote.approvalRequired && !creditNote.isApproved) {
    return next(new AppError('Credit note must be approved before issuing', 400));
  }

  creditNote.status = 'issued';
  creditNote.issueDate = new Date();
  await creditNote.save();

  res.status(200).json({
    success: true,
    message: 'Credit note issued successfully',
    data: creditNote,
  });
});

/**
 * @desc    Approve credit note
 * @route   PUT /api/v1/billing/credit-notes/:id/approve
 * @access  Private (Admin, Manager)
 */
export const approveCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  if (creditNote.status !== 'draft') {
    return next(new AppError('Can only approve draft credit notes', 400));
  }

  if (creditNote.isApproved) {
    return next(new AppError('Credit note is already approved', 400));
  }

  creditNote.approvedBy = req.user.id;
  creditNote.approvedAt = new Date();
  await creditNote.save();

  res.status(200).json({
    success: true,
    message: 'Credit note approved successfully',
    data: creditNote,
  });
});

/**
 * @desc    Reject credit note
 * @route   PUT /api/v1/billing/credit-notes/:id/reject
 * @access  Private (Admin, Manager)
 */
export const rejectCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  if (creditNote.status !== 'draft') {
    return next(new AppError('Can only reject draft credit notes', 400));
  }

  creditNote.rejectedBy = req.user.id;
  creditNote.rejectedAt = new Date();
  creditNote.rejectionReason = req.body.reason;
  await creditNote.save();

  res.status(200).json({
    success: true,
    message: 'Credit note rejected',
    data: creditNote,
  });
});

/**
 * @desc    Apply credit note to invoice
 * @route   PUT /api/v1/billing/credit-notes/:id/apply
 * @access  Private (Admin, Staff)
 */
export const applyCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await BillingService.applyCreditNote(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Credit note applied to invoice successfully',
    data: creditNote,
  });
});

/**
 * @desc    Process refund for credit note
 * @route   PUT /api/v1/billing/credit-notes/:id/refund
 * @access  Private (Admin)
 */
export const processCreditNoteRefund = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  if (creditNote.status !== 'issued' && creditNote.status !== 'applied') {
    return next(new AppError('Credit note must be issued or applied to process refund', 400));
  }

  if (creditNote.refundStatus === 'completed') {
    return next(new AppError('Refund has already been processed', 400));
  }

  creditNote.refundStatus = 'processing';
  creditNote.refundMethod = req.body.refundMethod;
  creditNote.refundDetails = {
    transactionId: req.body.transactionId,
    processedAt: new Date(),
    bankName: req.body.bankName,
    accountNumber: req.body.accountNumber,
    chequeNumber: req.body.chequeNumber,
    notes: req.body.notes,
  };

  await creditNote.save();

  // TODO: Process actual refund through payment gateway
  // await paymentService.processRefund(creditNote);

  creditNote.refundStatus = 'completed';
  creditNote.status = 'refunded';
  await creditNote.save();

  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: creditNote,
  });
});

/**
 * @desc    Generate voucher from credit note
 * @route   POST /api/v1/billing/credit-notes/:id/voucher
 * @access  Private (Admin, Staff)
 */
export const generateVoucherFromCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  if (creditNote.status !== 'issued') {
    return next(new AppError('Credit note must be issued to generate voucher', 400));
  }

  if (creditNote.voucherGenerated) {
    return next(new AppError('Voucher has already been generated', 400));
  }

  // Generate unique voucher code
  const voucherCode = `CN${creditNote.creditNoteNumber.replace(/[^0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;

  creditNote.voucherGenerated = true;
  creditNote.voucherCode = voucherCode;
  creditNote.voucherValue = creditNote.totalAmount;
  // 1 year default
  creditNote.voucherExpiryDate = req.body.expiryDate
    || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await creditNote.save();

  res.status(200).json({
    success: true,
    message: 'Voucher generated successfully',
    data: creditNote,
  });
});

/**
 * @desc    Cancel credit note
 * @route   PUT /api/v1/billing/credit-notes/:id/cancel
 * @access  Private (Admin)
 */
export const cancelCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  if (creditNote.status === 'cancelled') {
    return next(new AppError('Credit note is already cancelled', 400));
  }

  if (creditNote.status === 'applied' || creditNote.status === 'refunded') {
    return next(new AppError('Cannot cancel applied or refunded credit note', 400));
  }

  creditNote.status = 'cancelled';
  creditNote.cancelledAt = new Date();
  creditNote.cancellationReason = req.body.reason;
  creditNote.cancelledBy = req.user.id;

  await creditNote.save();

  res.status(200).json({
    success: true,
    message: 'Credit note cancelled successfully',
    data: creditNote,
  });
});

/**
 * @desc    Send credit note to customer
 * @route   POST /api/v1/billing/credit-notes/:id/send
 * @access  Private (Admin, Staff)
 */
export const sendCreditNote = asyncHandler(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);

  if (!creditNote) {
    return next(new AppError('Credit note not found', 404));
  }

  if (creditNote.status !== 'issued') {
    return next(new AppError('Can only send issued credit notes', 400));
  }

  creditNote.sentAt = new Date();
  creditNote.emailSent = true;
  await creditNote.save();

  // TODO: Send email with credit note
  // await emailService.sendCreditNote(creditNote);

  res.status(200).json({
    success: true,
    message: 'Credit note sent successfully',
    data: creditNote,
  });
});

/**
 * @desc    Get credit note statistics
 * @route   GET /api/v1/billing/credit-notes/stats
 * @access  Private (Admin, Staff)
 */
export const getCreditNoteStats = asyncHandler(async (req, res, next) => {
  const stats = await CreditNote.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
      },
    },
  ]);

  const typeStats = await CreditNote.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
      },
    },
  ]);

  const total = await CreditNote.countDocuments();
  const totalAmount = await CreditNote.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
      },
    },
  ]);

  const pendingApproval = await CreditNote.countDocuments({
    status: 'draft',
    approvalRequired: true,
    approvedAt: null,
    rejectedAt: null,
  });

  res.status(200).json({
    success: true,
    data: {
      total,
      totalAmount: totalAmount[0]?.total || 0,
      pendingApproval,
      byStatus: stats,
      byType: typeStats,
    },
  });
});
