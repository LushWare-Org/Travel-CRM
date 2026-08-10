import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createLeadSchema, updateLeadSchema } from '../validators/lead.validator.js';
import {
  validateTransition,
  validateTravelerUpdate,
  validateTravelDatesUpdate,
} from '../services/state-machine.service.js';
import { gatekeeperInputs, loadPrimarySelection } from '../services/gatekeeper.service.js';
import { handleLeadEvent } from '../services/lead-events.service.js';
import { serializeLeadDays } from '../services/lead-itinerary.service.js';

// ─── Auto-assignment helper ────────────────────────────────────
async function autoAssignSalesRep(leadData) {
  const settings = await prisma.settings.findFirst();
  if (!settings || settings.assignmentMode === 'manual') return null;

  const enabledIds = settings.enabledSalesRepIds || [];
  if (!enabledIds.length) return null;

  if (settings.autoStrategy === 'round_robin') {
    const idx = settings.roundRobinIndex % enabledIds.length;
    const salesRepId = enabledIds[idx];
    await prisma.settings.updateMany({ data: { roundRobinIndex: idx + 1 } });
    return salesRepId;
  }
  return null;
}

// ─── Controllers ───────────────────────────────────────────────

export const createLead = asyncHandler(async (req, res) => {
  const { user } = req;

  const {
    package: _pkg, assignedTo: _assignedTo, salesRep: _salesRep,
    customizedPackage: _custPkg, convertedBooking: _booking, createdBy: _createdBy,
    ...cleanCreateBody
  } = req.body;

  const parsed = createLeadSchema.safeParse(cleanCreateBody);
  if (!parsed.success) {
    const messages = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new AppError(messages, 400);
  }
  const body = { ...parsed.data };

  if (user.role === 'salesRep') {
    body.assignedToId = body.assignedToId || user.id;
    body.assignmentMode = 'manual';
    body.assignedById = user.id;
  }

  let assignedId = body.assignedToId;
  if (!assignedId && user.role !== 'salesRep') {
    assignedId = await autoAssignSalesRep(body);
    if (assignedId) {
      body.assignedToId = assignedId;
      body.assignmentMode = 'auto';
    }
  }

  const remarksList = body.remarks || [];
  const lifecycleStatus = body.lifecycleStatus || 'NEW';
  const isManualItinerary = body.isManualItinerary || false;

  // A lead is created with at most one initial package selection — either
  // is optional (a bare contact-form-style lead may have neither yet).
  const initialSelection = isManualItinerary
    ? { isManual: true, packageId: null, packageName: null }
    : body.packageId
      ? { isManual: false, packageId: body.packageId, packageName: body.packageName || null }
      : null;

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        whatsapp: body.whatsapp,
        city: body.city,
        source: body.source,
        platform: body.platform,
        fromCountry: body.fromCountry,
        destinationCountry: body.destinationCountry,
        destination: body.destination,
        travelDate: body.travelDate ? new Date(body.travelDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        numberOfTravelers: body.numberOfTravelers,
        budget: body.budget,
        message: body.message,
        lifecycleStatus,
        priority: body.priority,
        assignedToId: body.assignedToId,
        tags: body.tags || [],
        lostReason: body.lostReason,
        remarks: {
          create: remarksList.map((r) => ({
            text: r.text,
            date: r.date ? new Date(r.date) : new Date(),
            addedById: r.addedBy || user.id || null,
          })),
        },
        statusHistory: {
          create: [{ status: lifecycleStatus, actor: 'USER', changedById: user.id, notes: 'Initial status' }],
        },
        ...(initialSelection ? { packageSelections: { create: [initialSelection] } } : {}),
      },
      include: { remarks: true, statusHistory: true, packageSelections: true },
    });

    if (created.packageSelections.length) {
      await tx.lead.update({
        where: { id: created.id },
        data: { primarySelectionId: created.packageSelections[0].id },
      });
    }

    return tx.lead.findUnique({
      where: { id: created.id },
      include: { remarks: true, statusHistory: true, packageSelections: true },
    });
  });

  res.status(201).json({ success: true, data: lead });
});

