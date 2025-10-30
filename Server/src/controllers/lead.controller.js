import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import Lead from '../models/lead.model.js';
import { APIFeatures, getPaginationData } from '../utils/apiFeatures.js';

// @desc    Create a new lead
// @route   POST /api/v1/leads
// @access  Private (Admin, SalesRep)
export const createLead = asyncHandler(async (req, res, next) => {
  // Add user who created the lead
  req.body.createdBy = req.user._id;

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
    Lead.find().populate('assignedTo', 'name email role').populate('currentItinerary'),
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
    .limit(20);

  res.status(200).json({
    success: true,
    count: leads.length,
    data: leads,
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
};
