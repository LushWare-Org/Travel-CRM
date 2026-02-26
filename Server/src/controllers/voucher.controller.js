import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Voucher from '../models/voucher.model.js';
import Lead from '../models/lead.model.js';
import Package from '../models/package.model.js';
import CustomizedPackage from '../models/customizedPackage.model.js';
import Itinerary from '../models/itinerary.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import emailService from '../utils/emailService.js';
import { generateVoucherPDF } from '../utils/voucherPDFGenerator.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * @desc    Get all vouchers
 * @route   GET /api/v1/billing/vouchers
 * @access  Private
 */
export const getAllVouchers = asyncHandler(async (req, res) => {
  // Build base query - filter by lead assignedTo for sales reps
  let baseQuery = Voucher.find();

  // If user is a sales rep, only show vouchers for leads assigned to them
  if (req.user.role === 'salesRep') {
    const assignedLeadIds = await Lead.find({ assignedTo: req.user._id }).select('_id').lean();
    const leadIds = assignedLeadIds.map((lead) => lead._id);
    baseQuery = baseQuery.where('lead').in(leadIds);
  }

  const features = new APIFeatures(
    baseQuery
      .populate('lead', 'name email phone status')
      .populate('package', 'name destination duration price')
      .populate('customizedPackage', 'name destination duration price')
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
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      features.query = features.query.and({ createdAt: dateFilter });
    }
  }

  const vouchers = await features.query;

  // Get total count with same filter
  let countQuery = Voucher.find();
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
      countQuery = countQuery.find({ createdAt: dateFilter });
    }
  }

  const total = await countQuery.countDocuments();

  res.status(200).json({
    success: true,
    count: vouchers.length,
    total,
    data: vouchers,
  });
});

/**
 * @desc    Get voucher by ID
 * @route   GET /api/v1/billing/vouchers/:id
 * @access  Private
 */
export const getVoucherById = asyncHandler(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id)
    .populate('lead', 'name email phone status assignedTo whatsapp')
    .populate('package', 'name description destination duration price category inclusions exclusions highlights')
    .populate('customizedPackage', 'name description destination duration price category inclusions exclusions highlights')
    .populate('createdBy', 'name email');

  if (!voucher) {
    return next(new AppError('Voucher not found', 404));
  }

  // Check permissions - sales rep can only access vouchers for leads assigned to them
  if (req.user.role === 'salesRep' && voucher.lead?.assignedTo?.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this voucher', 403));
  }

  res.status(200).json({
    success: true,
    data: voucher,
  });
});

/**
 * @desc    Get vouchers by lead ID
 * @route   GET /api/v1/billing/vouchers/lead/:leadId
 * @access  Private
 */
export const getVouchersByLeadId = asyncHandler(async (req, res, next) => {
  // Check permissions - sales rep can only access vouchers for leads assigned to them
  if (req.user.role === 'salesRep') {
    const lead = await Lead.findById(req.params.leadId).select('assignedTo');
    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }
    if (lead.assignedTo?.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access vouchers for this lead', 403));
    }
  }

  const vouchers = await Voucher.find({ lead: req.params.leadId })
    .populate('package', 'name destination')
    .populate('customizedPackage', 'name destination')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: vouchers.length,
    data: vouchers,
  });
});

/**
 * @desc    Create voucher
 * @route   POST /api/v1/billing/vouchers
 * @access  Private (Admin, SalesRep)
 */
