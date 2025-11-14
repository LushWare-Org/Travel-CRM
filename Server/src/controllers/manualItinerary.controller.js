import crypto from 'crypto';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import ManualItinerary from '../models/manualItinerary.model.js';
import Lead from '../models/lead.model.js';
import User from '../models/user.model.js';
import { assignSalesRepIfNeeded } from '../services/assignment.service.js';
import logger from '../config/logger.js';

const normalizePhone = (phone) => {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  }
  return undefined;
};

// @desc    Create or update manual itinerary for a lead
// @route   POST /api/v1/manual-itineraries
// @route   PUT /api/v1/manual-itineraries/:leadId
// @access  Private (Admin, SalesRep)
export const createOrUpdateManualItinerary = asyncHandler(async (req, res, next) => {
  const { leadId } = req.params;
  const { days } = req.body;

  // Check if lead exists
  const lead = await Lead.findById(leadId);
  if (!lead) {
    return next(new AppError('Lead not found', 404));
  }

  // Check if manual itinerary already exists for this lead
  let manualItinerary = await ManualItinerary.findOne({ lead: leadId });

  if (manualItinerary) {
    // Update existing itinerary
    manualItinerary.days = days || [];
    manualItinerary.metadata.lastModifiedBy = req.user._id;
    await manualItinerary.save();

    res.status(200).json({
      success: true,
      data: manualItinerary,
      message: 'Manual itinerary updated successfully',
    });
  } else {
    // Create new itinerary
    manualItinerary = await ManualItinerary.create({
      lead: leadId,
      days: days || [],
      createdBy: req.user._id,
      metadata: {
        lastModifiedBy: req.user._id,
      },
    });

    // Link itinerary to lead
    lead.manualItinerary = manualItinerary._id;
    await lead.save();

    res.status(201).json({
      success: true,
      data: manualItinerary,
      message: 'Manual itinerary created successfully',
    });
  }
});

// @desc    Get manual itinerary by lead ID
// @route   GET /api/v1/manual-itineraries/lead/:leadId
// @access  Private (Admin, SalesRep)
export const getManualItineraryByLead = asyncHandler(async (req, res, next) => {
  const { leadId } = req.params;

  const manualItinerary = await ManualItinerary.findOne({ lead: leadId })
    .populate('createdBy', 'name email')
    .populate('metadata.lastModifiedBy', 'name email');

  if (!manualItinerary) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No manual itinerary found for this lead',
    });
  }

  res.status(200).json({
    success: true,
    data: manualItinerary,
  });
});

// @desc    Delete manual itinerary
// @route   DELETE /api/v1/manual-itineraries/:id
// @access  Private (Admin, SalesRep)
export const deleteManualItinerary = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const manualItinerary = await ManualItinerary.findById(id);
  if (!manualItinerary) {
    return next(new AppError('Manual itinerary not found', 404));
  }

  // Remove reference from lead
  await Lead.findByIdAndUpdate(manualItinerary.lead, {
    $unset: { manualItinerary: '' },
  });

  await ManualItinerary.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Manual itinerary deleted successfully',
  });
});

