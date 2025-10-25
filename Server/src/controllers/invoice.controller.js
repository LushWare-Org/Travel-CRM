import Invoice from '../models/invoice.model.js';
import Booking from '../models/booking.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Get invoice for a specific booking
// @route   GET /api/invoices/:bookingId
// @access  Public (in real app, this should be protected)
export const getInvoiceByBooking = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  const invoice = await Invoice.findOne({ booking: bookingId })
    .populate('booking')
    .populate('user', 'name email');

  if (!invoice) {
    return next(new AppError('No invoice found for this booking', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      invoice
    }
  });
});

// @desc    Get all invoices for logged-in user
// @route   GET /api/invoices/me
// @access  Public (in real app, this should be protected)
export const getMyInvoices = asyncHandler(async (req, res, next) => {
  // In real app, get userId from JWT token
  const userId = req.body.userId || req.query.userId; // Temporary for testing
  
  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const invoices = await Invoice.find({ user: userId })
    .populate('booking')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: invoices.length,
    data: {
      invoices
    }
  });
});

export default {
  getInvoiceByBooking,
  getMyInvoices
};
