import crypto from 'crypto';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import * as travelport from '../services/travelport.service.js';

// ── cross-schema helpers (mirrors Services/booking-service's pattern) ─────

async function findUserByEmail(email) {
  const rows = await prisma.$queryRaw`
    SELECT id, name, email, phone
    FROM crm_users."User"
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function createCustomerUser({ name, email, phone }) {
  const id = crypto.randomUUID();
  const bcrypt = await import('bcryptjs');
  const randomPassword = crypto.randomBytes(12).toString('hex');
  const hashedPassword = await bcrypt.default.hash(randomPassword, 12);
  await prisma.$executeRaw`
    INSERT INTO crm_users."User"
      (id, name, email, phone, password, role, "isTempPassword", "mustChangePassword", "isActive", "isEmailVerified", "createdAt", "updatedAt")
    VALUES
      (${id}, ${name}, ${email}, ${phone || null}, ${hashedPassword},
       'customer'::"crm_users"."UserRole",
       true, true, true, false, NOW(), NOW())
  `;
  return { id, name, email, phone };
}

async function findOrCreateCustomer({ name, email, phone }) {
  const sanitizedEmail = String(email).trim().toLowerCase();
  const existing = await findUserByEmail(sanitizedEmail);
  if (existing) return existing;
  return createCustomerUser({ name: name?.trim() || 'Traveler', email: sanitizedEmail, phone });
}

// ── controllers ────────────────────────────────────────────────────────

export const search = asyncHandler(async (req, res) => {
  const { origin, destination, departureDate, returnDate, adults, children, infants, cabinClass, tripType } = req.body || {};

  if (!origin || !destination || !departureDate) {
    throw new AppError('origin, destination and departureDate are required', 400);
  }

  const offers = await travelport.searchFlights({
    origin: String(origin).toUpperCase(),
    destination: String(destination).toUpperCase(),
    departureDate,
    returnDate: returnDate || undefined,
    adults: Number(adults) || 1,
    children: Number(children) || 0,
    infants: Number(infants) || 0,
    cabinClass: cabinClass || 'Economy',
    tripType: tripType || (returnDate ? 'roundTrip' : 'oneWay'),
  });

  res.json({ success: true, data: offers });
});

export const price = asyncHandler(async (req, res) => {
  const { offerId } = req.body || {};
  if (!offerId) throw new AppError('offerId is required', 400);

  const result = await travelport.priceOffer(offerId);
  res.json({ success: true, data: result });
});

export const book = asyncHandler(async (req, res) => {
  const { offer, tripType, travelers, contact } = req.body || {};

  if (!offer?.offerId) throw new AppError('offer is required', 400);
  if (!Array.isArray(travelers) || travelers.length === 0) throw new AppError('At least one traveler is required', 400);
  if (!contact?.email) throw new AppError('contact.email is required', 400);

  const customer = await findOrCreateCustomer(contact);

  const order = await travelport.createOrder({
    offerId: offer.offerId,
    travelers,
    contact,
  });

  const booking = await prisma.flightBooking.create({
    data: {
      pnr: order.pnr,
      travelportOrderId: order.travelportOrderId,
      createdById: req.user.id,
      customerId: customer.id,
      tripType: tripType || (offer.segments?.length > 1 ? 'roundTrip' : 'oneWay'),
      cabinClass: offer.cabinClass || 'Economy',
      currency: offer.currency || 'USD',
      baseFare: offer.baseFare,
      taxes: offer.taxes,
      totalAmount: offer.fareTotal,
      status: order.status === 'confirmed' ? 'confirmed' : 'pending',
      searchSnapshot: offer,
      ticketingDeadline: order.ticketingDeadline ? new Date(order.ticketingDeadline) : undefined,
      bookedAt: new Date(),
      segments: {
        create: (offer.segments || []).map((seg) => ({
          sequence: seg.sequence,
          marketingCarrier: seg.marketingCarrier,
          operatingCarrier: seg.operatingCarrier,
          flightNumber: seg.flightNumber,
          bookingClass: seg.bookingClass,
          origin: seg.origin,
          destination: seg.destination,
          departureAt: new Date(seg.departureAt),
          arrivalAt: new Date(seg.arrivalAt),
          durationMinutes: seg.durationMinutes,
          stops: seg.stops || 0,
        })),
      },
      travelers: {
        create: travelers.map((t) => ({
          type: t.type || 'adult',
          title: t.title,
          firstName: t.firstName,
          lastName: t.lastName,
          dob: t.dob ? new Date(t.dob) : undefined,
          gender: t.gender,
          passportNumber: t.passportNumber,
          passportExpiry: t.passportExpiry ? new Date(t.passportExpiry) : undefined,
          nationality: t.nationality,
          frequentFlyerNumber: t.frequentFlyerNumber,
        })),
      },
    },
    include: { segments: true, travelers: true },
  });

  res.status(201).json({ success: true, data: booking });
});

export const listBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const isScopedToOwn = req.user.role === 'salesRep' && !req.user.isSuperAdmin;

  const bookings = await prisma.flightBooking.findMany({
    where: {
      ...(isScopedToOwn && { createdById: req.user.id }),
      ...(status && { status }),
    },
    include: { segments: true, travelers: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: bookings });
});

export const getBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isScopedToOwn = req.user.role === 'salesRep' && !req.user.isSuperAdmin;

  const booking = await prisma.flightBooking.findFirst({
    where: { id, ...(isScopedToOwn && { createdById: req.user.id }) },
    include: { segments: true, travelers: true },
  });

  if (!booking) throw new AppError('Flight booking not found', 404);
  res.json({ success: true, data: booking });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const isScopedToOwn = req.user.role === 'salesRep' && !req.user.isSuperAdmin;

  const booking = await prisma.flightBooking.findFirst({
    where: { id, ...(isScopedToOwn && { createdById: req.user.id }) },
  });
  if (!booking) throw new AppError('Flight booking not found', 404);
  if (booking.status === 'cancelled') throw new AppError('Booking is already cancelled', 400);

  if (booking.travelportOrderId) {
    await travelport.cancelOrder(booking.travelportOrderId);
  }

  const updated = await prisma.flightBooking.update({
    where: { id },
    data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason || undefined },
    include: { segments: true, travelers: true },
  });

  res.json({ success: true, data: updated });
});
