import Lead from '../models/lead.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Submit a travel inquiry or "Get Free Quote" request
// @route   POST /api/leads
// @access  Public
export const createLead = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    source = 'website',
    destination,
    travelDate,
    numberOfTravelers,
    budget,
    message
  } = req.body;

  // Validate required fields
  if (!name || !email || !phone) {
    return next(new AppError('Please provide name, email, and phone number', 400));
  }

  // Create lead
  const lead = await Lead.create({
    name,
    email,
    phone,
    source,
    destination,
    travelDate: travelDate ? new Date(travelDate) : undefined,
    numberOfTravelers: numberOfTravelers ? Number(numberOfTravelers) : undefined,
    budget,
    message,
    status: 'new',
    priority: 'medium'
  });

  res.status(201).json({
    status: 'success',
    message: 'Your inquiry has been submitted successfully! We will contact you soon.',
    data: {
      lead
    }
  });
});

export default {
  createLead
};
