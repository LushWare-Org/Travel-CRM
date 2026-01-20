import crypto from 'crypto';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import Booking from '../models/booking.model.js';
import Lead from '../models/lead.model.js';
import Package from '../models/package.model.js';
import User from '../models/user.model.js';
import packageService from '../services/package.service.js';
import { assignSalesRepIfNeeded } from '../services/assignment.service.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

const normalizePhone = (phone) => {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return undefined;
};

export const createWebsiteBooking = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    travelers,
    travelDate,
    message,
    packageId,
  } = req.body || {};

  if (!packageId) {
    throw new AppError('packageId is required', 400);
  }

  if (!email) {
    throw new AppError('Email is required to create a booking', 400);
  }

  const pkg = await Package.findById(packageId);
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
  if (!parsedTravelDate || Number.isNaN(parsedTravelDate.getTime())) {
    throw new AppError('A valid travelDate is required', 400);
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

  let booking = null;
  const leadPayload = {
    name: sanitizedName,
    email: sanitizedEmail,
    phone: normalizedPhone || '',
    source: 'booking',
    platform: 'Website Form',
    package: pkg._id,
    packageName: pkg.name,
    destination: pkg.destination,
    destinationCountry: pkg.destination,
    travelDate: parsedTravelDate,
    numberOfTravelers: parsedTravelers,
    budget: pkg.price ? `${pkg.price}` : undefined,
    message: message?.trim() || undefined,
    status: 'new',
    tags: ['website-booking'],
  };

  if (message?.trim()) {
    leadPayload.remarks = [
      {
        text: `Website inquiry: ${message.trim()}`,
        date: new Date(),
        addedBy: null,
      },
    ];
  }

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
    logger.warn(`Sales rep auto-assignment failed for website booking lead: ${assignmentError.message}`);
  }

  try {
    booking = await Booking.create({
      user: user._id,
      package: pkg._id,
      travelDate: parsedTravelDate,
      numberOfTravelers: parsedTravelers,
      totalAmount: pkg.price || 0,
      paidAmount: 0,
      paymentStatus: 'pending',
      bookingStatus: 'pending',
      specialRequests: message?.trim() || undefined,
      assignedTo: assignedSalesRepId || undefined,
    });

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const lead = await Lead.create([leadPayload], { session });
      const newLead = lead[0];

      await packageService.incrementBookings(pkg._id);
      await session.commitTransaction();

      // Send assignment email notification if a sales rep was assigned
      if (newLead.assignedTo && assignmentResult?.assigned) {
        try {
          const salesRep = assignmentResult.salesRep || await User.findById(newLead.assignedTo).select('name email').lean();
          if (salesRep && salesRep.email) {
            logger.info(`Sending lead assignment email to ${salesRep.email} for new lead ${newLead._id} (from booking)`);

            emailService
              .sendLeadAssignmentEmail({
                salesRep,
                lead: newLead.toObject(),
                assignedBy: null,
                assignmentMode: 'auto',
              })
              .then(() => {
                logger.info(`✅ Lead assignment email sent successfully to ${salesRep.email}`);
              })
              .catch((err) => {
                logger.error(`❌ Failed to send lead assignment email to ${salesRep.email}: ${err.message}`);
                logger.error(`Email error details:`, err);
              });
          } else {
            logger.warn(`⚠️  Cannot send assignment email: sales rep ${newLead.assignedTo} has no email address`);
          }
        } catch (error) {
          logger.error(`Error preparing lead assignment email: ${error.message}`);
          logger.error(`Error stack:`, error.stack);
        }
      }

      logger.info(`Website booking created for package ${pkg._id} by ${sanitizedEmail}`);

      res.status(201).json({
        success: true,
        message: 'Booking request submitted successfully',
        data: {
          bookingId: booking._id,
          leadId: lead[0]?._id,
          salesRepId: assignedSalesRepId || null,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    if (booking?._id) {
      await Booking.findByIdAndDelete(booking._id);
    }
    throw error;
  }
});

export const getUserBookings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!userId) {
    throw new AppError('User ID is required', 401);
  }

  const bookings = await Booking.find({ user: userId })
    .populate({
      path: 'package',
      select: 'name destination duration price coverImage slug',
    })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: bookings || [],
  });
});

export const getRecentBookings = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const bookings = await Booking.find({
    bookingStatus: { $in: ['confirmed', 'completed', 'pending'] },
  })
    .populate({
      path: 'package',
      select: 'name description price duration coverImage images slug destination maxGroupSize category inclusions exclusions highlights terms isActive isFeatured rating numReviews views bookings createdBy availableFrom createdAt updatedAt',
    })
    .populate({
      path: 'user',
      select: 'name country email',
    })
    .sort({ confirmedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: bookings || [],
  });
});