export const createVoucher = asyncHandler(async (req, res, next) => {
  // Verify lead exists
  const lead = await Lead.findById(req.body.lead);
  if (!lead) {
    return next(new AppError('Lead not found', 404));
  }

  // Auto-populate customer info from lead
  if (!req.body.customer) {
    req.body.customer = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
    };
  }

  // Clean up empty package fields before processing
  if (req.body.package === '' || req.body.package === null) {
    delete req.body.package;
  }
  if (req.body.customizedPackage === '' || req.body.customizedPackage === null) {
    delete req.body.customizedPackage;
  }

  // Clean up empty package fields before processing
  if (req.body.package === '' || req.body.package === null || req.body.package === undefined) {
    delete req.body.package;
  }
  if (req.body.customizedPackage === '' || req.body.customizedPackage === null || req.body.customizedPackage === undefined) {
    delete req.body.customizedPackage;
  }

  // Get package data if package or customizedPackage is provided
  let packageData = null;
  let itineraryData = null;
  let quotationData = null;
  let shouldExtractFromBackend = false;

  if (req.body.package) {
    packageData = await Package.findById(req.body.package);
    if (packageData && packageData.itinerary) {
      itineraryData = await Itinerary.findById(packageData.itinerary);
    }
    shouldExtractFromBackend = true; // Always extract for packages
  } else if (req.body.customizedPackage) {
    packageData = await CustomizedPackage.findById(req.body.customizedPackage);
    if (packageData && packageData.itinerary) {
      itineraryData = await Itinerary.findById(packageData.itinerary);
    }
    shouldExtractFromBackend = true; // Always extract for customized packages
  } else {
    // MANUAL ITINERARY: Check if frontend already provided the data
    const hasFrontendData = req.body.packageDetails?.name
      && req.body.mealPlans?.length > 0
      && req.body.itinerarySummary?.length > 0;

    if (!hasFrontendData) {
      // Frontend didn't provide complete data, try to extract from quotations
      const Quotation = (await import('../models/quotation.model.js')).default;
      const quotations = await Quotation.find({ lead: req.body.lead }).sort({ createdAt: -1 }).limit(1);

      if (quotations && quotations.length > 0) {
        quotationData = quotations[0];

        // Try to get itinerary from quotation
        if (quotationData.itinerary) {
          itineraryData = await Itinerary.findById(quotationData.itinerary);
        }

        // If no itinerary on quotation, check lead directly
        if (!itineraryData && lead.itinerary) {
          itineraryData = await Itinerary.findById(lead.itinerary);
        }

        // Populate packageDetails from quotation
        if (!req.body.packageDetails || !req.body.packageDetails.name) {
          req.body.packageDetails = {
            name: quotationData.package?.name || 'Manual Itinerary',
            destination: lead.destination || 'Custom Destination',
            duration: itineraryData?.days?.length || 0,
            category: 'Custom',
            price: quotationData.totalAmount || 0,
            inclusions: quotationData.includedServices || [],
            exclusions: quotationData.excludedServices || [],
            highlights: [],
            coverImage: quotationData.coverImage ? { url: quotationData.coverImage } : null,
            images: (quotationData.images || []).map((img) => ({
              url: img.url,
              isCover: img.isCover || false,
            })),
          };
        }

        shouldExtractFromBackend = true; // Extract meal plans and itinerary from backend
      }
    }
    // If frontend provided data, we'll use it as-is (shouldExtractFromBackend remains false)
  }

  // Extract package details from package (if exists) - this overrides any manual data
  if (packageData) {
    req.body.packageDetails = {
      name: packageData.name,
      destination: packageData.destination,
      duration: packageData.duration,
      category: packageData.category,
      price: packageData.price,
      inclusions: packageData.inclusions || [],
      exclusions: packageData.exclusions || [],
      highlights: packageData.highlights || [],
      // Snapshot images for consistency
      coverImage: packageData.coverImage || null,
      images: packageData.images || [],
    };
  }

  // Extract meal plans from itinerary ONLY if we should extract from backend
  if (shouldExtractFromBackend && itineraryData && itineraryData.days) {
    req.body.mealPlans = itineraryData.days.map((day) => ({
      dayNumber: day.dayNumber,
      dayTitle: day.title,
      breakfast: day.meals?.breakfast || false,
      lunch: day.meals?.lunch || false,
      dinner: day.meals?.dinner || false,
    }));
  }

  // Extract itinerary summary ONLY if we should extract from backend
  if (shouldExtractFromBackend && itineraryData && itineraryData.days) {
    req.body.itinerarySummary = itineraryData.days.map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title || '',
      locations: day.locations || [],
      activities: day.activities || [],
      accommodation: day.accommodation && typeof day.accommodation === 'object'
        ? {
          name: day.accommodation.name || '',
          type: day.accommodation.type || '',
        }
        : {
          name: '',
          type: '',
        },
    }));
  }

  // Ensure itinerarySummary accommodation is properly formatted if provided from frontend
  if (req.body.itinerarySummary && Array.isArray(req.body.itinerarySummary)) {
    req.body.itinerarySummary = req.body.itinerarySummary.map((day) => ({
      dayNumber: day.dayNumber || 0,
      title: String(day.title || ''),
      locations: Array.isArray(day.locations) ? day.locations.map((loc) => String(loc)) : [],
      activities: Array.isArray(day.activities) ? day.activities.map((act) => String(act)) : [],
      accommodation: day.accommodation && typeof day.accommodation === 'object' && !Array.isArray(day.accommodation)
        ? {
          name: String(day.accommodation.name || ''),
          type: String(day.accommodation.type || ''),
        }
        : {
          name: '',
          type: '',
        },
    }));
  }

  req.body.createdBy = req.user._id;

  const voucher = await Voucher.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Voucher created successfully',
    data: voucher,
  });
});

/**
 * @desc    Update voucher
 * @route   PUT /api/v1/billing/vouchers/:id
 * @access  Private (Admin, SalesRep)
 */
export const updateVoucher = asyncHandler(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id);

  if (!voucher) {
    return next(new AppError('Voucher not found', 404));
  }

  // Check permissions
  if (req.user.role === 'salesRep' && voucher.lead?.assignedTo?.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this voucher', 403));
  }

  // Update voucher
  const updatedVoucher = await Voucher.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      lastModifiedBy: req.user._id,
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate('lead', 'name email phone')
    .populate('package', 'name destination')
    .populate('customizedPackage', 'name destination')
    .populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Voucher updated successfully',
    data: updatedVoucher,
  });
});

/**
 * @desc    Delete voucher
 * @route   DELETE /api/v1/billing/vouchers/:id
 * @access  Private (Admin only)
 */
