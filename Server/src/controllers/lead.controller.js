import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import Lead from '../models/lead.model.js';
import { APIFeatures, getPaginationData } from '../utils/apiFeatures.js';
import Settings from '../models/settings.model.js';
import User from '../models/user.model.js';
import { assignSalesRepIfNeeded } from '../services/assignment.service.js';
import Itinerary from '../models/itinerary.model.js';
import mongoose from 'mongoose';
import { generateItineraryPDF, generateLeadItineraryPDF } from '../utils/pdfGenerator.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

// @desc    Create a new lead
// @route   POST /api/v1/leads
// @access  Private (Admin, SalesRep)
const parseTravelerCount = (value, defaultValue = undefined) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.floor(parsed);
  }
  return defaultValue;
};

export const createLead = asyncHandler(async (req, res, next) => {
  // Add user who created the lead
  req.body.createdBy = req.user._id;

  // If user is a sales rep, automatically assign lead to themselves
  if (req.user.role === 'salesRep') {
    req.body.assignedTo = req.user._id;
    req.body.assignmentMode = 'manual';
    req.body.assignedBy = req.user._id;
    req.body.salesRep = req.user.name;
  }

  const travelerCount = parseTravelerCount(req.body.numberOfTravelers, undefined);
  if (travelerCount !== undefined) {
    req.body.numberOfTravelers = travelerCount;
  } else {
    delete req.body.numberOfTravelers;
  }

  // Add status history
  if (req.body.status) {
    req.body.statusHistory = [
      {
        status: req.body.status,
        changedBy: req.user._id,
        notes: 'Initial status',
      },
    ];
  }

  // Auto-assign if enabled and no explicit manual assignment requested
  const settings = await Settings.getSingleton();
  const isManualMode = settings.assignmentMode === 'manual';

  // If manual and client sent assignedTo, mark manual assignment metadata
  if (isManualMode && req.body.assignedTo) {
    req.body.assignmentMode = 'manual';
    req.body.assignedBy = req.user._id;
    // Ensure salesRep name mirrors assignedTo user
    const rep = await User.findById(req.body.assignedTo).select('name');
    if (rep) {
      req.body.salesRep = rep.name;
    }
  }

  let assignmentResult = null;
  if (!isManualMode) {
    assignmentResult = await assignSalesRepIfNeeded(req.body);
    if (req.body.assignedTo) {
      const rep = await User.findById(req.body.assignedTo).select('name');
      if (rep) req.body.salesRep = rep.name;
    }
  }

  // If package is provided, populate packageName
  if (req.body.package) {
    const Package = (await import('../models/package.model.js')).default;
    const pkg = await Package.findById(req.body.package).select('name');
    if (pkg) {
      req.body.packageName = pkg.name;
    }
  }

  // If customizedPackage is provided, populate packageName
  if (req.body.customizedPackage) {
    const CustomizedPackage = (await import('../models/customizedPackage.model.js')).default;
    const customPkg = await CustomizedPackage.findById(req.body.customizedPackage).select('name');
    if (customPkg) {
      req.body.packageName = customPkg.name;
    }
  }

  // Validate endDate >= travelDate if both are provided
  if (req.body.travelDate && req.body.endDate) {
    const travelDate = new Date(req.body.travelDate);
    const endDate = new Date(req.body.endDate);
    if (endDate < travelDate) {
      return next(new AppError('End date must be greater than or equal to travel date', 400));
    }
  }

  const lead = await Lead.create(req.body);

  // Send assignment email notification if a sales rep was assigned
  if (lead.assignedTo) {
    try {
      const salesRep = assignmentResult?.salesRep || await User.findById(lead.assignedTo).select('name email').lean();
      const assignedBy = isManualMode && req.body.assignedBy ? await User.findById(req.body.assignedBy).select('name').lean() : null;

      if (salesRep && salesRep.email) {
        logger.info(`Sending lead assignment email to ${salesRep.email} for new lead ${lead._id}`);

        emailService
          .sendLeadAssignmentEmail({
            salesRep,
            lead: lead.toObject(),
            assignedBy,
            assignmentMode: lead.assignmentMode || (isManualMode ? 'manual' : 'auto'),
          })
          .then(() => {
            logger.info(`✅ Lead assignment email sent successfully to ${salesRep.email}`);
          })
          .catch((err) => {
            logger.error(`❌ Failed to send lead assignment email to ${salesRep.email}: ${err.message}`);
            logger.error(`Email error details:`, err);
          });
      } else {
        logger.warn(`⚠️  Cannot send assignment email: sales rep ${lead.assignedTo} has no email address`);
      }
    } catch (error) {
      logger.error(`Error preparing lead assignment email: ${error.message}`);
      logger.error(`Error stack:`, error.stack);
      // Don't block the response if email fails
    }
  }

  res.status(201).json({
    success: true,
    data: lead,
  });
});

