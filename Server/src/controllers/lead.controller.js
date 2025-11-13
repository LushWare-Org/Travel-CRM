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

  if (!isManualMode) {
    await assignSalesRepIfNeeded(req.body);
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

  const lead = await Lead.create(req.body);

  res.status(201).json({
    success: true,
    data: lead,
  });
});

// @desc    Get all leads with filtering, searching, pagination
// @route   GET /api/v1/leads
// @access  Private (Admin, SalesRep)
export const getLeads = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(
    Lead.find()
      .populate('assignedTo', 'name email role')
      .populate('currentItinerary')
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

  // Execute query
  const leads = await features.query;

  // Get pagination metadata
  const queryCopy = { ...req.query };
  const featuresForCount = new APIFeatures(Lead.find(), queryCopy);
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

  // Check permissions - allow update if admin or assigned to lead
  if (req.user.role !== 'admin' && lead.assignedTo?.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to update this lead', 403);
  }

  lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('assignedTo', 'name email role')
    .populate('currentItinerary');

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

  lead.assignedTo = req.body.assignedTo;
  lead.assignedBy = req.user._id;
  lead.assignmentMode = 'manual';
  // Mirror salesRep name for UI
  const rep = await User.findById(req.body.assignedTo).select('name');
  if (rep) {
    lead.salesRep = rep.name;
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
  lead.assignedBy = req.user._id;

  await lead.save();

  res.status(200).json({
    success: true,
    data: lead,
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
// @access  Private (Admin)
export const getLeadStats = asyncHandler(async (req, res, next) => {
  const stats = await Lead.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  res.status(200).json({
    success: true,
    data: stats,
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
};
