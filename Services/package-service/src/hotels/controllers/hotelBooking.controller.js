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

  // Enrich with hotel names + images via batch lookup — search response only has hotelId + rates
  if (offers.length > 0) {
    const hotelIds = [...new Set(offers.map((o) => o.hotelId))];
    try {
      const details = await getClient(req).getHotelsByIds(hotelIds);
      const detailMap = new Map(details.filter(Boolean).map((d) => [d.hotelId, d]));
      for (const offer of offers) {
        const d = detailMap.get(offer.hotelId);
        if (d) {
          offer.name = d.name || offer.name;
          offer.starRating = d.starRating || offer.starRating;
          offer.images = d.images?.length ? d.images : offer.images;
          offer.address = d.address || offer.address;
          offer.latitude = d.latitude || offer.latitude;
          offer.longitude = d.longitude || offer.longitude;
        }
      }
    } catch (err) {
      req.log.warn({ err: err.message }, 'Batch hotel details fetch failed, using search data only');
    }
  }

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
    try { await getClient(req).cancelBooking(booking.liteapiBookingId, req.body?.reason); } catch (_) { /* best-effort: local cancellation proceeds regardless */ }
  }

  const updated = await prisma.hotelBooking.update({
    where: { id: req.params.id },
    data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: req.body?.reason || null },
  });
  res.json({ success: true, data: updated });
});

// ── Lead-scoped controllers ─────────────────────────────────────────

export const bookWithContext = asyncHandler(async (req, res) => {
  const { prebookId, guests, contact, offer, leadId, packageId, customizedPackageId, dayNumber } = req.body;

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
      customerId: contact?.customerId || null,
      guestInfo: guests,
      roomDetails: offer?.cheapestRate || {},
      searchSnapshot: offer || {},
      leadId: leadId || null,
      packageId: packageId || null,
      customizedPackageId: customizedPackageId || null,
      dayNumber: dayNumber ? parseInt(dayNumber, 10) : null,
    },
  });

  req.log.info({ bookingId: booking.id, leadId, dayNumber }, 'Hotel booked with lead context');
  res.status(CREATED).json({ success: true, data: booking });
});

export const getHotelBookingsByLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const isScoped = req.user?.role === SALES_REP && !req.user?.isSuperAdmin;

  const bookings = await prisma.hotelBooking.findMany({
    where: { leadId, ...(isScoped && { createdById: req.user.id }) },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: bookings });
});