// @desc    Get all leads with filtering, searching, pagination
// @route   GET /api/v1/leads
// @access  Private (Admin, SalesRep)
export const getLeads = asyncHandler(async (req, res, next) => {
  // Build base query - filter by assignedTo for sales reps
  let baseQuery = Lead.find();

  // If user is a sales rep, only show leads assigned to them
  if (req.user.role === 'salesRep') {
    baseQuery = baseQuery.where('assignedTo').equals(req.user._id);
  }
  // Admin can see all leads (no filter)

  // Select only necessary fields for list view
  // Exclude heavy arrays and descriptions that aren't needed in the table
  const excludedFields = '-communicationLogs -statusHistory -itineraryVersions -remarks -__v';

  const features = new APIFeatures(
    baseQuery
      .select(excludedFields)
      .populate('assignedTo', 'name email role')
      // Removed .populate('currentItinerary') as it's huge and not used in list view
      .populate('package', 'name customizedForLead originalPackage customizedBy')
      .populate('customizedPackage', 'name originalPackage customizedForLead')
      .populate('manualItinerary', 'days'),
    req.query,
  );

  // Search in specific fields
  features.search(['name', 'email', 'phone', 'city', 'destination', 'salesRep', 'adviser']);

  // Filter
  features.filter();

  // Sort
  features.sort();

  // Paginate
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  features.paginate();

  // Execute query with lean() for better performance
  const leads = await features.query.lean();

  // Get pagination metadata - apply same filter for count
  let countQuery = Lead.find();
  if (req.user.role === 'salesRep') {
    countQuery = countQuery.where('assignedTo').equals(req.user._id);
  }
  const queryCopy = { ...req.query };
  const featuresForCount = new APIFeatures(countQuery, queryCopy);
  featuresForCount.search(['name', 'email', 'phone', 'city', 'destination', 'salesRep', 'adviser']);
  featuresForCount.filter();
  const totalQuery = featuresForCount.query;
  const pagination = await getPaginationData(Lead, totalQuery, page, limit);

  res.status(200).json({
    success: true,
    data: leads,
    pagination,
  });
});

// @desc    Get single lead by ID
// @route   GET /api/v1/leads/:id
// @access  Private (Admin, SalesRep)
export const getLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id)
    .populate('assignedTo', 'name email role')
    .populate('assignedBy', 'name email')
    .populate('currentItinerary')
    .populate('package', 'name destination duration price customizedForLead originalPackage customizedBy customizationNotes')
    .populate('customizedPackage', 'name originalPackage customizedForLead')
    .populate('manualItinerary', 'days')
    .populate('remarks.addedBy', 'name email');

  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }

  // Check permissions - sales rep can only access leads assigned to them
  // Admins/SuperAdmins with manage_leads permission can access any lead
  const canManageLeads =
    req.user.role === 'superAdmin' ||
    req.user.role === 'admin' ||
    (req.user.permissions && req.user.permissions.includes('manage_leads'));

  if (!canManageLeads && req.user.role === 'salesRep' && lead.assignedTo?.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to access this lead', 403);
  }

  res.status(200).json({
    success: true,
    data: lead,
  });
});

