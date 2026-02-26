import mongoose from 'mongoose';
import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import CustomizedPackage from '../models/customizedPackage.model.js';
import Itinerary from '../models/itinerary.model.js';
import Package from '../models/package.model.js';
import Lead from '../models/lead.model.js';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import { assignSalesRepIfNeeded } from '../services/assignment.service.js';
import packageService from '../services/package.service.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

const formatCustomizedName = (baseName = '', sequence = 1) => {
  const cleanBase = `${baseName}`.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim();
  return sequence > 1 ? `${cleanBase} (Customized-${sequence})` : `${cleanBase} (Customized)`;
};

// @desc    Get customized package by ID
// @route   GET /api/v1/customized-packages/:id
// @access  Private (Admin, SalesRep)
export const getCustomizedPackageById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const customizedPackage = await CustomizedPackage.findById(id)
    .populate('originalPackage', 'name destination duration price')
    .populate('customizedForLead', 'name email')
    .populate('customizedBy', 'name email')
    .populate('itinerary');

  if (!customizedPackage) {
    return next(new AppError('Customized package not found', 404));
  }

  res.status(200).json({
    success: true,
    data: customizedPackage,
  });
});

// @desc    Update customized package
// @route   PUT /api/v1/customized-packages/:id
// @access  Private (Admin, SalesRep)
export const updateCustomizedPackage = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const customizedPackage = await CustomizedPackage.findById(id);

  if (!customizedPackage) {
    return next(new AppError('Customized package not found', 404));
  }

  const userId = req.user._id;
  const userRole = req.user.role;
  const isOwner = customizedPackage.customizedBy?.toString() === userId.toString();
  const isAuthorized = isOwner || ['admin', 'salesRep', 'staff'].includes(userRole);

  if (!isAuthorized) {
    return next(new AppError('Not authorized to update this customized package', 403));
  }

  const { days, ...updateData } = req.body;
  const baseNameFromPayload = updateData.baseName;
  delete updateData.baseName;

  const numericFields = ['price', 'duration', 'maxGroupSize'];
  numericFields.forEach((field) => {
    if (updateData[field] !== undefined && updateData[field] !== null && updateData[field] !== '') {
      const parsed = field === 'price'
        ? parseFloat(updateData[field])
        : parseInt(updateData[field], 10);
      if (!Number.isNaN(parsed)) {
        updateData[field] = parsed;
      }
    }
  });

  const allowedFields = [
    'name',
    'description',
    'destination',
    'duration',
    'price',
    'maxGroupSize',
    'difficulty',
    'category',
    'inclusions',
    'exclusions',
    'highlights',
    'terms',
    'isActive',
    'isFeatured',
    'availableFrom',
    'availableTo',
    'images',
    'coverImage',
    'customizationNotes',
    'customizationSequence',
  ];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updateData, field)) {
      customizedPackage[field] = updateData[field];
    }
  });

  if (Array.isArray(days)) {
    if (customizedPackage.itinerary) {
      const itinerary = await Itinerary.findById(customizedPackage.itinerary);
      if (itinerary) {
        itinerary.days = days;
        if (updateData.status) {
          itinerary.status = updateData.status;
        }
        itinerary.metadata = itinerary.metadata || {};
        itinerary.metadata.lastModifiedBy = userId;
        await itinerary.save();
      }
    } else if (days.length > 0) {
      const newItinerary = await Itinerary.create({
        package: customizedPackage._id,
        packageModel: 'CustomizedPackage',
        days,
        createdBy: userId,
        status: updateData.status || 'draft',
      });
      customizedPackage.itinerary = newItinerary._id;
    }
  }

  customizedPackage.customizedBy = userId;
  const computedSequence = updateData.customizationSequence !== undefined && updateData.customizationSequence !== null
    ? updateData.customizationSequence
    : customizedPackage.customizationSequence || 1;
  customizedPackage.customizationSequence = computedSequence;

  const baseName = baseNameFromPayload
    || updateData.name
    || customizedPackage.baseName
    || customizedPackage.name
    || 'Customized Package';
  customizedPackage.name = formatCustomizedName(baseName, computedSequence);

  await customizedPackage.save();

  await customizedPackage.populate('originalPackage', 'name destination');
  await customizedPackage.populate('customizedForLead', 'name email');
  await customizedPackage.populate('itinerary');

  res.status(200).json({
    success: true,
    message: 'Customized package updated successfully',
    data: customizedPackage,
  });
});

