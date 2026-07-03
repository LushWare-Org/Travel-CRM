import crypto from 'crypto';
import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── Auto-assignment helper ────────────────────────────────────────────────────
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

// ─── Controllers ───────────────────────────────────────────────────────────────

export const createLead = asyncHandler(async (req, res) => {
  const { user } = req;
  const body = { ...req.body };

  if (!body.status) body.status = 'new';

  // Sales rep self-assignment
  if (user.role === 'salesRep') {
    body.assignedToId = body.assignedToId || user.id;
    body.assignmentMode = 'manual';
    body.assignedById = user.id;
  }

  // Auto-assign if no explicit assignment provided
  let assignedId = body.assignedToId;
  if (!assignedId && user.role !== 'salesRep') {
    assignedId = await autoAssignSalesRep(body);
    if (assignedId) {
      body.assignedToId = assignedId;
      body.assignmentMode = 'auto';
    }
  }

  const { remarks = [], statusChangeNotes, ...leadFields } = body;

  const lead = await prisma.lead.create({
    data: {
      ...leadFields,
      travelDate: leadFields.travelDate ? new Date(leadFields.travelDate) : null,
      endDate: leadFields.endDate ? new Date(leadFields.endDate) : null,
      tags: leadFields.tags || [],
      remarks: {
        create: remarks.map((r) => ({ text: r.text, date: r.date ? new Date(r.date) : new Date(), addedById: r.addedBy || user.id || null })),
      },
      statusHistory: {
        create: [{ status: body.status || 'new', changedById: user.id, notes: 'Initial status' }],
      },
    },
    include: { remarks: true, statusHistory: true },
  });

  res.status(201).json({ success: true, data: lead });
});

export const getLeads = asyncHandler(async (req, res) => {
  const { user } = req;
  const { page = 1, limit = 10, search, status, sortBy = 'createdAt', order = 'desc' } = req.query;

  const where = {};
  if (user.role === 'salesRep') where.assignedToId = user.id;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { destination: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, skip, take: parseInt(limit), orderBy: { [sortBy]: order } }),
    prisma.lead.count({ where }),
  ]);

  res.json({ success: true, data: leads, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
});

export const getLead = asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: { remarks: { orderBy: { date: 'desc' } }, statusHistory: { orderBy: { changedAt: 'desc' } }, communicationLogs: true },
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
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw new AppError('Lead not found', 404);

  const { user } = req;
  const canManage = user.isSuperAdmin || user.role === 'admin' || user.permissions.includes('manage_leads');
  if (!canManage && lead.assignedToId !== user.id) throw new AppError('Not authorized to update this lead', 403);

  const {
    statusChangeNotes, remarks, statusHistory, communicationLogs,
    // Strip relation objects — frontend may send populated relations; Prisma only
    // accepts the scalar FK fields (packageId, assignedToId, etc.)
    package: _pkg, assignedTo: _assignedTo, convertedBooking: _booking,
    customizedPackage: _custPkg, createdBy: _createdBy,
    ...updateData
  } = req.body;

  // Track status change
  const statusHistoryCreate = [];
  if (updateData.status && updateData.status !== lead.status) {
    statusHistoryCreate.push({ status: updateData.status, changedById: user.id, notes: statusChangeNotes || 'Status updated' });
  }

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      ...updateData,
      travelDate: updateData.travelDate !== undefined ? (updateData.travelDate ? new Date(updateData.travelDate) : null) : undefined,
      endDate: updateData.endDate !== undefined ? (updateData.endDate ? new Date(updateData.endDate) : null) : undefined,
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
  const leads = await prisma.lead.findMany({ where: { status: req.params.status }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: leads.length, data: leads });
});

export const getMyLeads = asyncHandler(async (req, res) => {
  const leads = await prisma.lead.findMany({ where: { assignedToId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: leads.length, data: leads });
});

export const getLeadStats = asyncHandler(async (req, res) => {
  const where = req.user.role === 'salesRep' ? { assignedToId: req.user.id } : {};
  const [byStatus, totals] = await Promise.all([
    prisma.lead.groupBy({ by: ['status'], _count: true, where }),
    prisma.lead.aggregate({
      _count: true,
      where,
    }),
  ]);
  const total = totals._count;
  res.json({ success: true, data: byStatus, summary: { total, byStatus } });
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
      status: 'new',
      tags: ['website-contact-form'],
      assignedToId: assignedId || null,
      assignmentMode: assignedId ? 'auto' : 'manual',
      remarks: { create: [{ text: remarkText, date: new Date(), addedById: null }] },
      statusHistory: { create: [{ status: 'new', changedById: null, notes: 'Created from website contact form' }] },
    },
  });

  res.status(201).json({ success: true, message: 'Contact form submitted successfully', data: { leadId: lead.id, salesRepId: assignedId || null } });
});