// @desc    Update lead
// @route   PUT /api/v1/leads/:id
// @access  Private (Admin, SalesRep - assigned leads only)
export const updateLead = asyncHandler(async (req, res, next) => {
  let lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }

  // If user is a sales rep, prevent them from changing assignedTo
  if (req.user.role === 'salesRep' && req.body.assignedTo !== undefined) {
    // Only allow if they're trying to keep the same assignment or assign to themselves
    const currentAssignment = lead.assignedTo?.toString() || lead.assignedTo;
    const newAssignment = req.body.assignedTo?.toString() || req.body.assignedTo;
    const userId = req.user._id.toString();

    // If trying to change assignment and it's not to themselves, prevent it
    if (newAssignment && newAssignment !== currentAssignment && newAssignment !== userId) {
      throw new AppError('Sales representatives cannot change lead assignment', 403);
    }

    // If trying to assign to themselves, allow it
    if (newAssignment === userId) {
      req.body.assignedTo = req.user._id;
      const rep = await User.findById(req.user._id).select('name');
      if (rep) {
        req.body.salesRep = rep.name;
      }
    } else {
      // Keep the original assignment
      delete req.body.assignedTo;
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'numberOfTravelers')) {
    const travelerCount = parseTravelerCount(req.body.numberOfTravelers, null);
    if (travelerCount === null) {
      delete req.body.numberOfTravelers;
    } else {
      req.body.numberOfTravelers = travelerCount;
    }
  }

  // Check if status changed and add to history
  if (req.body.status && req.body.status !== lead.status) {
    if (!lead.statusHistory) {
      lead.statusHistory = [];
    }
    lead.statusHistory.push({
      status: req.body.status,
      changedBy: req.user._id,
      notes: req.body.statusChangeNotes || 'Status updated',
    });
  }

  // If package is being updated, populate packageName
  if (req.body.package !== undefined) {
    if (req.body.package) {
      const Package = (await import('../models/package.model.js')).default;
      const pkg = await Package.findById(req.body.package).select('name');
      if (pkg) {
        req.body.packageName = pkg.name;
      } else {
        req.body.packageName = null;
      }
    } else {
      req.body.packageName = null;
    }
  }

  // If customizedPackage is being updated, populate packageName
  if (req.body.customizedPackage !== undefined) {
    if (req.body.customizedPackage) {
      const CustomizedPackage = (await import('../models/customizedPackage.model.js')).default;
      const customPkg = await CustomizedPackage.findById(req.body.customizedPackage).select('name');
      if (customPkg) {
        req.body.packageName = customPkg.name;
      } else {
        req.body.packageName = null;
      }
    } else if (!req.body.package) {
      req.body.packageName = null;
    }
  }

  // Validate endDate >= travelDate if both are provided
  const travelDateToCheck = req.body.travelDate !== undefined ? req.body.travelDate : lead.travelDate;
  const endDateToCheck = req.body.endDate !== undefined ? req.body.endDate : lead.endDate;

  if (travelDateToCheck && endDateToCheck) {
    const travelDate = new Date(travelDateToCheck);
    const endDate = new Date(endDateToCheck);
    if (endDate < travelDate) {
      return next(new AppError('End date must be greater than or equal to travel date', 400));
    }
  }

  // Check permissions - allow update if:
  // 1. SuperAdmin (has all permissions)
  // 2. Admin with manage_leads permission
  // 3. Regular admin role
  // 4. Sales rep assigned to the lead
  const canManageLeads =
    req.user.role === 'superAdmin' ||
    req.user.role === 'admin' ||
    (req.user.permissions && req.user.permissions.includes('manage_leads'));

  if (!canManageLeads && lead.assignedTo?.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to update this lead', 403);
  }

  // Track assignment change before update
  const previousAssignedTo = lead.assignedTo?.toString() || null;
  const newAssignedTo = req.body.assignedTo ? req.body.assignedTo.toString() : null;

  logger.info(`Update lead assignment check: previousAssignedTo=${previousAssignedTo}, newAssignedTo=${newAssignedTo}, leadId=${lead._id}`);

  // Update salesRep name if assignedTo is being changed
  if (req.body.assignedTo !== undefined && req.body.assignedTo !== null && req.body.assignedTo !== '') {
    const rep = await User.findById(req.body.assignedTo).select('name email').lean();
    if (rep) {
      req.body.salesRep = rep.name;
      logger.info(`Found sales rep for assignment: ${rep.name} (${rep.email})`);
    } else {
      logger.warn(`⚠️  Sales rep ${req.body.assignedTo} not found`);
    }
    if (!req.body.assignedBy && req.user.role === 'admin') {
      req.body.assignedBy = req.user._id;
    }
    if (!req.body.assignmentMode) {
      req.body.assignmentMode = 'manual';
    }
  } else if (req.body.assignedTo === null || req.body.assignedTo === '') {
    // Unassigning - clear sales rep
    req.body.salesRep = undefined;
    logger.info(`Unassigning lead ${lead._id} from sales rep`);
  }

  lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('assignedTo', 'name email role')
    .populate('currentItinerary');

  // Send assignment email notification if a new sales rep was assigned (different from previous)
  if (newAssignedTo && newAssignedTo !== previousAssignedTo) {
    try {
      const salesRep = await User.findById(newAssignedTo).select('name email').lean();
      logger.info(`Assignment email check: salesRep=${salesRep?._id}, email=${salesRep?.email}`);

      if (salesRep && salesRep.email) {
        const assignedBy = req.body.assignedBy ? await User.findById(req.body.assignedBy).select('name').lean() : null;
        logger.info(`📧 Sending lead assignment email to ${salesRep.email} for lead ${lead._id} (via update)`);

        emailService
          .sendLeadAssignmentEmail({
            salesRep,
            lead: lead.toObject(),
            assignedBy,
            assignmentMode: lead.assignmentMode || 'manual',
          })
          .then(() => {
            logger.info(`✅ Lead assignment email sent successfully to ${salesRep.email} for lead ${lead._id}`);
          })
          .catch((err) => {
            logger.error(`❌ Failed to send lead assignment email to ${salesRep.email}: ${err.message}`);
            logger.error(`Email error details:`, err);
            if (err.stack) {
              logger.error(`Error stack:`, err.stack);
            }
          });
      } else {
        logger.warn(`⚠️  Cannot send assignment email: sales rep ${newAssignedTo} has no email address (found: ${!!salesRep})`);
      }
    } catch (error) {
      logger.error(`Error preparing lead assignment email: ${error.message}`);
      logger.error(`Error stack:`, error.stack);
      // Don't block the response if email fails
    }
  } else {
    if (!newAssignedTo) {
      logger.info(`ℹ️  Email not sent: No assignedTo in update request`);
    } else if (newAssignedTo === previousAssignedTo) {
      logger.info(`ℹ️  Email not sent: Lead already assigned to the same sales rep (${newAssignedTo})`);
    }
  }

  res.status(200).json({
    success: true,
    data: lead,
  });
});

