import crypto from 'crypto';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { SALES_REP } from '../constants/roles.js';
import { CREATED, BAD_REQUEST, NOT_FOUND } from '../constants/httpStatus.js';
import { BOOKING_NOT_FOUND, BOOKING_ALREADY_CANCELLED } from '../constants/errorMessages.js';

// ── helpers ──────────────────────────────────────────────────────────────

async function findOrCreateCustomer({ name, email, phone }) {
  const sanitizedEmail = String(email).trim().toLowerCase();
  const rows = await prisma.$queryRaw`
    SELECT id, name, email, phone
    FROM crm_users."User"
    WHERE email = ${sanitizedEmail}
    LIMIT 1
  `;
  if (rows[0]) return rows[0];
  const id = crypto.randomUUID();
  const bcrypt = await import('bcryptjs');
  const randomPassword = crypto.randomBytes(12).toString('hex');
  const hashedPassword = await bcrypt.default.hash(randomPassword, 12);
  await prisma.$executeRaw`
    INSERT INTO crm_users."User"
      (id, name, email, phone, password, role, "isTempPassword", "mustChangePassword", "isActive", "isEmailVerified", "createdAt", "updatedAt")
    VALUES
      (${id}, ${name?.trim() || 'Traveler'}, ${sanitizedEmail}, ${phone || null}, ${hashedPassword},
       'customer'::"crm_users"."UserRole",
       true, true, true, false, NOW(), NOW())
  `;
  return { id, name, email, phone };
}

// ── controllers ──────────────────────────────────────────────────────────

export const bookForLead = asyncHandler(async (req, res) => {
  const { offer, tripType, travelers, contact, leadId, packageId, customizedPackageId, dayNumber, flightType } = req.body;

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
      leadId: leadId || undefined,
      packageId: packageId || undefined,
      customizedPackageId: customizedPackageId || undefined,
      dayNumber: dayNumber ? parseInt(dayNumber, 10) : undefined,
      flightType: flightType || 'itinerary',
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

  req.log.info({ bookingId: booking.id, pnr: booking.pnr, leadId, dayNumber, flightType }, 'Flight booked for lead');
  res.status(CREATED).json({ success: true, data: booking });
});

export const getByLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const isScopedToOwn = req.user.role === SALES_REP && !req.user.isSuperAdmin;

  const bookings = await prisma.flightBooking.findMany({
    where: { leadId, ...(isScopedToOwn && { createdById: req.user.id }) },
    include: { segments: true, travelers: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: bookings });
});

export const getItineraryFlights = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const isScopedToOwn = req.user.role === SALES_REP && !req.user.isSuperAdmin;

  const bookings = await prisma.flightBooking.findMany({
    where: { leadId, flightType: 'itinerary', ...(isScopedToOwn && { createdById: req.user.id }) },
    include: { segments: true, travelers: true },
    orderBy: { dayNumber: 'asc' },
  });

  res.json({ success: true, data: bookings });
});

export const getOptionalFlights = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const isScopedToOwn = req.user.role === SALES_REP && !req.user.isSuperAdmin;

  const bookings = await prisma.flightBooking.findMany({
    where: { leadId, flightType: 'optional', ...(isScopedToOwn && { createdById: req.user.id }) },
    include: { segments: true, travelers: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: bookings });
});

export const linkToDay = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { leadId, dayNumber, flightType } = req.body;
  const isScopedToOwn = req.user.role === SALES_REP && !req.user.isSuperAdmin;

  const booking = await prisma.flightBooking.findFirst({
    where: { id, ...(isScopedToOwn && { createdById: req.user.id }) },
  });
  if (!booking) throw new AppError(BOOKING_NOT_FOUND, NOT_FOUND);

  const updated = await prisma.flightBooking.update({
    where: { id },
    data: {
      ...(leadId && { leadId }),
      ...(dayNumber !== undefined && { dayNumber: parseInt(dayNumber, 10) }),
      ...(flightType && { flightType }),
    },
    include: { segments: true, travelers: true },
  });

  res.json({ success: true, data: updated });
});
