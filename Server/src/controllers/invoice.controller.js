import fs from 'fs';
import Invoice from '../models/invoice.model.js';
import BillingService from '../services/billing.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import emailService from '../utils/emailService.js';

const formatInvoiceForResponse = (invoiceDoc) => {
  if (!invoiceDoc) {
    return invoiceDoc;
  }

  const invoice =
    typeof invoiceDoc.toObject === 'function'
      ? invoiceDoc.toObject({ virtuals: true })
      : { ...invoiceDoc };

  invoice.issueDate = invoice.createdAt || invoice.issueDate;

  return invoice;
};

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
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const invoiceDocs = await features.query;
  const invoices = invoiceDocs.map((invoice) => formatInvoiceForResponse(invoice));
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
  const invoiceDoc = await Invoice.findById(req.params.id)
    .populate('lead', 'name email phone status destination')
    .populate('quotation', 'quotationNumber')
    .populate('booking')
    .populate('payments')
    .populate('creditNotes')
    .populate('createdBy', 'name email');

  if (!invoiceDoc) {
    return next(new AppError('Invoice not found', 404));
  }

  const invoice = formatInvoiceForResponse(invoiceDoc);

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
export const getInvoiceByLeadId = asyncHandler(async (req, res, next) => {
  const invoiceDocs = await Invoice.find({ lead: req.params.leadId })
    .populate('quotation', 'quotationNumber')
    .populate('createdBy', 'name email')
    .populate('payments')
    .sort({ createdAt: -1 });

  const invoices = invoiceDocs.map((invoice) => formatInvoiceForResponse(invoice));

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
export const createInvoice = asyncHandler(async (req, res, next) => {
  // Verify lead exists and auto-populate customer info
  const Lead = (await import('../models/lead.model.js')).default;
  if (req.body.lead) {
    const lead = await Lead.findById(req.body.lead);
    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }

    // Auto-populate customer info from lead if not provided
    if (!req.body.customer) {
      req.body.customer = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        address: lead.address,
      };
    }
  }

  req.body.createdBy = req.user.id;

  const invoiceDoc = await Invoice.create(req.body);
  const invoice = formatInvoiceForResponse(invoiceDoc);

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
  const invoiceDoc = await Invoice.findById(req.params.id);

  if (!invoiceDoc) {
    return next(new AppError('Invoice not found', 404));
  }

  // Allow updating paid invoices (forms are always-editable)
  // Only prevent updating cancelled invoices
  if (invoiceDoc.status === 'cancelled') {
    return next(new AppError('Cannot update cancelled invoice', 400));
  }

  // Preserve payment information if invoice was already paid
  const existingPaidAmount = invoiceDoc.paidAmount || 0;
  const existingPayments = invoiceDoc.payments || [];
  const existingPaymentStatus = invoiceDoc.paymentStatus;

  invoiceDoc.lastModifiedBy = req.user.id;

  // Update fields
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && key !== 'invoiceNumber' && key !== 'lead') {
      invoiceDoc[key] = req.body[key];
    }
  });

  // Recalculate outstanding amount based on new total, preserving existing payments
  invoiceDoc.outstandingAmount = invoiceDoc.totalAmount - existingPaidAmount;

  // Update payment status based on existing payments
  if (existingPaidAmount === 0) {
    invoiceDoc.paymentStatus = 'unpaid';
  } else if (existingPaidAmount >= invoiceDoc.totalAmount) {
    invoiceDoc.paymentStatus = 'paid';
    if (!invoiceDoc.paidDate) invoiceDoc.paidDate = new Date();
  } else {
    invoiceDoc.paymentStatus = 'partial';
  }

  // Update status based on payment
  if (invoiceDoc.paymentStatus === 'paid' && invoiceDoc.status !== 'cancelled') {
    invoiceDoc.status = 'paid';
  } else if (invoiceDoc.paymentStatus === 'partial' && invoiceDoc.status === 'sent') {
    invoiceDoc.status = 'partial';
  }

  // Preserve existing payments
  invoiceDoc.payments = existingPayments;

  await invoiceDoc.save();

  await invoiceDoc.populate('lead', 'name email phone');
  await invoiceDoc.populate('quotation', 'quotationNumber totalAmount');
  await invoiceDoc.populate('customer');

  const invoice = formatInvoiceForResponse(invoiceDoc);

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
  const invoiceDoc = await Invoice.findById(req.params.id);

  if (!invoiceDoc) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoiceDoc.status === 'paid') {
    return next(new AppError('Cannot cancel paid invoice. Create a credit note instead.', 400));
  }

  if (invoiceDoc.status === 'cancelled') {
    return next(new AppError('Invoice is already cancelled', 400));
  }

  invoiceDoc.status = 'cancelled';
  invoiceDoc.cancelledAt = new Date();
  invoiceDoc.cancellationReason = req.body.reason;
  invoiceDoc.cancelledBy = req.user.id;

  await invoiceDoc.save();

  const invoice = formatInvoiceForResponse(invoiceDoc);

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
  const invoiceDoc = await Invoice.findById(req.params.id)
    .populate('lead', 'name email phone')
    .populate('quotation');

  if (!invoiceDoc) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoiceDoc.status === 'cancelled') {
    return next(new AppError('Cannot send cancelled invoice', 400));
  }

  const invoice = formatInvoiceForResponse(invoiceDoc);

  const recipientEmail = (req.body?.email || invoice.customer?.email || invoice.lead?.email || '').trim();

  if (!recipientEmail) {
    return next(new AppError('No recipient email found for this invoice', 400));
  }

  try {
    const { generateInvoicePDF } = await import('../utils/billingPDFGenerator.js');
    const pdfPath = await generateInvoicePDF(invoiceDoc, invoiceDoc.lead);

    await emailService.sendInvoiceEmail({
      invoice,
      recipientEmail,
      pdfPath,
    });

    await fs.promises.unlink(pdfPath).catch(() => {});
  } catch (error) {
    return next(new AppError(`Error sending invoice email: ${error.message}`, 500));
  }

  invoiceDoc.status = 'sent';
  invoiceDoc.sentAt = new Date();
  await invoiceDoc.save();

  const updatedInvoice = formatInvoiceForResponse(invoiceDoc);

  res.status(200).json({
    success: true,
    message: 'Invoice sent successfully',
    data: updatedInvoice,
  });
});