// @desc    Delete lead
// @route   DELETE /api/v1/leads/:id
// @access  Private (Admin only)
export const deleteLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }

  await lead.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Add remark to lead
// @route   POST /api/v1/leads/:id/remarks
// @access  Private (Admin, SalesRep)
export const addRemark = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }

  const remark = {
    text: req.body.text,
    date: req.body.date || new Date(),
    addedBy: req.user._id,
  };

  lead.remarks.push(remark);
  await lead.save();

  res.status(200).json({
    success: true,
    data: lead.remarks,
  });
});

// @desc    Get lead remarks (last 3 or all)
// @route   GET /api/v1/leads/:id/remarks
// @access  Private (Admin, SalesRep)
export const getLeadRemarks = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }

  let remarks = lead.remarks;

  // Get last 3 remarks if limit is not specified
  if (!req.query.all && remarks.length > 3) {
    remarks = remarks.slice(-3).reverse();
  }

  res.status(200).json({
    success: true,
    data: remarks,
  });
});

// @desc    Assign lead to user
// @route   PATCH /api/v1/leads/:id/assign
// @access  Private (Admin)
export const assignLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }

  const previousAssignedTo = lead.assignedTo?.toString();
  const newAssignedTo = req.body.assignedTo?.toString();

  // Check if assigning to a new sales rep (different from current)
  if (!req.body.assignedTo) {
    // Unassigning - clear assignment
    lead.assignedTo = undefined;
    lead.assignedBy = req.user._id;
    lead.assignmentMode = 'manual';
    lead.salesRep = undefined;
  } else {
    // Assigning to a sales rep
    lead.assignedTo = req.body.assignedTo;
    lead.assignedBy = req.user._id;
    lead.assignmentMode = 'manual';

    // Get sales rep details for email and UI
    const rep = await User.findById(req.body.assignedTo).select('name email').lean();
    if (rep) {
      lead.salesRep = rep.name;

      await lead.save();
      const updatedLead = await Lead.findById(req.params.id).populate('assignedTo', 'name email role');

      // Send assignment email notification if a new sales rep was assigned (different from previous)
      logger.info(`Assignment check: newAssignedTo=${newAssignedTo}, previousAssignedTo=${previousAssignedTo}, rep=${rep?._id}, repEmail=${rep?.email}`);

      if (newAssignedTo && newAssignedTo !== previousAssignedTo && rep && rep.email) {
        try {
          const assignedBy = await User.findById(req.user._id).select('name').lean();
          logger.info(`📧 Sending lead assignment email to ${rep.email} for lead ${lead._id} (manually assigned)`);

          emailService
            .sendLeadAssignmentEmail({
              salesRep: rep,
              lead: updatedLead.toObject(),
              assignedBy,
              assignmentMode: 'manual',
            })
            .then(() => {
              logger.info(`✅ Lead assignment email sent successfully to ${rep.email} for lead ${lead._id}`);
            })
            .catch((err) => {
              logger.error(`❌ Failed to send lead assignment email to ${rep.email}: ${err.message}`);
              logger.error(`Email error details:`, err);
              if (err.stack) {
                logger.error(`Error stack:`, err.stack);
              }
            });
        } catch (error) {
          logger.error(`Error preparing lead assignment email: ${error.message}`);
          logger.error(`Error stack:`, error.stack);
          // Don't block the response if email fails
        }
      } else {
        if (!newAssignedTo) {
          logger.warn(`⚠️  Email not sent: No assignedTo provided in request`);
        } else if (newAssignedTo === previousAssignedTo) {
          logger.info(`ℹ️  Email not sent: Lead already assigned to the same sales rep (${newAssignedTo})`);
        } else if (!rep) {
          logger.warn(`⚠️  Email not sent: Sales rep ${newAssignedTo} not found`);
        } else if (!rep.email) {
          logger.warn(`⚠️  Email not sent: Sales rep ${rep.name} (${newAssignedTo}) has no email address`);
        }
      }

      res.status(200).json({
        success: true,
        data: updatedLead,
      });
      return;
    }
  }

  await lead.save();

  const updatedLead = await Lead.findById(req.params.id).populate('assignedTo', 'name email role');

  res.status(200).json({
    success: true,
    data: updatedLead,
  });
});

