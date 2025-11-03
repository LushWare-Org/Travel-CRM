import fs from 'fs';
import Quotation from '../models/quotation.model.js';
import BillingService from '../services/billing.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { APIFeatures } from '../utils/apiFeatures.js';

/**
 * @desc    Get all quotations
 * @route   GET /api/v1/billing/quotations
 * @access  Private
 */
export const getAllQuotations = asyncHandler(async (req, res) => {
  const features = new APIFeatures(
    Quotation.find().populate('lead', 'name email phone status').populate('createdBy', 'name email'),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const quotations = await features.query;
  const total = await Quotation.countDocuments();

  res.status(200).json({
    success: true,
    count: quotations.length,
    total,
    data: quotations,
  });
});

/**
 * @desc    Get quotation by ID
 * @route   GET /api/v1/billing/quotations/:id
 * @access  Private
 */
export const getQuotationById = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('lead', 'name email phone status destination')
    .populate('package', 'name description price')
    .populate('createdBy', 'name email')
    .populate('convertedToInvoice');

  if (!quotation) {
    return next(new AppError('Quotation not found', 404));
  }

  res.status(200).json({
    success: true,
    data: quotation,
  });
});

/**
 * @desc    Get quotations by lead ID
 * @route   GET /api/v1/billing/quotations/lead/:leadId
 * @access  Private
 */
export const getQuotationsByLeadId = asyncHandler(async (req, res) => {
  const quotations = await Quotation.find({ lead: req.params.leadId })
    .populate('createdBy', 'name email')
    .populate('convertedToInvoice')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: quotations.length,
    data: quotations,
  });
});

/**
 * @desc    Create new quotation
 * @route   POST /api/v1/billing/quotations
 * @access  Private (Admin, Staff)
 */
export const createQuotation = asyncHandler(async (req, res) => {
  const quotation = await BillingService.createQuotation(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Quotation created successfully',
    data: quotation,
  });
});

/**
 * @desc    Update quotation
 * @route   PUT /api/v1/billing/quotations/:id
 * @access  Private (Admin, Staff)
 */
export const updateQuotation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotation.status === 'converted') {
    return next(new AppError('Cannot update converted quotation', 400));
  }

  // Track revision history
  if (quotation.status !== 'draft') {
    quotation.revisionHistory.push({
      version: quotation.version,
      modifiedBy: req.user.id,
      changes: req.body.changes || 'Updated quotation',
    });
    quotation.version += 1;
  }

  quotation.lastModifiedBy = req.user.id;

  // Update fields
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && key !== 'quotationNumber' && key !== 'lead') {
      quotation[key] = req.body[key];
    }
  });

  await quotation.save();

  res.status(200).json({
    success: true,
    message: 'Quotation updated successfully',
    data: quotation,
  });
});

/**
 * @desc    Delete quotation
 * @route   DELETE /api/v1/billing/quotations/:id
 * @access  Private (Admin)
 */
export const deleteQuotation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotation.status === 'converted') {
    return next(new AppError('Cannot delete converted quotation', 400));
  }

  await quotation.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Quotation deleted successfully',
    data: null,
  });
});

/**
 * @desc    Send quotation to customer
 * @route   POST /api/v1/billing/quotations/:id/send
 * @access  Private (Admin, Staff)
 */
export const sendQuotation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotation.status === 'converted') {
    return next(new AppError('Quotation has already been converted', 400));
  }

  quotation.status = 'sent';
  quotation.sentAt = new Date();
  await quotation.save();

  // TODO: Send email with quotation
  // await emailService.sendQuotation(quotation);

  res.status(200).json({
    success: true,
    message: 'Quotation sent successfully',
    data: quotation,
  });
});

/**
 * @desc    Mark quotation as viewed
 * @route   POST /api/v1/billing/quotations/:id/viewed
 * @access  Public
 */
export const markQuotationViewed = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotation.status === 'sent') {
    quotation.status = 'viewed';
    quotation.viewedAt = new Date();
    await quotation.save();
  }

  res.status(200).json({
    success: true,
    message: 'Quotation marked as viewed',
    data: quotation,
  });
});

/**
 * @desc    Accept quotation
 * @route   POST /api/v1/billing/quotations/:id/accept
 * @access  Private
 */
export const acceptQuotation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotation.isExpired) {
    return next(new AppError('Quotation has expired', 400));
  }

  quotation.status = 'accepted';
  quotation.acceptedAt = new Date();
  await quotation.save();

  res.status(200).json({
    success: true,
    message: 'Quotation accepted successfully',
    data: quotation,
  });
});

/**
 * @desc    Reject quotation
 * @route   POST /api/v1/billing/quotations/:id/reject
 * @access  Private
 */
export const rejectQuotation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    return next(new AppError('Quotation not found', 404));
  }

  quotation.status = 'rejected';
  quotation.rejectedAt = new Date();
  quotation.rejectionReason = req.body.reason;
  await quotation.save();

  res.status(200).json({
    success: true,
    message: 'Quotation rejected',
    data: quotation,
  });
});

/**
 * @desc    Convert quotation to invoice
 * @route   POST /api/v1/billing/quotations/:id/convert
 * @access  Private (Admin, Staff)
 */
export const convertQuotationToInvoice = asyncHandler(async (req, res) => {
  const invoice = await BillingService.convertQuotationToInvoice(
    req.params.id,
    req.user.id,
    req.body,
  );

  res.status(201).json({
    success: true,
    message: 'Quotation converted to invoice successfully',
    data: invoice,
  });
});

/**
 * @desc    Get quotation statistics
 * @route   GET /api/v1/billing/quotations/stats
 * @access  Private (Admin, Staff)
 */
export const getQuotationStats = asyncHandler(async (req, res) => {
  const stats = await Quotation.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
      },
    },
  ]);

  const total = await Quotation.countDocuments();
  const totalValue = await Quotation.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      totalValue: totalValue[0]?.total || 0,
      byStatus: stats,
    },
  });
});

/**
 * @desc    Download quotation PDF
 * @route   GET /api/v1/billing/quotations/:id/pdf
 * @access  Private
 */
export const downloadQuotationPDF = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('lead')
    .populate('package')
    .populate('createdBy');

  if (!quotation) {
    return next(new AppError('Quotation not found', 404));
  }

  try {
    const { generateQuotationPDF } = await import('../utils/billingPDFGenerator.js');
    const pdfPath = await generateQuotationPDF(quotation, quotation.lead);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quotationNumber || quotation._id}.pdf"`);
    
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