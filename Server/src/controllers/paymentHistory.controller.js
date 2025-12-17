import fs from 'fs';
import PaymentHistory from '../models/paymentHistory.model.js';
import Lead from '../models/lead.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { APIFeatures } from '../utils/apiFeatures.js';

/**
 * @desc    Get all payment history records
 * @route   GET /api/v1/billing/payment-history
 * @access  Private
 */
export const getAllPaymentHistory = asyncHandler(async (req, res) => {
  // Build base query - filter by lead assignedTo for sales reps
  let baseQuery = PaymentHistory.find();
  
  // If user is a sales rep, only show payment history for leads assigned to them
  if (req.user.role === 'salesRep') {
    const assignedLeadIds = await Lead.find({ assignedTo: req.user._id }).select('_id').lean();
    const leadIds = assignedLeadIds.map((lead) => lead._id);
    baseQuery = baseQuery.where('lead').in(leadIds);
  }

  const features = new APIFeatures(
    baseQuery
      .populate('lead', 'name email phone')
      .populate('invoice', 'invoiceNumber totalAmount')
      .populate('receipt', 'receiptNumber')
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
      endDate.setHours(23, 59, 59, 999); // Include entire end date
      dateFilter.$lte = endDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      features.query = features.query.and({ paymentDate: dateFilter });
    }
  }

  const paymentHistory = await features.query;
  
  // Get total count with same filter
  let countQuery = PaymentHistory.find();
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
    count: paymentHistory.length,
    total,
    data: paymentHistory,
  });
});

/**
 * @desc    Get payment history by ID
 * @route   GET /api/v1/billing/payment-history/:id
 * @access  Private
 */
export const getPaymentHistoryById = asyncHandler(async (req, res, next) => {
  const paymentHistory = await PaymentHistory.findById(req.params.id)
    .populate('lead', 'name email phone status assignedTo')
    .populate('invoice', 'invoiceNumber totalAmount paidAmount outstandingAmount')
    .populate('receipt', 'receiptNumber receiptStatus')
    .populate('createdBy', 'name email')
    .populate('verifiedBy', 'name email')
    .populate('reconciledBy', 'name email');

  if (!paymentHistory) {
    return next(new AppError('Payment history record not found', 404));
  }

  // Check permissions - sales rep can only access payment history for leads assigned to them
  if (req.user.role === 'salesRep' && paymentHistory.lead?.assignedTo?.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this payment history record', 403));
  }

  res.status(200).json({
    success: true,
    data: paymentHistory,
  });
});

/**
 * @desc    Get payment history by lead ID
 * @route   GET /api/v1/billing/payment-history/lead/:leadId
 * @access  Private
 */
export const getPaymentHistoryByLeadId = asyncHandler(async (req, res, next) => {
  // Check permissions - sales rep can only access payment history for leads assigned to them
  if (req.user.role === 'salesRep') {
    const lead = await Lead.findById(req.params.leadId).select('assignedTo');
    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }
    if (lead.assignedTo?.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access payment history for this lead', 403));
    }
  }

  const paymentHistory = await PaymentHistory.find({ lead: req.params.leadId })
    .populate('invoice', 'invoiceNumber totalAmount')
    .populate('receipt', 'receiptNumber')
    .populate('createdBy', 'name email')
    .sort({ paymentDate: -1 });

  res.status(200).json({
    success: true,
    count: paymentHistory.length,
    data: paymentHistory,
  });
});

/**
 * @desc    Download payment history PDF
 * @route   GET /api/v1/billing/payment-history/:id/pdf
 * @access  Private
 */
export const downloadPaymentHistoryPDF = asyncHandler(async (req, res, next) => {
  const paymentHistory = await PaymentHistory.findById(req.params.id)
    .populate('lead')
    .populate('invoice')
    .populate('receipt')
    .populate('createdBy');

  if (!paymentHistory) {
    return next(new AppError('Payment history record not found', 404));
  }

  try {
    const { generatePaymentHistoryPDF } = await import('../utils/paymentHistoryPDFGenerator.js');
    const pdfPath = await generatePaymentHistoryPDF(paymentHistory);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="payment-history-${paymentHistory.paymentHistoryNumber || paymentHistory._id}.pdf"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      // Optionally delete the file after sending
    });

    fileStream.on('error', (error) => {
      return next(new AppError('Error reading PDF file', 500));
    });
  } catch (error) {
    return next(new AppError(`Error generating PDF: ${error.message}`, 500));
  }
});