// @desc    Unassign lead
// @route   PATCH /api/v1/leads/:id/unassign
// @access  Private (Admin)
export const unassignLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }

  lead.assignedTo = null;
  lead.salesRep = undefined;
  lead.assignedBy = req.user._id;

  await lead.save();

  const updatedLead = await Lead.findById(req.params.id).populate('assignedTo', 'name email role');
  res.status(200).json({
    success: true,
    data: updatedLead,
  });
});

// @desc    Get leads by status
// @route   GET /api/v1/leads/status/:status
// @access  Private (Admin, SalesRep)
export const getLeadsByStatus = asyncHandler(async (req, res, next) => {
  const leads = await Lead.find({ status: req.params.status })
    .populate('assignedTo', 'name email role')
    .populate('package', 'name')
    .populate('customizedPackage', 'name')
    .populate('manualItinerary', 'days')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: leads.length,
    data: leads,
  });
});

// @desc    Get leads assigned to current user
// @route   GET /api/v1/leads/my-leads
// @access  Private (SalesRep)
export const getMyLeads = asyncHandler(async (req, res, next) => {
  const leads = await Lead.find({ assignedTo: req.user._id })
    .populate('assignedTo', 'name email role')
    .populate('currentItinerary')
    .populate('package', 'name')
    .populate('customizedPackage', 'name')
    .populate('manualItinerary', 'days')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: leads.length,
    data: leads,
  });
});