export const deleteVoucher = asyncHandler(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id);

  if (!voucher) {
    return next(new AppError('Voucher not found', 404));
  }

  // Delete PDF if exists
  if (voucher.pdfUrl) {
    const pdfPath = path.join(dirname, '../../', voucher.pdfUrl);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  }

  await Voucher.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Voucher deleted successfully',
  });
});

/**
 * @desc    Generate and download voucher PDF
 * @route   GET /api/v1/billing/vouchers/:id/pdf
 * @access  Private
 */
export const downloadVoucherPDF = asyncHandler(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id)
    .populate('lead', 'name email phone address assignedTo')
    .populate('package', 'name description destination duration price category inclusions exclusions highlights coverImage images')
    .populate('customizedPackage', 'name description destination duration price category inclusions exclusions highlights coverImage images')
    .populate('createdBy', 'name email');

  if (!voucher) {
    return next(new AppError('Voucher not found', 404));
  }

  // Check permissions - FIXED: Now lead.assignedTo is populated
  if (req.user.role === 'salesRep' && voucher.lead?.assignedTo?.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this voucher', 403));
  }

  try {
    const pdfBuffer = await generateVoucherPDF(voucher, voucher.lead);

    // Save PDF URL to voucher if not already saved
    if (!voucher.pdfUrl) {
      const fileName = `voucher-${voucher.voucherNumber || voucher._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
      voucher.pdfUrl = `uploads/billing/${fileName}`;
      await voucher.save();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=voucher-${voucher.voucherNumber || voucher._id}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating voucher PDF:', error);
    return next(new AppError('Failed to generate voucher PDF', 500));
  }
});

/**
 * @desc    Send voucher via email
 * @route   POST /api/v1/billing/vouchers/:id/send
 * @access  Private (Admin, SalesRep)
 */
export const sendVoucherEmail = asyncHandler(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id)
    .populate('lead', 'name email phone address assignedTo')
    .populate('package', 'name description destination duration price category inclusions exclusions highlights coverImage images')
    .populate('customizedPackage', 'name description destination duration price category inclusions exclusions highlights coverImage images');

  if (!voucher) {
    return next(new AppError('Voucher not found', 404));
  }

  // Check permissions - FIXED: Now lead.assignedTo is populated
  if (req.user.role === 'salesRep' && voucher.lead?.assignedTo?.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to send this voucher', 403));
  }

  const email = req.body.email || voucher.customer?.email || voucher.lead?.email;

  if (!email) {
    return next(new AppError('Email address is required', 400));
  }

  try {
    // Generate PDF if not exists
    let pdfBuffer;
    if (voucher.pdfUrl) {
      const pdfPath = path.join(dirname, '../../', voucher.pdfUrl);
      if (fs.existsSync(pdfPath)) {
        pdfBuffer = fs.readFileSync(pdfPath);
      }
    }

    if (!pdfBuffer) {
      pdfBuffer = await generateVoucherPDF(voucher, voucher.lead);
      // Save PDF
      const fileName = `voucher-${voucher.voucherNumber || voucher._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
      voucher.pdfUrl = `uploads/billing/${fileName}`;
    }

    // Send email
    const packageName = voucher.package?.name || voucher.customizedPackage?.name || 'Package';
    await emailService.sendVoucherEmail({
      to: email,
      voucherNumber: voucher.voucherNumber,
      customerName: voucher.customer?.name || voucher.lead?.name,
      packageName,
      pdfBuffer,
      fileName: `voucher-${voucher.voucherNumber || voucher._id}.pdf`,
    });

    // Update voucher
    voucher.emailSent = true;
    voucher.emailSentAt = new Date();
    voucher.status = voucher.status === 'draft' ? 'sent' : voucher.status;
    await voucher.save();

    res.status(200).json({
      success: true,
      message: 'Voucher sent via email successfully',
    });
  } catch (error) {
    console.error('Error sending voucher email:', error);
    return next(new AppError('Failed to send voucher email', 500));
  }
});

/**
 * @desc    Mark voucher as viewed
 * @route   POST /api/v1/billing/vouchers/:id/viewed
 * @access  Public (with token) or Private
 */
export const markVoucherViewed = asyncHandler(async (req, res) => {
  const voucher = await Voucher.findById(req.params.id);

  if (!voucher) {
    return res.status(404).json({
      success: false,
      message: 'Voucher not found',
    });
  }

  if (!voucher.viewedAt) {
    voucher.viewedAt = new Date();
    voucher.status = voucher.status === 'sent' ? 'viewed' : voucher.status;
    await voucher.save();
  }

  res.status(200).json({
    success: true,
    message: 'Voucher marked as viewed',
  });
});

/**
 * @desc    Confirm voucher
 * @route   POST /api/v1/billing/vouchers/:id/confirm
 * @access  Private
 */
export const confirmVoucher = asyncHandler(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id);

  if (!voucher) {
    return next(new AppError('Voucher not found', 404));
  }

  voucher.status = 'confirmed';
  voucher.confirmedAt = new Date();
  await voucher.save();

  res.status(200).json({
    success: true,
    message: 'Voucher confirmed successfully',
    data: voucher,
  });
});
