import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createLeadSchema, updateLeadSchema } from '../validators/lead.validator.js';
import {
  validateTransition,
  validateTravelerUpdate,
} from '../services/state-machine.service.js';
import { computePricing, toLineDescriptor } from '../services/pricing.service.js';
import { copyPackageToLead } from '../services/lead-draft.service.js';
import { handleLeadEvent } from '../services/lead-events.service.js';

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3006';

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

// ─── Pricing helpers ───────────────────────────────────────────

/**
 * Values the state machine gatekeepers need, derived from persisted rows.
 */
function gatekeeperInputs(lead, pricing, lines) {
  const flightActualTotal = (lines || [])
    .filter((l) => l.flightBookingId)
    .reduce((sum, l) => sum + (Number(l.actualTotal) || 0), 0);
  const hotelActualTotal = (lines || [])
    .filter((l) => l.category === 'accommodation')
    .reduce((sum, l) => sum + (Number(l.actualTotal) || 0), 0);
  return {
    sellSubtotal: Number(pricing?.sellSubtotal) || 0,
    verifiedPaymentTotal: Number(pricing?.paidAmount) || 0,
    depositAmount: Number(pricing?.depositAmount) || 0,
    flightActualTotal,
    hotelActualTotal,
  };
}

async function loadPricingContext(leadId) {
  return prisma.lead.findUnique({
    where: { id: leadId },
    include: { pricing: true, costLines: true, optionalFlights: true },
  });
}

/**
 * Recompute and persist all pricing totals for a lead from its current rows.
 */
export async function recomputeLeadPricing(leadId, verifiedPaymentTotal = null) {
  const lead = await loadPricingContext(leadId);
  if (!lead) throw new AppError('Lead not found', 404);
  const pricing = lead.pricing || {};
  const computed = computePricing({
    lines: lead.costLines.map(toLineDescriptor),
    travelers: lead.numberOfTravelers || 1,
    currency: pricing.currency || 'USD',
    marginType: pricing.marginType || null,
    marginValue: Number(pricing.marginValue) || 0,
    depositType: pricing.depositType || null,
    depositValue: Number(pricing.depositValue) || 0,
    discountType: pricing.discountType || 'none',
    discountValue: Number(pricing.discountValue) || 0,
    serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
    verifiedPaymentTotal: (verifiedPaymentTotal ?? Number(pricing.paidAmount)) || 0,
  });
  return prisma.leadPricing.update({
    where: { leadId },
    data: {
      estimatedTotal: computed.estimatedTotal,
      actualTotal: computed.actualTotal,
      sellSubtotal: computed.sellSubtotal,
      discountAmount: computed.discountAmount,
      taxableSubtotal: computed.taxableSubtotal,
      taxAmount: computed.taxAmount,
      serviceChargeAmount: computed.serviceChargeAmount,
      totalAmount: computed.totalAmount,
      depositAmount: computed.depositAmount,
      paidAmount: computed.paidAmount,
      balanceDue: computed.balanceDue,
      profit: computed.profit,
    },
  });
}

/**
 * Snapshot the lead's pricing into a versioned billing quotation.
 */
