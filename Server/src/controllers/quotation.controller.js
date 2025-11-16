import fs from 'fs';
import Quotation from '../models/quotation.model.js';
import Lead from '../models/lead.model.js';
import BillingService from '../services/billing.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import emailService from '../utils/emailService.js';

const formatQuotationForResponse = (quotationDoc) => {
  if (!quotationDoc) {
    return quotationDoc;
  }

  const quotation =
    typeof quotationDoc.toObject === 'function'
      ? quotationDoc.toObject({ virtuals: true })
      : { ...quotationDoc };

  quotation.issueDate = quotation.issueDate || quotation.createdAt;

  return quotation;
};

/**
 * @desc    Get all quotations
 * @route   GET /api/v1/billing/quotations
 * @access  Private
 */
export const getAllQuotations = asyncHandler(async (req, res) => {
  // Build base query - filter by lead assignedTo for sales reps
  let baseQuery = Quotation.find();
  
  // If user is a sales rep, only show quotations for leads assigned to them
  if (req.user.role === 'salesRep') {
    const assignedLeadIds = await Lead.find({ assignedTo: req.user._id }).select('_id').lean();
    const leadIds = assignedLeadIds.map((lead) => lead._id);
    baseQuery = baseQuery.where('lead').in(leadIds);
  }
  // Admin can see all quotations (no filter)

  const features = new APIFeatures(
    baseQuery.populate('lead', 'name email phone status').populate('createdBy', 'name email'),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const quotationDocs = await features.query;
  const quotations = quotationDocs.map((quotation) => formatQuotationForResponse(quotation));
  
  // Get total count with same filter
  let countQuery = Quotation.find();
  if (req.user.role === 'salesRep') {
    const assignedLeadIds = await Lead.find({ assignedTo: req.user._id }).select('_id').lean();
    const leadIds = assignedLeadIds.map((lead) => lead._id);
    countQuery = countQuery.where('lead').in(leadIds);
  }
  const total = await countQuery.countDocuments();

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
  const quotationDoc = await Quotation.findById(req.params.id)
    .populate('lead', 'name email phone status destination assignedTo')
    .populate('package', 'name description price')
    .populate('createdBy', 'name email')
    .populate('convertedToInvoice');

  if (!quotationDoc) {
    return next(new AppError('Quotation not found', 404));
  }

  // Check permissions - sales rep can only access quotations for leads assigned to them
  if (req.user.role === 'salesRep' && quotationDoc.lead?.assignedTo?.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this quotation', 403));
  }

  const quotation = formatQuotationForResponse(quotationDoc);

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
export const getQuotationsByLeadId = asyncHandler(async (req, res, next) => {
  // Check permissions - sales rep can only access quotations for leads assigned to them
  if (req.user.role === 'salesRep') {
    const lead = await Lead.findById(req.params.leadId).select('assignedTo');
    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }
    if (lead.assignedTo?.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access quotations for this lead', 403));
    }
  }

  const quotationDocs = await Quotation.find({ lead: req.params.leadId })
    .populate('createdBy', 'name email')
    .populate('convertedToInvoice')
    .sort({ createdAt: -1 });

  const quotations = quotationDocs.map((quotation) => formatQuotationForResponse(quotation));

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
  const quotationDoc = await BillingService.createQuotation(req.body, req.user.id);
  const quotation = formatQuotationForResponse(quotationDoc);

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
  const quotationDoc = await Quotation.findById(req.params.id);

  if (!quotationDoc) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotationDoc.status === 'converted') {
    return next(new AppError('Cannot update converted quotation', 400));
  }

  // Track revision history
  if (quotationDoc.status !== 'draft') {
    quotationDoc.revisionHistory.push({
      version: quotationDoc.version,
      modifiedBy: req.user.id,
      changes: req.body.changes || 'Updated quotation',
    });
    quotationDoc.version += 1;
  }

  quotationDoc.lastModifiedBy = req.user.id;

  // Update fields
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && key !== 'quotationNumber' && key !== 'lead') {
      quotationDoc[key] = req.body[key];
    }
  });

  await quotationDoc.save();

  const quotation = formatQuotationForResponse(quotationDoc);

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
  const quotationDoc = await Quotation.findById(req.params.id);

  if (!quotationDoc) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotationDoc.status === 'converted') {
    return next(new AppError('Cannot delete converted quotation', 400));
  }

  await quotationDoc.deleteOne();

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
  const quotationDoc = await Quotation.findById(req.params.id)
    .populate('lead', 'name email phone');

  if (!quotationDoc) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotationDoc.status === 'converted') {
    return next(new AppError('Quotation has already been converted', 400));
  }

  const quotation = formatQuotationForResponse(quotationDoc);

  const recipientEmail = (req.body?.email || quotation.customer?.email || quotation.lead?.email || '').trim();

  if (!recipientEmail) {
    return next(new AppError('No recipient email found for this quotation', 400));
  }

  try {
    const { generateQuotationPDF } = await import('../utils/billingPDFGenerator.js');
    const pdfPath = await generateQuotationPDF(quotationDoc, quotationDoc.lead);

    await emailService.sendQuotationEmail({
      quotation,
      recipientEmail,
      pdfPath,
    });

    await fs.promises.unlink(pdfPath).catch(() => {});
  } catch (error) {
    return next(new AppError(`Error sending quotation email: ${error.message}`, 500));
  }

  quotationDoc.status = 'sent';
  quotationDoc.sentAt = new Date();
  await quotationDoc.save();

  const updatedQuotation = formatQuotationForResponse(quotationDoc);

  res.status(200).json({
    success: true,
    message: 'Quotation sent successfully',
    data: updatedQuotation,
  });
});

/**
 * @desc    Mark quotation as viewed
 * @route   POST /api/v1/billing/quotations/:id/viewed
 * @access  Public
 */
export const markQuotationViewed = asyncHandler(async (req, res, next) => {
  const quotationDoc = await Quotation.findById(req.params.id);

  if (!quotationDoc) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotationDoc.status === 'sent') {
    quotationDoc.status = 'viewed';
    quotationDoc.viewedAt = new Date();
    await quotationDoc.save();
  }

  const quotation = formatQuotationForResponse(quotationDoc);

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
  const quotationDoc = await Quotation.findById(req.params.id);

  if (!quotationDoc) {
    return next(new AppError('Quotation not found', 404));
  }

  if (quotationDoc.isExpired) {
    return next(new AppError('Quotation has expired', 400));
  }

  quotationDoc.status = 'accepted';
  quotationDoc.acceptedAt = new Date();
  await quotationDoc.save();

  const quotation = formatQuotationForResponse(quotationDoc);

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
  const quotationDoc = await Quotation.findById(req.params.id);

  if (!quotationDoc) {
    return next(new AppError('Quotation not found', 404));
  }

  quotationDoc.status = 'rejected';
  quotationDoc.rejectedAt = new Date();
  quotationDoc.rejectionReason = req.body.reason;
  await quotationDoc.save();

  const quotation = formatQuotationForResponse(quotationDoc);

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