export const getLeads = asyncHandler(async (req, res) => {
  const { user } = req;
  const { page = 1, limit = 10, search, status, sortBy = 'createdAt', order = 'desc' } = req.query;

  const where = { AND: [] };
  if (user.role === 'salesRep') where.AND.push({ assignedToId: user.id });
  if (status) where.AND.push({ lifecycleStatus: status });

  if (search) {
    where.AND.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (where.AND.length === 0) delete where.AND;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: order },
      include: { packageSelections: { orderBy: { createdAt: 'asc' }, take: 1, include: { pricing: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ success: true, data: leads, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
});

export const getLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      packageSelections: {
        orderBy: { createdAt: 'asc' },
        include: {
          pricing: true,
          costLines: { orderBy: { orderIndex: 'asc' } },
          itineraryDays: {
            orderBy: { dayNumber: 'asc' },
            include: { places: true, activities: true, transports: true },
          },
          optionalFlights: true,
        },
      },
      remarks: { orderBy: { date: 'desc' } },
      statusHistory: { orderBy: { changedAt: 'desc' } },
      communicationLogs: true,
    },
  });
  if (!lead) throw new AppError(`Lead not found`, 404);

  const { user } = req;
  const canManage = user.isSuperAdmin || user.role === 'admin' || user.permissions.includes('manage_leads');
  if (!canManage && user.role === 'salesRep' && lead.assignedToId !== user.id) {
    throw new AppError('Not authorized to access this lead', 403);
  }

  const packageSelections = lead.packageSelections.map((selection) => ({
    ...selection,
    itineraryDays: serializeLeadDays(selection),
    isMaterialized: selection.itineraryDays.length > 0 || Boolean(selection.pricing),
  }));

  res.json({ success: true, data: { ...lead, packageSelections } });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const { user } = req;
  const canManage = user.isSuperAdmin || user.role === 'admin' || user.permissions.includes('manage_leads');
  if (!canManage && lead.assignedToId !== user.id) throw new AppError('Not authorized to update this lead', 403);

  const {
    package: _pkg, assignedTo: _assignedTo, salesRep: _salesRep,
    customizedPackage: _custPkg, convertedBooking: _booking, createdBy: _createdBy,
    ...cleanBody
  } = req.body;

  const parsed = updateLeadSchema.safeParse(cleanBody);
  if (!parsed.success) {
    const messages = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new AppError(messages, 400);
  }
  const validatedBody = parsed.data;

  // Traveler count and travel dates are locked once quoted — both shape the
  // itinerary/pricing the same way, so they share one window. Package
  // identity itself no longer changes via this endpoint (see /:id/packages).
  if (validatedBody.numberOfTravelers !== undefined) {
    validateTravelerUpdate({
      currentStatus: lead.lifecycleStatus,
      previousTravelers: lead.numberOfTravelers,
      nextTravelers: validatedBody.numberOfTravelers,
    });
  }
  if (validatedBody.travelDate !== undefined || validatedBody.endDate !== undefined) {
    validateTravelDatesUpdate({
      currentStatus: lead.lifecycleStatus,
      previousTravelDate: lead.travelDate,
      nextTravelDate: validatedBody.travelDate,
      previousEndDate: lead.endDate,
      nextEndDate: validatedBody.endDate,
    });
  }

  // Lifecycle transitions (except QUOTED — that's only reachable through a
  // specific selection's quote endpoint, since quoting now targets one
  // package at a time).
  const statusHistoryCreate = [];
  if (validatedBody.lifecycleStatus && validatedBody.lifecycleStatus !== lead.lifecycleStatus) {
    if (validatedBody.lifecycleStatus === 'QUOTED') {
      throw new AppError('Use POST /:id/packages/:selectionId/quote to quote a specific package', 400);
    }
    const primarySelection = await loadPrimarySelection(lead);
    validateTransition({
      currentStatus: lead.lifecycleStatus,
      nextStatus: validatedBody.lifecycleStatus,
      pricing: gatekeeperInputs(primarySelection?.pricing, primarySelection?.costLines),
      lostReason: validatedBody.lostReason || lead.lostReason,
    });
    statusHistoryCreate.push({
      status: validatedBody.lifecycleStatus,
      actor: 'USER',
      changedById: user.id,
      notes: validatedBody.statusChangeNotes || 'Status updated',
    });
  }

  const updateData = {};
  const scalarFields = [
    'name', 'email', 'phone', 'whatsapp', 'city', 'source', 'platform',
    'fromCountry', 'destinationCountry', 'destination',
    'numberOfTravelers', 'budget', 'message', 'lifecycleStatus',
    'priority', 'assignedToId', 'tags', 'lostReason',
  ];
  for (const field of scalarFields) {
    if (validatedBody[field] !== undefined) {
      updateData[field] = validatedBody[field];
    }
  }
  if (validatedBody.travelDate !== undefined) {
    updateData.travelDate = validatedBody.travelDate ? new Date(validatedBody.travelDate) : null;
  }
  if (validatedBody.endDate !== undefined) {
    updateData.endDate = validatedBody.endDate ? new Date(validatedBody.endDate) : null;
  }

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      ...updateData,
      ...(statusHistoryCreate.length && { statusHistory: { create: statusHistoryCreate } }),
    },
    include: { remarks: true, statusHistory: { orderBy: { changedAt: 'desc' } } },
  });

  res.json({ success: true, data: updated });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);
  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const draftLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const selectionCount = await prisma.leadPackageSelection.count({ where: { leadId: lead.id } });
  if (selectionCount === 0) {
    throw new AppError('Lead has no package selected', 400);
  }

  const primarySelection = await loadPrimarySelection(lead);
  const transition = validateTransition({
    currentStatus: lead.lifecycleStatus,
    nextStatus: 'DRAFTING',
    pricing: gatekeeperInputs(primarySelection?.pricing, primarySelection?.costLines),
  });

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lifecycleStatus: transition.nextStatus,
      statusHistory: {
        create: [{
          status: 'DRAFTING',
          actor: 'USER',
          changedById: req.user.id,
          notes: 'Moved to drafting',
        }],
      },
    },
    include: { packageSelections: true },
  });
  res.json({ success: true, data: updated });
});

