import crypto from 'crypto';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { computeMargin } from '../../../shared/pricing-engine/src/index.js';

const normalizePhone = (phone) => {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : undefined;
};

// ── cross-schema helpers ──────────────────────────────────────────

async function findPackageById(id) {
  const rows = await prisma.$queryRaw`
    SELECT id, title, destination, "base_price" AS "basePrice",
           "default_margin_type" AS "defaultMarginType",
           "default_margin_input" AS "defaultMarginInput",
           "is_active" AS "isActive"
    FROM crm_packages."Package"
    WHERE id = ${id}
    LIMIT 1
  `;
  const pkg = rows[0];
  if (!pkg) return null;

  const basePrice = Number(pkg.basePrice);
  const defaultMarginInput = Number(pkg.defaultMarginInput);
  const sellPrice = computeMargin(basePrice, pkg.defaultMarginType, defaultMarginInput).sellPrice;
  // name/price aliases keep this helper's existing call sites (pkg.name, pkg.price) unchanged.
  return { ...pkg, name: pkg.title, price: sellPrice };
}

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

async function updateUserPhoneOrName(id, phone, name) {
  await prisma.$executeRaw`
    UPDATE crm_users."User"
    SET phone = COALESCE(phone, ${phone || null}),
        name  = COALESCE(NULLIF(name,''), ${name || null}),
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

async function autoAssignSalesRep() {
  const rows = await prisma.$queryRaw`
    SELECT id, "enabledSalesRepIds", "roundRobinIndex", "autoStrategy", "assignmentMode"
    FROM crm_leads."Settings"
    LIMIT 1
  `;
  const settings = rows[0];
  if (!settings || settings.assignmentMode !== 'auto') return null;
  if (settings.autoStrategy !== 'round_robin') return null;
  const reps = settings.enabledSalesRepIds || [];
  if (!reps.length) return null;

  const idx = settings.roundRobinIndex % reps.length;
  const assignedId = reps[idx];
  const nextIdx = (idx + 1) % reps.length;

  await prisma.$executeRaw`
    UPDATE crm_leads."Settings"
    SET "roundRobinIndex" = ${nextIdx}, "updatedAt" = NOW()
    WHERE id = ${settings.id}
  `;
  return assignedId;
}

async function findSalesRepEmail(id) {
  const rows = await prisma.$queryRaw`
    SELECT name, email FROM crm_users."User" WHERE id = ${id} LIMIT 1
  `;
  return rows[0] || null;
}

async function createLead({ name, email, phone, packageId, packageName, destination, travelDate, endDate, travelers, budget, message, assignedToId }) {
  const leadId = crypto.randomUUID();
  const source = 'booking';
  const platform = 'Website Form';
  const status = 'new';
  const tags = ['website-booking'];
  await prisma.$executeRaw`
    INSERT INTO crm_leads."Lead"
      (id, name, email, phone, source, platform, "packageId", "packageName",
       destination, "destinationCountry", "travelDate", "endDate",
       "numberOfTravelers", budget, message, status, tags,
       "assignedToId", "assignmentMode", "leadDateTime", "createdAt", "updatedAt")
    VALUES
      (${leadId}, ${name}, ${email}, ${phone || null},
       ${source}::"crm_leads"."LeadSource",
       ${platform}::"crm_leads"."LeadPlatform",
       ${packageId || null}, ${packageName || null},
       ${destination || null}, ${destination || null},
       ${travelDate || null}, ${endDate || null},
       ${travelers}, ${budget || null}, ${message || null},
       ${status}::"crm_leads"."LeadStatus",
       ${tags},
       ${assignedToId || null},
       ${assignedToId ? 'auto' : 'manual'}::"crm_leads"."AssignmentMode",
       NOW(), NOW(), NOW())
  `;

  if (message?.trim()) {
    const remarkId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO crm_leads."LeadRemark" (id, "leadId", text, "addedAt", date)
      VALUES (${remarkId}, ${leadId}, ${'Website inquiry: ' + message.trim()}, NOW(), NOW())
    `;
  }

  const histId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO crm_leads."LeadStatusHistory" (id, "leadId", status, "changedAt")
    VALUES (${histId}, ${leadId}, ${'new'}, NOW())
  `;

  return leadId;
}

/** Replaces each row's raw base-price/margin columns with a computed sell price, matching package-service's own pricing math. */
function withPackageSellPrice(rows) {
  return rows.map(({ packageBasePrice, packageMarginType, packageMarginInput, ...rest }) => ({
    ...rest,
    packagePrice: packageBasePrice != null
      ? computeMargin(Number(packageBasePrice), packageMarginType, Number(packageMarginInput)).sellPrice
      : null,
  }));
}

async function incrementPackageBookings(packageId) {
  await prisma.$executeRaw`
    UPDATE crm_packages."Package"
    SET bookings = bookings + 1, "updatedAt" = NOW()
    WHERE id = ${packageId}
  `;
}

// ── controllers ───────────────────────────────────────────────────

export const createWebsiteBooking = asyncHandler(async (req, res) => {
  const { name, email, phone, travelers, travelDate, endDate, message, packageId } = req.body || {};

  if (!packageId) throw new AppError('packageId is required', 400);
  if (!email) throw new AppError('Email is required to create a booking', 400);

  const pkg = await findPackageById(packageId);
  if (!pkg) throw new AppError('Package not found', 404);

  const sanitizedEmail = String(email).trim().toLowerCase();
  const sanitizedName = name?.trim() || 'Website Traveler';
  const normalizedPhone = normalizePhone(phone);

  const parsedTravelers = Number(travelers) || 1;
  if (!Number.isFinite(parsedTravelers) || parsedTravelers < 1)
    throw new AppError('travelers must be a positive number', 400);

  const parsedTravelDate = travelDate ? new Date(travelDate) : null;
  if (!parsedTravelDate || Number.isNaN(parsedTravelDate.getTime()))
    throw new AppError('A valid travelDate is required', 400);

  const parsedEndDate = endDate ? new Date(endDate) : null;
  if (parsedEndDate && Number.isNaN(parsedEndDate.getTime()))
    throw new AppError('endDate is invalid', 400);
  if (parsedEndDate && parsedEndDate < parsedTravelDate)
    throw new AppError('endDate cannot be before travelDate', 400);

  let user = await findUserByEmail(sanitizedEmail);
  if (!user) {
    user = await createCustomerUser({ name: sanitizedName, email: sanitizedEmail, phone: normalizedPhone });
  } else if (!user.phone || !user.name) {
    await updateUserPhoneOrName(user.id, normalizedPhone, sanitizedName);
  }

  let assignedToId = null;
  try {
    assignedToId = await autoAssignSalesRep();
  } catch (e) {
    req.log.warn({ err: e }, 'Auto-assignment failed');
  }

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      packageId: pkg.id,
      travelDate: parsedTravelDate,
      endDate: parsedEndDate || undefined,
      numberOfTravelers: parsedTravelers,
      totalAmount: pkg.price || 0,
      paidAmount: 0,
      paymentStatus: 'pending',
      bookingStatus: 'pending',
      specialRequests: message?.trim() || undefined,
      assignedToId: assignedToId || undefined,
    },
  });

  let leadId = null;
  try {
    leadId = await createLead({
      name: sanitizedName,
      email: sanitizedEmail,
      phone: normalizedPhone,
      packageId: pkg.id,
      packageName: pkg.name,
      destination: pkg.destination,
      travelDate: parsedTravelDate,
      endDate: parsedEndDate,
      travelers: parsedTravelers,
      budget: pkg.price ? `${pkg.price}` : undefined,
      message: message?.trim(),
      assignedToId,
    });
    await incrementPackageBookings(pkg.id);
  } catch (e) {
    await prisma.booking.delete({ where: { id: booking.id } }).catch(() => {});
    throw e;
  }

  if (assignedToId) {
    findSalesRepEmail(assignedToId).then(async (rep) => {
      if (rep?.email) {
        try {
          const { sendLeadAssignmentEmail } = await import('../utils/email.js');
          await sendLeadAssignmentEmail({
            salesRep: rep,
            lead: { id: leadId, name: sanitizedName, email: sanitizedEmail, phone: normalizedPhone, destination: pkg.destination },
            assignmentMode: 'auto',
          });
        } catch (e) {
          req.log.error({ err: e }, 'Failed to send assignment email');
        }
      }
    }).catch(() => {});
  }

  res.status(201).json({
    success: true,
    message: 'Booking request submitted successfully',
    data: { bookingId: booking.id, leadId, salesRepId: assignedToId || null },
  });
});

export const getUserBookings = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError('User ID is required', 401);

  const bookings = await prisma.$queryRaw`
    SELECT
      b.id, b."userId", b."packageId", b."travelDate", b."endDate",
      b."numberOfTravelers", b."totalAmount", b."paidAmount",
      b."paymentStatus", b."bookingStatus", b."specialRequests",
      b."createdAt", b."updatedAt",
      p.title AS "packageName", p.destination AS "packageDestination",
      p."duration_days" AS "packageDuration",
      p."base_price" AS "packageBasePrice",
      p."default_margin_type" AS "packageMarginType",
      p."default_margin_input" AS "packageMarginInput",
      p."cover_image" AS "packageCoverImage", p.slug AS "packageSlug"
    FROM crm_bookings."Booking" b
    LEFT JOIN crm_packages."Package" p ON p.id = b."packageId"
    WHERE b."userId" = ${userId}
    ORDER BY b."createdAt" DESC
  `;

  res.status(200).json({ success: true, data: withPackageSellPrice(bookings || []) });
});

export const getRecentBookings = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const bookings = await prisma.$queryRaw`
    SELECT
      b.id, b."userId", b."packageId", b."travelDate", b."endDate",
      b."numberOfTravelers", b."totalAmount", b."paidAmount",
      b."paymentStatus", b."bookingStatus", b."specialRequests",
      b."confirmedAt", b."createdAt",
      p.title AS "packageName", p.destination AS "packageDestination",
      p."duration_days" AS "packageDuration",
      p."base_price" AS "packageBasePrice",
      p."default_margin_type" AS "packageMarginType",
      p."default_margin_input" AS "packageMarginInput",
      p."cover_image" AS "packageCoverImage", p.slug AS "packageSlug",
      u.name AS "userName", u.email AS "userEmail"
    FROM crm_bookings."Booking" b
    LEFT JOIN crm_packages."Package" p ON p.id = b."packageId"
    LEFT JOIN crm_users."User" u ON u.id = b."userId"
    WHERE b."bookingStatus" IN ('pending','confirmed','completed')
    ORDER BY b."confirmedAt" DESC NULLS LAST, b."createdAt" DESC
    LIMIT ${limit}
  `;

  res.status(200).json({ success: true, data: withPackageSellPrice(bookings || []) });
});