// @desc    Create manual itinerary from website form (public endpoint)
// @route   POST /api/v1/manual-itineraries/website
// @access  Public (No authentication required)
export const createWebsiteManualItinerary = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    destination,
    destinationCountry,
    region,
    travelDate,
    endDate,
    numberOfTravelers,
    budget,
    message,
    days,
  } = req.body || {};

  if (!email) {
    return next(new AppError('Email is required to create a manual itinerary', 400));
  }

  if (!travelDate) {
    return next(new AppError('Travel date is required', 400));
  }

  if (!days || !Array.isArray(days) || days.length === 0) {
    return next(new AppError('Itinerary days are required', 400));
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  const sanitizedName = name?.trim() || 'Website Traveler';
  const normalizedPhone = normalizePhone(phone);

  const parsedTravelers = Number(numberOfTravelers) || 1;
  if (!Number.isFinite(parsedTravelers) || parsedTravelers < 1) {
    return next(new AppError('numberOfTravelers must be a positive number', 400));
  }

  const parsedTravelDate = travelDate ? new Date(travelDate) : null;
  if (!parsedTravelDate || Number.isNaN(parsedTravelDate.getTime())) {
    return next(new AppError('A valid travelDate is required', 400));
  }

  const parsedEndDate = endDate ? new Date(endDate) : null;
  if (parsedEndDate && !Number.isNaN(parsedEndDate.getTime())) {
    // Validate endDate >= travelDate if both are provided
    if (parsedTravelDate && parsedEndDate < parsedTravelDate) {
      return next(new AppError('End date must be greater than or equal to travel date', 400));
    }
  }

  // Find or create user
  let user = await User.findOne({ email: sanitizedEmail });
  if (!user) {
    const randomPassword = crypto.randomBytes(12).toString('hex');
    user = await User.create({
      name: sanitizedName,
      email: sanitizedEmail,
      phone: normalizedPhone,
      password: randomPassword,
      role: 'customer',
      isTempPassword: true,
      mustChangePassword: true,
    });
  } else {
    let shouldUpdateUser = false;
    if (!user.phone && normalizedPhone) {
      user.phone = normalizedPhone;
      shouldUpdateUser = true;
    }
    if (!user.name && sanitizedName) {
      user.name = sanitizedName;
      shouldUpdateUser = true;
    }
    if (shouldUpdateUser) {
      await user.save();
    }
  }

  // Prepare lead payload
  const leadPayload = {
    name: sanitizedName,
    email: sanitizedEmail,
    phone: normalizedPhone,
    whatsapp: normalizedPhone,
    source: 'website',
    platform: 'Website Form',
    destination: destination || '',
    destinationCountry: destinationCountry || '',
    fromCountry: region || '',
    travelDate: parsedTravelDate,
    endDate: parsedEndDate || undefined,
    numberOfTravelers: parsedTravelers,
    budget: budget || undefined,
    message: message?.trim() || undefined,
    status: 'new',
    tags: ['website-manual-itinerary'],
  };

  // Add remarks if message exists
  if (message?.trim()) {
    leadPayload.remarks = [
      {
        text: `Website manual itinerary inquiry: ${message.trim()}`,
        date: new Date(),
        addedBy: null,
      },
    ];
  }

  // Auto-assign sales rep if enabled
  let assignedSalesRepId = null;
  try {
    const { assigned, salesRepId } = await assignSalesRepIfNeeded(leadPayload);
    if (assigned && salesRepId) {
      assignedSalesRepId = salesRepId;
      leadPayload.assignedTo = salesRepId;
      const rep = await User.findById(salesRepId).select('name');
      if (rep?.name) {
        leadPayload.salesRep = rep.name;
      }
    }
  } catch (assignmentError) {
    logger.warn(`Sales rep auto-assignment failed for website manual itinerary lead: ${assignmentError.message}`);
  }

  // Create lead and manual itinerary in a transaction
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Create lead
    const lead = await Lead.create([leadPayload], { session });
    const newLead = lead[0];

    // Create manual itinerary
    const manualItinerary = await ManualItinerary.create(
      [
        {
          lead: newLead._id,
          days: days.map((day) => ({
            dayNumber: day.dayNumber || 1,
            title: day.title || `Day ${day.dayNumber || 1}`,
            description: day.description || '',
            locations: day.locations || [],
            activities: day.activities || [],
            accommodation: day.accommodation || {
              name: '',
              type: 'hotel',
              rating: 0,
              address: '',
              contactNumber: '',
            },
            meals: day.meals || {
              breakfast: false,
              lunch: false,
              dinner: false,
            },
            transport: day.transport || '',
            places: day.places || [],
            notes: day.notes || '',
          })),
          createdBy: user._id,
          status: 'draft',
          metadata: {
            lastModifiedBy: user._id,
          },
        },
      ],
      { session },
    );
    const newManualItinerary = manualItinerary[0];

    // Link manual itinerary to lead
    newLead.manualItinerary = newManualItinerary._id;
    await newLead.save({ session });

    await session.commitTransaction();

    logger.info(`Website manual itinerary created for lead ${newLead._id} by ${sanitizedEmail}`);

    res.status(201).json({
      success: true,
      message: 'Manual itinerary request submitted successfully',
      data: {
        leadId: newLead._id,
        manualItineraryId: newManualItinerary._id,
        salesRepId: assignedSalesRepId || null,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Error creating website manual itinerary: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
});