/**
 * @desc    Mark invoice as viewed
 * @route   POST /api/v1/billing/invoices/:id/viewed
 * @access  Public
 */
export const markInvoiceViewed = asyncHandler(async (req, res, next) => {
  const invoiceDoc = await Invoice.findById(req.params.id);

  if (!invoiceDoc) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoiceDoc.status === 'sent') {
    invoiceDoc.status = 'viewed';
    invoiceDoc.viewedAt = new Date();
    await invoiceDoc.save();
  }

  const invoice = formatInvoiceForResponse(invoiceDoc);

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
  const invoiceDoc = await Invoice.findById(req.params.id);

  if (!invoiceDoc) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoiceDoc.status === 'paid') {
    return next(new AppError('Invoice is already paid', 400));
  }

  if (invoiceDoc.status === 'cancelled') {
    return next(new AppError('Cannot send reminder for cancelled invoice', 400));
  }

  invoiceDoc.remindersSent += 1;
  invoiceDoc.lastReminderSent = new Date();
  await invoiceDoc.save();

  const invoice = formatInvoiceForResponse(invoiceDoc);

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
export const getOverdueInvoices = asyncHandler(async (req, res, next) => {
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
export const getInvoiceStats = asyncHandler(async (req, res, next) => {
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

  try {
    const { generateInvoicePDF } = await import('../utils/billingPDFGenerator.js');
    const pdfPath = await generateInvoicePDF(invoice, invoice.lead);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber || invoice._id}.pdf"`);
    
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