export const addRemark = asyncHandler(async (req, res) => {
  const { text, date } = req.body;
  if (!text) throw new AppError('Remark text is required', 400);

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const remark = await prisma.leadRemark.create({
    data: { leadId: req.params.id, text, date: date ? new Date(date) : new Date(), addedById: req.user.id },
  });

  const remarks = await prisma.leadRemark.findMany({ where: { leadId: req.params.id }, orderBy: { date: 'desc' } });
  res.json({ success: true, data: remarks });
});

export const getLeadRemarks = asyncHandler(async (req, res) => {
  const { all } = req.query;
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const remarks = await prisma.leadRemark.findMany({
    where: { leadId: req.params.id },
    orderBy: { date: 'desc' },
    take: all ? undefined : 3,
  });
  res.json({ success: true, data: remarks });
});

export const assignLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const { assignedTo } = req.body;
  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      assignedToId: assignedTo || null,
      assignedById: req.user.id,
      assignmentMode: 'manual',
    },
  });
  res.json({ success: true, data: updated });
});

export const unassignLead = asyncHandler(async (req, res) => {
  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: { assignedToId: null, assignedById: req.user.id },
  });
  res.json({ success: true, data: updated });
});

export const getLeadsByStatus = asyncHandler(async (req, res) => {
  const status = req.params.status;
  const leads = await prisma.lead.findMany({
    where: { lifecycleStatus: status },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, count: leads.length, data: leads });
});

export const getMyLeads = asyncHandler(async (req, res) => {
  const leads = await prisma.lead.findMany({ where: { assignedToId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: leads.length, data: leads });
});

export const getLeadStats = asyncHandler(async (req, res) => {
  const where = req.user.role === 'salesRep' ? { assignedToId: req.user.id } : {};
  const [byStatus, totals] = await Promise.all([
    prisma.lead.groupBy({ by: ['lifecycleStatus'], _count: true, where }),
    prisma.lead.aggregate({ _count: true, where }),
  ]);
  const total = totals._count;
  const mapped = (byStatus || []).map(item => ({
    _id: item.lifecycleStatus,
    count: item._count,
  }));
  res.json({ success: true, data: mapped, summary: { total, byStatus: mapped } });
});

export const searchLeads = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query) throw new AppError('Search query is required', 400);

  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { destination: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
  });
  res.json({ success: true, count: leads.length, data: leads });
});

export const downloadLeadItineraryPDF = asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'PDF export available via package-service for itinerary data' });
});

export const createWebsiteContactLead = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message, travelDate, destination, destinationCountry, locations } = req.body;

  if (!email || !name?.trim() || !subject?.trim() || !message?.trim()) {
    throw new AppError('Name, email, subject, and message are required', 400);
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  const remarkText = [`Contact Form: ${subject.trim()}`, message?.trim() ? `Message: ${message.trim()}` : '', locations?.trim() ? `Locations: ${locations.trim()}` : ''].filter(Boolean).join(' | ');

  let assignedId = await autoAssignSalesRep({});

  const lead = await prisma.lead.create({
    data: {
      name: name.trim(),
      email: sanitizedEmail,
      phone: phone ? String(phone).replace(/\D/g, '') : null,
      source: 'website',
      platform: 'Website_Form',
      destination: destination?.trim() || null,
      destinationCountry: destinationCountry?.trim() || null,
      travelDate: travelDate ? new Date(travelDate) : null,
      message: message?.trim() || null,
      lifecycleStatus: 'NEW',
      tags: ['website-contact-form'],
      assignedToId: assignedId || null,
      assignmentMode: assignedId ? 'auto' : 'manual',
      remarks: { create: [{ text: remarkText, date: new Date(), addedById: null }] },
      statusHistory: { create: [{ status: 'NEW', actor: 'USER', changedById: null, notes: 'Created from website contact form' }] },
    },
  });

  res.status(201).json({ success: true, message: 'Contact form submitted successfully', data: { leadId: lead.id, salesRepId: assignedId || null } });
});

export const handleInternalEvent = asyncHandler(async (req, res) => {
  const result = await handleLeadEvent({ event: req.body?.event });
  res.json({ success: true, data: result });
});