export async function snapshotQuotation(leadId) {
  const lead = await loadPricingContext(leadId);
  if (!lead) throw new AppError('Lead not found', 404);
  const pricing = lead.pricing;
  if (!pricing) throw new AppError('Lead has no pricing yet', 400);

  const computed = computePricing({
    lines: lead.costLines.map(toLineDescriptor),
    travelers: lead.numberOfTravelers || 1,
    currency: pricing.currency || 'USD',
    marginType: pricing.marginType || null,
    marginValue: Number(pricing.marginValue) || 0,
    depositType: pricing.depositType || null,
    depositValue: Number(pricing.depositValue) || 0,
    discountType: pricing.discountType || 'none',
    discountValue: Number(pricing.discountValue) || 0,
    serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
    verifiedPaymentTotal: Number(pricing.paidAmount) || 0,
  });

  const items = computed.lines.map((l) => ({
    description: l.description,
    category: l.category,
    quantity: l.quantity,
    unitPrice: l.quotedUnitPrice,
    notes: null,
  }));

  const res = await fetch(`${BILLING_SERVICE_URL}/api/v1/billing/quotations/from-lead`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': process.env.INTERNAL_EVENTS_TOKEN || '',
    },
    body: JSON.stringify({
      leadId: lead.id,
      packageId: lead.packageId,
      currency: pricing.currency || 'USD',
      customer: { name: lead.name, email: lead.email, phone: lead.phone, address: lead.city },
      items,
      discountType: pricing.discountType || 'none',
      discountValue: Number(pricing.discountValue) || 0,
      serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
      notes: null,
      terms: null,
      paymentTerms: null,
      includedServices: [],
      excludedServices: [],
    }),
  });
  if (!res.ok) {
    throw new AppError('Failed to snapshot quotation in billing-service', 502);
  }
  const json = await res.json();
  return json.data;
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

  const lead = await prisma.lead.create({
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
      packageId: body.packageId,
      packageName: body.packageName,
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
    },
    include: { remarks: true, statusHistory: true },
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
      include: { pricing: true },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ success: true, data: leads, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
});

export const getLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      pricing: true,
      costLines: { orderBy: { orderIndex: 'asc' } },
      itineraryDays: {
        orderBy: { dayNumber: 'asc' },
        include: { places: true, activities: true, transports: true },
      },
      optionalFlights: true,
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

  res.json({ success: true, data: lead });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await loadPricingContext(req.params.id);
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

  // Traveler count is locked once quoted
  if (validatedBody.numberOfTravelers !== undefined) {
    validateTravelerUpdate({
      currentStatus: lead.lifecycleStatus,
      previousTravelers: lead.numberOfTravelers,
      nextTravelers: validatedBody.numberOfTravelers,
    });
  }

  // State machine + quotation snapshot when lifecycle changes
  let transitionResult = null;
  let quoteSnapshot = null;
  if (validatedBody.lifecycleStatus && validatedBody.lifecycleStatus !== lead.lifecycleStatus) {
    transitionResult = validateTransition({
      currentStatus: lead.lifecycleStatus,
      nextStatus: validatedBody.lifecycleStatus,
      pricing: gatekeeperInputs(lead, lead.pricing, lead.costLines),
      lostReason: validatedBody.lostReason || lead.lostReason,
    });
    if (validatedBody.lifecycleStatus === 'QUOTED') {
      quoteSnapshot = await snapshotQuotation(lead.id);
    }
  }

  const statusHistoryCreate = [];
  if (validatedBody.lifecycleStatus && validatedBody.lifecycleStatus !== lead.lifecycleStatus) {
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
    'fromCountry', 'destinationCountry', 'destination', 'packageId', 'packageName',
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
  if (quoteSnapshot) {
    updateData.currentQuoteId = quoteSnapshot.id;
  }

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      ...updateData,
      ...(statusHistoryCreate.length && { statusHistory: { create: statusHistoryCreate } }),
    },
    include: { pricing: true, remarks: true, statusHistory: { orderBy: { changedAt: 'desc' } } },
  });

  // Persist pricing settings when provided
  if (validatedBody.pricing && lead.pricing) {
    await prisma.leadPricing.update({
      where: { leadId: lead.id },
      data: {
        currency: validatedBody.pricing.currency,
        marginType: validatedBody.pricing.marginType,
        marginValue: validatedBody.pricing.marginValue,
        depositType: validatedBody.pricing.depositType,
        depositValue: validatedBody.pricing.depositValue,
        discountType: validatedBody.pricing.discountType,
        discountValue: validatedBody.pricing.discountValue,
        serviceChargeRate: validatedBody.pricing.serviceChargeRate,
      },
    });
    await recomputeLeadPricing(lead.id);
  }

  res.json({ success: true, data: updated });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);
  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const draftLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: { pricing: true, itineraryDays: true },
  });
  if (!lead) throw new AppError('Lead not found', 404);
  if (!lead.packageId) throw new AppError('Lead has no package selected', 400);

  const transition = validateTransition({
    currentStatus: lead.lifecycleStatus,
    nextStatus: 'DRAFTING',
    pricing: gatekeeperInputs(lead, lead.pricing, lead.costLines || []),
  });

  await copyPackageToLead({ leadId: lead.id, packageId: lead.packageId });

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lifecycleStatus: transition.nextStatus,
      statusHistory: {
        create: [{
          status: 'DRAFTING',
          actor: 'USER',
          changedById: req.user.id,
          notes: 'Package copied to lead draft',
        }],
      },
    },
    include: { pricing: true, costLines: true, itineraryDays: true },
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