const normalizeListField = (value, fallback = []) => {
  if (!value && value !== '') {
    return fallback;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
};

const normalizePhone = (rawPhone) => {
  if (!rawPhone) return undefined;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length > 0) return Number(digits);
  return undefined;
};

const sanitizeDays = (days, fallback = []) => {
  if (!Array.isArray(days) || !days.length) {
    return fallback;
  }
  return days
    .map((day, index) => {
      if (!day) return null;
      const dayNumber = Number(day.dayNumber ?? index + 1);
      const baseTitle = day.title || `Day ${dayNumber}`;
      const description = day.description ? String(day.description).trim() : '';
      const activities = normalizeListField(day.activities, day.activities && Array.isArray(day.activities) ? day.activities : []);
      const locations = normalizeListField(day.locations, day.locations && Array.isArray(day.locations) ? day.locations : []);
      return {
        dayNumber: Number.isNaN(dayNumber) ? index + 1 : dayNumber,
        title: baseTitle,
        description,
        activities,
        locations,
        accommodation: day.accommodation || {},
        meals: day.meals || {},
        transport: day.transport || undefined,
        notes: day.notes || '',
      };
    })
    .filter(Boolean);
};

const buildCustomizationNotes = ({
  baseMessage,
  overrides,
  originalPackage,
  leadName,
}) => {
  const notes = [];
  if (baseMessage) {
    notes.push(baseMessage.trim());
  }
  const diffNotes = [];
  if (overrides.duration && overrides.duration !== originalPackage.duration) {
    diffNotes.push(`Requested duration change: ${originalPackage.duration} → ${overrides.duration} days`);
  }
  if (overrides.price && overrides.price !== originalPackage.price) {
    diffNotes.push(`Requested price change: ${originalPackage.price} → ${overrides.price}`);
  }
  if (overrides.maxGroupSize && overrides.maxGroupSize !== originalPackage.maxGroupSize) {
    diffNotes.push(`Requested group size: ${overrides.maxGroupSize}`);
  }
  if (overrides.highlights && overrides.highlights.length) {
    diffNotes.push(`Focus highlights: ${overrides.highlights.join(', ')}`);
  }
  if (overrides.inclusions && overrides.inclusions.length) {
    diffNotes.push(`Specific inclusions requested (${overrides.inclusions.length} items)`);
  }
  if (overrides.exclusions && overrides.exclusions.length) {
    diffNotes.push(`Specific exclusions requested (${overrides.exclusions.length} items)`);
  }
  if (diffNotes.length) {
    notes.push(diffNotes.join(' | '));
  }
  if (!notes.length) {
    notes.push(`Website customization request for ${leadName || 'lead'}`);
  }
  return notes.join('\n');
};

const findFallbackStaffUser = async () => {
  const roles = ['salesRep', 'admin', 'staff'];
  return User.findOne({ role: { $in: roles }, isActive: true }).sort({ createdAt: 1 }).select('_id');
};

