import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

export const createOrUpdateManualItinerary = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { days = [], status = 'draft' } = req.body;

  const existing = await prisma.manualItinerary.findFirst({ where: { leadId } });
  let result;
  if (existing) {
    result = await prisma.manualItinerary.update({ where: { id: existing.id }, data: { days, status, metaLastModifiedById: req.user.id } });
  } else {
    result = await prisma.manualItinerary.create({ data: { leadId, days, status, createdById: req.user.id } });
  }
  res.json({ success: true, data: result });
});

export const getManualItineraryByLead = asyncHandler(async (req, res) => {
  const data = await prisma.manualItinerary.findFirst({ where: { leadId: req.params.leadId } });
  if (!data) throw new AppError('Manual itinerary not found', 404);
  res.json({ success: true, data });
});

export const deleteManualItinerary = asyncHandler(async (req, res) => {
  const existing = await prisma.manualItinerary.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Manual itinerary not found', 404);
  await prisma.manualItinerary.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Manual itinerary deleted' });
});

export const createWebsiteManualItinerary = asyncHandler(async (req, res) => {
  const { leadId, days = [] } = req.body;
  if (!leadId) throw new AppError('leadId is required', 400);
  const result = await prisma.manualItinerary.create({ data: { leadId, days, status: 'draft' } });
  res.status(201).json({ success: true, data: result });
});

export const getUserManualItineraries = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const data = await prisma.manualItinerary.findMany({ where: { createdById: userId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
});
