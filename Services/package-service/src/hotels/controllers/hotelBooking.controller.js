import prisma from '../../db/client.js';
import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/appError.js';
import { createHotelClient } from '../clients/index.js';
import { SALES_REP } from '../../constants/roles.js';
import { CREATED, NOT_FOUND, BAD_REQUEST } from '../../constants/httpStatus.js';
import { BOOKING_NOT_FOUND, BOOKING_ALREADY_CANCELLED } from '../../constants/errorMessages.js';
import logger from '../../config/logger.js';

function getClient(req) {
  if (!req._hotelClient) req._hotelClient = createHotelClient();
  return req._hotelClient;
}

// ── Controllers ──────────────────────────────────────────────────────

export const search = asyncHandler(async (req, res) => {
  const offers = await getClient(req).searchHotels(req.body);
  req.log.info({ count: offers.length }, 'Hotel search completed');
  res.json({ success: true, data: offers });
});

export const getDetails = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getClient(req).getHotelDetails(req.body.hotelId || req.query.hotelId) });
});

export const prebook = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getClient(req).prebook(req.body) });
});

export const book = asyncHandler(async (req, res) => {
  const { prebookId, guests, contact, offer } = req.body;

  const result = await getClient(req).book({ prebookId, guests, contact });

  const booking = await prisma.hotelBooking.create({
    data: {
      liteapiBookingId: result.bookingId,
      hotelId: offer?.hotelId || 'unknown',
      hotelName: result.hotelName || offer?.name || 'Unknown',
      hotelAddress: offer?.address || null,
      hotelImage: offer?.images?.[0] || null,
      checkin: new Date(result.checkin || offer?.checkin),
      checkout: new Date(result.checkout || offer?.checkout),
      currency: result.currency || 'USD',
      totalAmount: result.totalAmount || 0,
      status: 'confirmed',
      createdById: req.user?.id || 'unknown',
      guestInfo: guests,
      roomDetails: offer?.cheapestRate || {},
      searchSnapshot: offer || {},
    },
  });

  req.log.info({ bookingId: booking.id }, 'Hotel booked');
  res.status(CREATED).json({ success: true, data: booking });
});

export const listBookings = asyncHandler(async (req, res) => {
  const isScoped = req.user?.role === SALES_REP && !req.user?.isSuperAdmin;
  const bookings = await prisma.hotelBooking.findMany({
    where: {
      ...(isScoped && { createdById: req.user.id }),
      ...(req.query.status && { status: req.query.status }),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: bookings });
});

export const getBooking = asyncHandler(async (req, res) => {
  const isScoped = req.user?.role === 'salesRep' && !req.user?.isSuperAdmin;
  const booking = await prisma.hotelBooking.findFirst({
    where: { id: req.params.id, ...(isScoped && { createdById: req.user.id }) },
  });
  if (!booking) throw new AppError(BOOKING_NOT_FOUND, NOT_FOUND);
  res.json({ success: true, data: booking });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const isScoped = req.user?.role === 'salesRep' && !req.user?.isSuperAdmin;
  const booking = await prisma.hotelBooking.findFirst({
    where: { id: req.params.id, ...(isScoped && { createdById: req.user.id }) },
  });
  if (!booking) throw new AppError(BOOKING_NOT_FOUND, NOT_FOUND);
  if (booking.status === 'cancelled') throw new AppError(BOOKING_ALREADY_CANCELLED, BAD_REQUEST);

  if (booking.liteapiBookingId) {
    try { await getClient(req).cancelBooking(booking.liteapiBookingId, req.body?.reason); } catch (_) {}
  }

  const updated = await prisma.hotelBooking.update({
    where: { id: req.params.id },
    data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: req.body?.reason || null },
  });
  res.json({ success: true, data: updated });
});