export const createWebsiteCustomizedPackage = asyncHandler(async (req, res) => {
  const {
    packageId,
    name,
    email,
    phone,
    travelers,
    travelDate,
    budget,
    message,
    overrides = {},
  } = req.body || {};

  if (!packageId) {
    throw new AppError('packageId is required', 400);
  }

  if (!email) {
    throw new AppError('Email is required to customize a package', 400);
  }

  const pkg = await Package.findById(packageId).populate({
    path: 'itinerary',
    select: 'days status',
  });

  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  const sanitizedName = name?.trim() || 'Website Traveler';
  const normalizedPhone = normalizePhone(phone);
  const parsedTravelers = Number(travelers) || 1;
  if (!Number.isFinite(parsedTravelers) || parsedTravelers < 1) {
    throw new AppError('travelers must be a positive number', 400);
  }
  const parsedTravelDate = travelDate ? new Date(travelDate) : null;
  if (travelDate && (!parsedTravelDate || Number.isNaN(parsedTravelDate.getTime()))) {
    throw new AppError('If provided, travelDate must be a valid date', 400);
  }

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

  const leadPayload = {
    name: sanitizedName,
    email: sanitizedEmail,
    phone: normalizedPhone,
    source: 'website',
    platform: 'Website Form',
    package: pkg._id,
    packageName: pkg.name,
    destination: pkg.destination,
    destinationCountry: pkg.destination,
    travelDate: parsedTravelDate,
    numberOfTravelers: parsedTravelers,
    budget: budget || (pkg.price ? `${pkg.price}` : undefined),
    message: message?.trim() || undefined,
    status: 'new',
    assignmentMode: 'auto',
    tags: ['website-customization'],
    remarks: message?.trim()
      ? [
        {
          text: `Website customization: ${message.trim()}`,
          date: new Date(),
          addedBy: null,
        },
      ]
      : [],
  };

  let assignedSalesRepId = null;
  let assignmentResult = null;
  try {
    assignmentResult = await assignSalesRepIfNeeded(leadPayload);
    if (assignmentResult.assigned && assignmentResult.salesRepId) {
      assignedSalesRepId = assignmentResult.salesRepId;
      if (!leadPayload.salesRep) {
        const rep = assignmentResult.salesRep || await User.findById(assignmentResult.salesRepId).select('name');
        if (rep?.name) {
          leadPayload.salesRep = rep.name;
        }
      }
    }
  } catch (assignmentError) {
    logger.warn(`Sales rep auto-assignment failed for website customization lead: ${assignmentError.message}`);
  }

  const sanitizedOverrides = {
    duration: overrides.duration ? parseInt(overrides.duration, 10) : undefined,
    price: overrides.price ? parseFloat(overrides.price) : undefined,
    maxGroupSize: overrides.maxGroupSize ? parseInt(overrides.maxGroupSize, 10) : undefined,
    description: overrides.description ? String(overrides.description).trim() : undefined,
    highlights: normalizeListField(overrides.highlights),
    inclusions: normalizeListField(overrides.inclusions),
    exclusions: normalizeListField(overrides.exclusions),
    terms: normalizeListField(overrides.terms, undefined),
    days: sanitizeDays(overrides.days),
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const leadDocs = await Lead.create([leadPayload], { session });
    const lead = leadDocs[0];

    let sequence = 1;
    try {
      sequence = (await CustomizedPackage.countDocuments(
        { customizedForLead: lead._id, originalPackage: pkg._id },
      ).session(session)) + 1;
    } catch (countError) {
      logger.warn(`Failed to determine customization sequence, defaulting to 1: ${countError.message}`);
    }

    const baseName = `${pkg.name || 'Customized Package'}`.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim();
    const customizedName = formatCustomizedName(baseName || 'Customized Package', sequence);

    const notes = buildCustomizationNotes({
      baseMessage: message,
      overrides: sanitizedOverrides,
      originalPackage: pkg,
      leadName: lead.name,
    });

    const chosenCustomizer = assignedSalesRepId
      || pkg.createdBy
      || (await findFallbackStaffUser())?._id
      || user._id;

    const customPackagePayload = {
      customizationSequence: sequence,
      name: customizedName,
      description: sanitizedOverrides.description || pkg.description,
      destination: pkg.destination,
      duration: sanitizedOverrides.duration || pkg.duration,
      price: sanitizedOverrides.price || pkg.price,
      maxGroupSize: sanitizedOverrides.maxGroupSize || pkg.maxGroupSize || 10,
      difficulty: pkg.difficulty || 'moderate',
      category: pkg.category || 'other',
      images: Array.isArray(pkg.images) ? pkg.images : [],
      coverImage: pkg.coverImage || undefined,
      inclusions: sanitizedOverrides.inclusions?.length ? sanitizedOverrides.inclusions : pkg.inclusions,
      exclusions: sanitizedOverrides.exclusions?.length ? sanitizedOverrides.exclusions : pkg.exclusions,
      highlights: sanitizedOverrides.highlights?.length ? sanitizedOverrides.highlights : pkg.highlights,
      terms: sanitizedOverrides.terms ?? pkg.terms,
      availableFrom: pkg.availableFrom,
      availableTo: pkg.availableTo,
      rating: 0,
      numReviews: 0,
      views: 0,
      bookings: 0,
      createdBy: user._id,
      customizedForLead: lead._id,
      originalPackage: pkg._id,
      customizedBy: chosenCustomizer,
      customizationNotes: notes,
    };

    const customizedPackages = await CustomizedPackage.create([customPackagePayload], { session });
    const customizedPackage = customizedPackages[0];

    const baseDays = Array.isArray(pkg.itinerary?.days)
      ? sanitizeDays(pkg.itinerary.days)
      : [];
    const finalDays = sanitizedOverrides.days && sanitizedOverrides.days.length ? sanitizedOverrides.days : baseDays;

    if (finalDays.length) {
      const newItinerary = await Itinerary.create(
        [
          {
            package: customizedPackage._id,
            packageModel: 'CustomizedPackage',
            days: finalDays,
            status: 'draft',
            createdBy: chosenCustomizer,
          },
        ],
        { session },
      );
      customizedPackage.itinerary = newItinerary[0]._id;
      await customizedPackage.save({ session });
    }

    const bookingDocs = await Booking.create(
      [
        {
          user: user._id,
          package: pkg._id,
          travelDate: parsedTravelDate,
          numberOfTravelers: parsedTravelers,
          totalAmount: sanitizedOverrides.price || pkg.price || 0,
          paidAmount: 0,
          paymentStatus: 'pending',
          bookingStatus: 'pending',
          specialRequests: message?.trim() || 'Website customization request',
          notes: `CustomizedPackage:${customizedPackage._id.toString()}`,
          assignedTo: assignedSalesRepId || undefined,
        },
      ],
      { session },
    );
    const booking = bookingDocs[0];

    lead.customizedPackage = customizedPackage._id;
    lead.package = null;
    lead.packageName = customizedPackage.name;
    lead.convertedBooking = booking._id;
    await lead.save({ session });

    await packageService.incrementBookings(pkg._id);

    await session.commitTransaction();

    // Send assignment email notification if a sales rep was assigned
    if (lead.assignedTo && assignmentResult?.assigned) {
      try {
        const salesRep = assignmentResult.salesRep || await User.findById(lead.assignedTo).select('name email').lean();
        if (salesRep && salesRep.email) {
          logger.info(`Sending lead assignment email to ${salesRep.email} for new lead ${lead._id} (from customization)`);

          emailService
            .sendLeadAssignmentEmail({
              salesRep,
              lead: lead.toObject(),
              assignedBy: null,
              assignmentMode: 'auto',
            })
            .then(() => {
              logger.info(`✅ Lead assignment email sent successfully to ${salesRep.email}`);
            })
            .catch((err) => {
              logger.error(`❌ Failed to send lead assignment email to ${salesRep.email}: ${err.message}`);
              logger.error('Email error details:', err);
            });
        } else {
          logger.warn(`⚠️  Cannot send assignment email: sales rep ${lead.assignedTo} has no email address`);
        }
      } catch (error) {
        logger.error(`Error preparing lead assignment email: ${error.message}`);
        logger.error('Error stack:', error.stack);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Customization request submitted successfully',
      data: {
        customizedPackageId: customizedPackage._id,
        leadId: lead._id,
        salesRepId: assignedSalesRepId || null,
        bookingId: booking._id,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const getUserCustomizedPackages = asyncHandler(async (req, res, next) => {
  const userEmail = req.user?.email;
  if (!userEmail) {
    return next(new AppError('User email not found', 400));
  }

  // Find leads with user's email
  const leads = await Lead.find({ email: userEmail.toLowerCase() });
  const leadIds = leads.map((l) => l._id);

  // Find customized packages
  const customizedPackages = await CustomizedPackage.find({
    customizedForLead: { $in: leadIds },
  })
    .populate('itinerary')
    .populate('originalPackage', 'name destination')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: customizedPackages,
  });
});
