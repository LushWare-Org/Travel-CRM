import Booking from '../models/booking.model.js';
import Package from '../models/package.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Public (in real app, this should be protected)
export const createBooking = asyncHandler(async (req, res, next) => {
  const {
    packageId,
    userId,
    travelDate,
    numberOfTravelers,
    travelers,
    totalAmount,
    specialRequests
  } = req.body;

  // Validate required fields
  if (!packageId || !userId || !travelDate || !numberOfTravelers || !travelers || !totalAmount) {
    return next(new AppError('Please provide all required booking information', 400));
  }

  // Check if package exists
  const packageDoc = await Package.findById(packageId);
  if (!packageDoc) {
    return next(new AppError('Package not found', 404));
  }

  // Validate travelers array
  if (travelers.length !== numberOfTravelers) {
    return next(new AppError('Number of travelers must match travelers array length', 400));
  }

  // Create booking
  const booking = await Booking.create({
    user: userId,
    package: packageId,
    travelDate: new Date(travelDate),
    numberOfTravelers,
    travelers,
    totalAmount,
    specialRequests,
    bookingStatus: 'pending',
    paymentStatus: 'pending'
  });

  // Update package bookings count
  await Package.findByIdAndUpdate(packageId, {
    $inc: { bookings: 1 }
  });

  res.status(201).json({
    status: 'success',
    message: 'Booking created successfully!',
    data: {
      booking
    }
  });
});

// @desc    Get all bookings for logged-in user
// @route   GET /api/bookings/me
// @access  Public (in real app, this should be protected)
export const getMyBookings = asyncHandler(async (req, res, next) => {
  // In real app, get userId from JWT token
  const userId = req.body.userId || req.query.userId;
  
  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const bookings = await Booking.find({ user: userId })
    .populate('package', 'name destination duration price')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings
    }
  });
});

// @desc    Get single booking details
// @route   GET /api/bookings/:id
// @access  Public (in real app, this should be protected)
export const getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('package');

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

export default {
  createBooking,
  getMyBookings,
  getBooking
};