// @desc    Get lead statistics
// @route   GET /api/v1/leads/stats
// @access  Private (Admin, SalesRep)
export const getLeadStats = asyncHandler(async (req, res, next) => {
  const matchStage = {};
  if (req.user.role === 'salesRep') {
    matchStage.assignedTo = req.user._id;
  }

  const [statusStats, assignmentStats] = await Promise.all([
    Lead.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]),
    Lead.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          assigned: {
            $sum: {
              $cond: [
                { $or: [{ $ifNull: ['$assignedTo', false] }, { $ifNull: ['$salesRep', false] }] },
                1,
                0,
              ],
            },
          },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const assignment = assignmentStats[0] || { total: 0, assigned: 0, converted: 0 };

  res.status(200).json({
    success: true,
    data: statusStats,
    summary: {
      total: assignment.total,
      assigned: assignment.assigned,
      unassigned: assignment.total - assignment.assigned,
      converted: assignment.converted,
      conversionRate: assignment.total > 0 ? ((assignment.converted / assignment.total) * 100).toFixed(1) : "0.0"
    }
  });
});

// @desc    Search leads
// @route   GET /api/v1/leads/search
// @access  Private (Admin, SalesRep)
export const searchLeads = asyncHandler(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    throw new AppError('Search query is required', 400);
  }

  const leads = await Lead.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
      { city: { $regex: query, $options: 'i' } },
      { destination: { $regex: query, $options: 'i' } },
    ],
  })
    .populate('assignedTo', 'name email role')
    .populate('package', 'name')
    .populate('customizedPackage', 'name')
    .populate('manualItinerary', 'days')
    .limit(20);

  res.status(200).json({
    success: true,
    count: leads.length,
    data: leads,
  });
});

// @desc    Set or replace a lead's current itinerary (day-by-day)
// @route   PUT /api/v1/leads/:id/itinerary
// @access  Private (Admin, SalesRep)
export const setLeadItinerary = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }

  // Basic normalization of incoming days
  const daysInput = Array.isArray(req.body.days) ? req.body.days : [];
  const days = daysInput.map((d, idx) => ({
    dayNumber: d.dayNumber || idx + 1,
    title: d.title || `Day ${idx + 1}`,
    description: (d.description && String(d.description).trim()) || (d.title ? String(d.title) : `Day ${idx + 1} plan`),
    locations: d.locations || (d.destination ? [d.destination] : []),
    activities: d.activities || [],
    accommodation: d.accommodation || (d.hotel ? { name: d.hotel } : {}),
    meals: d.meals || {},
    transport: d.transport || undefined,
    places: d.places || [],
    images: d.images || [],
    notes: d.notes || '',
  }));

  let itinerary;
  if (lead.currentItinerary) {
    // Update existing itinerary in place
    itinerary = await Itinerary.findById(lead.currentItinerary);
    if (itinerary) {
      itinerary.days = days;
      itinerary.status = itinerary.status || 'draft';
      itinerary.metadata = {
        ...(itinerary.metadata || {}),
        lastModifiedBy: req.user._id,
      };
      await itinerary.save();
      return res.status(200).json({ success: true, data: itinerary });
    }
    // Fallback: if the referenced itinerary is missing, create a fresh one
  }

  // Create new itinerary (first time)
  itinerary = await Itinerary.create({
    package: new mongoose.Types.ObjectId(),
    days,
    status: 'draft',
    createdBy: req.user._id,
  });

  lead.currentItinerary = itinerary._id;
  if (!lead.itineraryVersions) lead.itineraryVersions = [];
  lead.itineraryVersions.push(itinerary._id);
  await lead.save();

  res.status(200).json({ success: true, data: itinerary });
});

