import crypto from 'crypto';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { SALES_REP } from '../constants/roles.js';
import { CREATED, BAD_REQUEST, NOT_FOUND } from '../constants/httpStatus.js';
import { BOOKING_NOT_FOUND, BOOKING_ALREADY_CANCELLED } from '../constants/errorMessages.js';

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
  const { origin, destination, departureDate, returnDate, adults, children, infants, cabinClass, tripType } = req.body;

  const offers = await req.flightClient.searchFlights({
    origin,
    destination,
    departureDate,
    returnDate: returnDate || undefined,
    adults: adults ?? 1,
    children: children ?? 0,
    infants: infants ?? 0,
    cabinClass: cabinClass || 'Economy',
    tripType: tripType || (returnDate ? 'roundTrip' : 'oneWay'),
  });

  req.log.info({ origin, destination, departureDate, count: offers.length }, 'Flight search completed');
  res.json({ success: true, data: offers });
});

export const price = asyncHandler(async (req, res) => {
  const result = await req.flightClient.priceOffer(req.body.offerId);
  res.json({ success: true, data: result });
});

export const book = asyncHandler(async (req, res) => {
  const { offer, tripType, travelers, contact } = req.body;

  const customer = await findOrCreateCustomer(contact);

  const order = await req.flightClient.createOrder({
    offerId: offer.offerId,
    travelers,
    contact,
    totalAmount: offer.fareTotal,
    currency: offer.currency,
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

  req.log.info({ bookingId: booking.id, pnr: booking.pnr }, 'Flight booked');
  res.status(CREATED).json({ success: true, data: booking });
});

export const listBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const isScopedToOwn = req.user.role === SALES_REP && !req.user.isSuperAdmin;

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
  const isScopedToOwn = req.user.role === SALES_REP && !req.user.isSuperAdmin;

  const booking = await prisma.flightBooking.findFirst({
    where: { id, ...(isScopedToOwn && { createdById: req.user.id }) },
    include: { segments: true, travelers: true },
  });

  if (!booking) throw new AppError(BOOKING_NOT_FOUND, NOT_FOUND);
  res.json({ success: true, data: booking });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const isScopedToOwn = req.user.role === SALES_REP && !req.user.isSuperAdmin;

  const booking = await prisma.flightBooking.findFirst({
    where: { id, ...(isScopedToOwn && { createdById: req.user.id }) },
  });
  if (!booking) throw new AppError(BOOKING_NOT_FOUND, NOT_FOUND);
  if (booking.status === 'cancelled') throw new AppError(BOOKING_ALREADY_CANCELLED, BAD_REQUEST);

  if (booking.travelportOrderId) {
    await req.flightClient.cancelOrder(booking.travelportOrderId);
  }

  const updated = await prisma.flightBooking.update({
    where: { id },
    data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason || undefined },
    include: { segments: true, travelers: true },
  });

  res.json({ success: true, data: updated });
});
