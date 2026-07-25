import prisma from '../../db/client.js';
import { createHotelClient } from '../clients/index.js';

/**
 * Inject (or reuse) the hotel client on the request object.
 */
function getClient(req) {
  if (!req._hotelClient) req._hotelClient = createHotelClient();
  return req._hotelClient;
}

// ── Controllers ──────────────────────────────────────────────────────

export const search = async (req, res, next) => {
  try {
    const offers = await getClient(req).searchHotels(req.body);
    res.json({ success: true, data: offers });
  } catch (err) { next(err); }
};

export const getDetails = async (req, res, next) => {
  try {
    const hotelId = req.body?.hotelId || req.query?.hotelId;
    if (!hotelId) return res.status(400).json({ success: false, message: 'hotelId is required' });
    const details = await getClient(req).getHotelDetails(hotelId);
    res.json({ success: true, data: details });
  } catch (err) { next(err); }
};

export const prebook = async (req, res, next) => {
  try {
    const result = await getClient(req).prebook(req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const book = async (req, res, next) => {
  try {
    const { prebookId, guests, contact, offer } = req.body;
    if (!prebookId) return res.status(400).json({ success: false, message: 'prebookId is required' });
    if (!guests?.length) return res.status(400).json({ success: false, message: 'At least one guest is required' });
    if (!contact?.email) return res.status(400).json({ success: false, message: 'contact.email is required' });

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

    res.status(201).json({ success: true, data: booking });
  } catch (err) { next(err); }
};

export const listBookings = async (req, res, next) => {
  try {
    const isScoped = req.user?.role === 'salesRep' && !req.user?.isSuperAdmin;
    const bookings = await prisma.hotelBooking.findMany({
      where: {
        ...(isScoped && { createdById: req.user.id }),
        ...(req.query.status && { status: req.query.status }),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
};

export const getBooking = async (req, res, next) => {
  try {
    const isScoped = req.user?.role === 'salesRep' && !req.user?.isSuperAdmin;
    const booking = await prisma.hotelBooking.findFirst({
      where: { id: req.params.id, ...(isScoped && { createdById: req.user.id }) },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Hotel booking not found' });
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const isScoped = req.user?.role === 'salesRep' && !req.user?.isSuperAdmin;
    const booking = await prisma.hotelBooking.findFirst({
      where: { id: req.params.id, ...(isScoped && { createdById: req.user.id }) },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Hotel booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Booking is already cancelled' });

    if (booking.liteapiBookingId) {
      try { await getClient(req).cancelBooking(booking.liteapiBookingId, req.body?.reason); } catch (_) { /* local cancel still proceeds */ }
    }

    const updated = await prisma.hotelBooking.update({
      where: { id: req.params.id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: req.body?.reason || null },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};
