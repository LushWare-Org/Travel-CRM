import Invoice from '../models/invoice.model.js';
import BillingService from '../services/billing.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { APIFeatures } from '../utils/apiFeatures.js';

/**
 * @desc    Get all invoices
 * @route   GET /api/v1/billing/invoices
 * @access  Private
 */
export const getAllInvoices = asyncHandler(async (req, res) => {
  const features = new APIFeatures(
    Invoice.find()
      .populate('lead', 'name email phone status')
      .populate('quotation', 'quotationNumber')
      .populate('createdBy', 'name email'),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const invoices = await features.query;
  const total = await Invoice.countDocuments();

  res.status(200).json({
    success: true,
    count: invoices.length,
    total,
    data: invoices,
  });
});

/**
 * @desc    Get invoice by ID
 * @route   GET /api/v1/billing/invoices/:id
 * @access  Private
 */
export const getInvoiceById = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('lead', 'name email phone status destination')
    .populate('quotation', 'quotationNumber')
    .populate('booking')
    .populate('payments')
    .populate('creditNotes')
    .populate('createdBy', 'name email');

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

/**
 * @desc    Get invoices by lead ID
 * @route   GET /api/v1/billing/invoices/lead/:leadId
 * @access  Private
 */
export const getInvoicesByLeadId = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ lead: req.params.leadId })
    .populate('quotation', 'quotationNumber')
    .populate('createdBy', 'name email')
    .populate('payments')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: invoices.length,
    data: invoices,
  });
});

/**
 * @desc    Create new invoice
 * @route   POST /api/v1/billing/invoices
 * @access  Private (Admin, Staff)
 */
export const createInvoice = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  
  const invoice = await Invoice.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: invoice,
  });
});

/**
 * @desc    Update invoice
 * @route   PUT /api/v1/billing/invoices/:id
 * @access  Private (Admin, Staff)
 */
export const updateInvoice = asyncHandler(async (req, res, next) => {
  let invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoice.status === 'paid') {
    return next(new AppError('Cannot update paid invoice', 400));
  }

  if (invoice.status === 'cancelled') {
    return next(new AppError('Cannot update cancelled invoice', 400));
  }

  invoice.lastModifiedBy = req.user.id;

  // Update fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined && key !== 'invoiceNumber' && key !== 'lead') {
      invoice[key] = req.body[key];
    }
  });

  await invoice.save();

  res.status(200).json({
    success: true,
    message: 'Invoice updated successfully',
    data: invoice,
  });
});

/**
 * @desc    Cancel invoice
 * @route   PUT /api/v1/billing/invoices/:id/cancel
 * @access  Private (Admin)
 */
export const cancelInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoice.status === 'paid') {
    return next(new AppError('Cannot cancel paid invoice. Create a credit note instead.', 400));
  }

  if (invoice.status === 'cancelled') {
    return next(new AppError('Invoice is already cancelled', 400));
  }

  invoice.status = 'cancelled';
  invoice.cancelledAt = new Date();
  invoice.cancellationReason = req.body.reason;
  invoice.cancelledBy = req.user.id;

  await invoice.save();

  res.status(200).json({
    success: true,
    message: 'Invoice cancelled successfully',
    data: invoice,
  });
});

/**
 * @desc    Send invoice to customer
 * @route   POST /api/v1/billing/invoices/:id/send
 * @access  Private (Admin, Staff)
 */
export const sendInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoice.status === 'cancelled') {
    return next(new AppError('Cannot send cancelled invoice', 400));
  }

  invoice.status = 'sent';
  invoice.sentAt = new Date();
  await invoice.save();

  // TODO: Send email with invoice
  // await emailService.sendInvoice(invoice);

  res.status(200).json({
    success: true,
    message: 'Invoice sent successfully',
    data: invoice,
  });
});

/**
 * @desc    Mark invoice as viewed
 * @route   POST /api/v1/billing/invoices/:id/viewed
 * @access  Public
 */
export const markInvoiceViewed = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoice.status === 'sent') {
    invoice.status = 'viewed';
    invoice.viewedAt = new Date();
    await invoice.save();
  }

  res.status(200).json({
    success: true,
    message: 'Invoice marked as viewed',
    data: invoice,
  });
});

/**
 * @desc    Send payment reminder
 * @route   POST /api/v1/billing/invoices/:id/remind
 * @access  Private (Admin, Staff)
 */
export const sendPaymentReminder = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoice.status === 'paid') {
    return next(new AppError('Invoice is already paid', 400));
  }

  if (invoice.status === 'cancelled') {
    return next(new AppError('Cannot send reminder for cancelled invoice', 400));
  }

  invoice.remindersSent += 1;
  invoice.lastReminderSent = new Date();
  await invoice.save();

  // TODO: Send reminder email
  // await emailService.sendPaymentReminder(invoice);

  res.status(200).json({
    success: true,
    message: 'Payment reminder sent successfully',
    data: invoice,
  });
});

/**
 * @desc    Get overdue invoices
 * @route   GET /api/v1/billing/invoices/overdue
 * @access  Private (Admin, Staff)
 */
export const getOverdueInvoices = asyncHandler(async (req, res) => {
  const invoices = await BillingService.getOverdueInvoices(req.query);

  res.status(200).json({
    success: true,
    count: invoices.length,
    data: invoices,
  });
});

/**
 * @desc    Get invoice statistics
 * @route   GET /api/v1/billing/invoices/stats
 * @access  Private (Admin, Staff)
 */
export const getInvoiceStats = asyncHandler(async (req, res) => {
  const stats = await Invoice.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' },
        outstandingAmount: { $sum: '$outstandingAmount' },
      },
    },
  ]);

  const paymentStats = await Invoice.aggregate([
    {
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
      },
    },
  ]);

  const total = await Invoice.countDocuments();
  const totalValue = await Invoice.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
        paid: { $sum: '$paidAmount' },
        outstanding: { $sum: '$outstandingAmount' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      totalValue: totalValue[0] || { total: 0, paid: 0, outstanding: 0 },
      byStatus: stats,
      byPaymentStatus: paymentStats,
    },
  });
});

/**
 * @desc    Download invoice PDF
 * @route   GET /api/v1/billing/invoices/:id/pdf
 * @access  Private
 */
export const downloadInvoicePDF = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('lead')
    .populate('quotation')
    .populate('createdBy');

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  // TODO: Generate PDF
  // const pdfBuffer = await pdfGenerator.generateInvoicePDF(invoice);
  
  res.status(200).json({
    success: true,
    message: 'PDF generation feature to be implemented',
    data: invoice,
  });
});