// @desc    Create lead from website contact form (public endpoint)
// @route   POST /api/v1/leads/website-contact
// @access  Public (No authentication required)
export const createWebsiteContactLead = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    subject,
    message,
    travelDate,
    destination,
    destinationCountry,
    locations,
  } = req.body || {};

  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  if (!name || !name.trim()) {
    return next(new AppError('Name is required', 400));
  }

  if (!subject || !subject.trim()) {
    return next(new AppError('Subject is required', 400));
  }

  if (!message || !message.trim()) {
    return next(new AppError('Message is required', 400));
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  const sanitizedName = String(name).trim();

  // Normalize phone number (remove non-digits)
  const normalizePhone = (phoneNum) => {
    if (!phoneNum) return undefined;
    const digits = String(phoneNum).replace(/\D/g, '');
    if (digits.length >= 10) {
      return digits;
    }
    return undefined;
  };

  const normalizedPhone = normalizePhone(phone);

  // Parse travel date if provided
  const parsedTravelDate = travelDate ? new Date(travelDate) : null;
  if (travelDate && (!parsedTravelDate || Number.isNaN(parsedTravelDate.getTime()))) {
    return next(new AppError('Invalid travel date format', 400));
  }

  // Find or create user
  let user = await User.findOne({ email: sanitizedEmail });
  if (!user) {
    const crypto = await import('crypto');
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

  // Prepare lead payload - only include fields that are provided
  const leadPayload = {
    name: sanitizedName,
    email: sanitizedEmail,
    phone: normalizedPhone || undefined,
    whatsapp: normalizedPhone || undefined,
    source: 'website',
    platform: 'Website Form', // Must match enum values in lead model
    destination: destination?.trim() || undefined,
    destinationCountry: destinationCountry?.trim() || undefined,
    travelDate: parsedTravelDate || undefined,
    numberOfTravelers: undefined, // Not collected in contact form
    budget: undefined, // Not collected in contact form
    message: message?.trim() || (locations?.trim() ? `Locations: ${locations.trim()}` : undefined),
    status: 'new',
    tags: ['website-contact-form'],
  };

  // Add remarks with subject, message, and locations
  const remarkText = [
    `Contact Form: ${subject.trim()}`,
    message?.trim() ? `Message: ${message.trim()}` : '',
    locations?.trim() ? `Locations: ${locations.trim()}` : '',
  ].filter(Boolean).join(' | ');

  leadPayload.remarks = [
    {
      text: remarkText,
      date: new Date(),
      addedBy: null,
    },
  ];

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
    // Log warning but don't fail the lead creation
    console.warn(`Sales rep auto-assignment failed for website contact lead: ${assignmentError.message}`);
  }

  // Create lead
  const lead = await Lead.create(leadPayload);

  res.status(201).json({
    success: true,
    message: 'Contact form submitted successfully',
    data: {
      leadId: lead._id,
      salesRepId: assignedSalesRepId || null,
    },
  });
});

// @desc    Get a lead's current itinerary
// @route   GET /api/v1/leads/:id/itinerary
// @access  Private (Admin, SalesRep)
export const getLeadItinerary = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }
  if (!lead.currentItinerary) {
    return res.status(200).json({ success: true, data: null });
  }
  const itinerary = await Itinerary.findById(lead.currentItinerary);
  res.status(200).json({ success: true, data: itinerary });
});

// @desc    Download current itinerary as PDF
// @route   GET /api/v1/leads/:id/itinerary/pdf
// @access  Private (Admin, SalesRep)
export const downloadLeadItineraryPDF = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new AppError(`Lead not found with id of ${req.params.id}`, 404);
  }
  if (!lead.currentItinerary) {
    throw new AppError('No itinerary found for this lead', 404);
  }
  const itinerary = await Itinerary.findById(lead.currentItinerary);
  if (!itinerary) {
    throw new AppError('Itinerary not found', 404);
  }

  // Minimal package meta for PDF header (since we may not have a package)
  const packageMeta = {
    name: lead.destination || 'Custom Itinerary',
    duration: itinerary.days?.length || 0,
    destination: (itinerary.days?.[0]?.locations?.[0]) || (lead.city || ''),
    price: 0,
    inclusions: [],
    exclusions: [],
  };

  const filePath = await generateLeadItineraryPDF(lead, itinerary);
  return res.download(filePath, (err) => {
    if (err) {
      throw new AppError('Failed to download PDF', 500);
    }
  });
});

export default {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  addRemark,
  getLeadRemarks,
  assignLead,
  unassignLead,
  getLeadsByStatus,
  getMyLeads,
  getLeadStats,
  searchLeads,
  setLeadItinerary,
  getLeadItinerary,
  downloadLeadItineraryPDF,
  createWebsiteContactLead,
};