export const setLeadItinerary = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: { currentItineraryId: req.body.itineraryId },
  });
  res.json({ success: true, data: updated });
});

export const getLeadItinerary = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);
  res.json({ success: true, data: { currentItineraryId: lead.currentItineraryId } });
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

// ─── Optional transfer flights ─────────────────────────────────

export const listOptionalFlights = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);
  const flights = await prisma.leadOptionalFlight.findMany({
    where: { leadId: req.params.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: flights });
});

export const addOptionalFlight = asyncHandler(async (req, res) => {
  const lead = await loadPricingContext(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);

  const {
    flightType,
    origin,
    destination,
    date,
    notes,
    estimatedUnitPrice = 0,
    actualUnitPrice,
    marginType,
    marginValue,
  } = req.body;
  if (!flightType) throw new AppError('flightType is required', 400);

  const quantity = lead.numberOfTravelers || 1;
  const flight = await prisma.leadOptionalFlight.create({
    data: {
      leadId: lead.id,
      flightType,
      origin: origin ?? null,
      destination: destination ?? null,
      date: date ? new Date(date) : null,
      notes: notes ?? null,
      estimatedUnitPrice: Number(estimatedUnitPrice) || 0,
      actualUnitPrice: actualUnitPrice != null ? Number(actualUnitPrice) : null,
      quantity,
      marginType: marginType || null,
      marginValue: marginValue != null ? Number(marginValue) : null,
    },
  });

  await prisma.leadCostLine.create({
    data: {
      leadId: lead.id,
      category: 'transportation',
      description: `Flight: ${origin || '?'} → ${destination || '?'}`,
      basis: 'PER_PERSON',
      quantity,
      estimatedUnitPrice: Number(estimatedUnitPrice) || 0,
      actualUnitPrice: actualUnitPrice != null ? Number(actualUnitPrice) : null,
      marginType: marginType || null,
      marginValue: marginValue != null ? Number(marginValue) : null,
      source: 'MANUAL',
      optionalFlightId: flight.id,
      orderIndex: (lead.costLines || []).length,
    },
  });

  await recomputeLeadPricing(lead.id);
  res.status(201).json({ success: true, data: flight });
});

export const deleteOptionalFlight = asyncHandler(async (req, res) => {
  const { id, flightId } = req.params;
  const flight = await prisma.leadOptionalFlight.findUnique({ where: { id: flightId } });
  if (!flight || flight.leadId !== id) throw new AppError('Flight not found', 404);

  await prisma.$transaction([
    prisma.leadCostLine.deleteMany({ where: { leadId: id, optionalFlightId: flightId } }),
    prisma.leadOptionalFlight.delete({ where: { id: flightId } }),
  ]);
  await recomputeLeadPricing(id);
  res.json({ success: true, data: {} });
});

// ─── Quote handoff ─────────────────────────────────────────────

export const quoteLead = asyncHandler(async (req, res) => {
  const lead = await loadPricingContext(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);

  validateTransition({
    currentStatus: lead.lifecycleStatus,
    nextStatus: 'QUOTED',
    pricing: gatekeeperInputs(lead, lead.pricing, lead.costLines),
  });

  const quotation = await snapshotQuotation(lead.id);
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lifecycleStatus: 'QUOTED',
      currentQuoteId: quotation.id,
      statusHistory: {
        create: [{
          status: 'QUOTED',
          actor: 'USER',
          changedById: req.user.id,
          notes: 'Quotation snapshot sent to billing',
        }],
      },
    },
    include: { pricing: true },
  });
  res.json({ success: true, data: updated });
});
