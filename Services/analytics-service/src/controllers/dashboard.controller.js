import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  // salesRep sees only their own leads/bookings/revenue; packages are a
  // shared catalog with no rep attribution and stay company-wide for everyone.
  const repId = req.user.role === 'salesRep' ? req.user.id : null;

  const [
    leadsResult,
    bookingsResult,
    revenueResult,
    packagesResult,
    recentLeads,
    recentBookings,
    leadsByStatus,
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "lifecycleStatus" = 'NEW') AS new_leads, COUNT(*) FILTER (WHERE "lifecycleStatus" = 'CONFIRMED') AS converted
       FROM crm_leads."Lead" WHERE ($1::text IS NULL OR "assignedToId" = $1)`,
      [repId]
    ),
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "bookingStatus" = 'confirmed') AS confirmed, COUNT(*) FILTER (WHERE "bookingStatus" = 'pending') AS pending
       FROM crm_bookings."Booking" WHERE ($1::text IS NULL OR "assignedToId" = $1)`,
      [repId]
    ),
    pool.query(
      `SELECT SUM(i."totalAmount") AS total_revenue, SUM(i."paidAmount") AS collected
       FROM crm_billing."Invoice" i
       JOIN crm_leads."Lead" l ON l.id = i."leadId"
       WHERE i.status != 'cancelled' AND ($1::text IS NULL OR l."assignedToId" = $1)`,
      [repId]
    ),
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "is_active" = true) AS published FROM crm_packages."Package"`),
    pool.query(
      `SELECT id, name, email, "lifecycleStatus"::text AS status, source::text, "createdAt" FROM crm_leads."Lead"
       WHERE ($1::text IS NULL OR "assignedToId" = $1) ORDER BY "createdAt" DESC LIMIT 5`,
      [repId]
    ),
    pool.query(
      `SELECT b.id, b."numberOfTravelers", b."bookingStatus"::text, b."totalAmount", b."createdAt", p.title AS "packageName"
       FROM crm_bookings."Booking" b LEFT JOIN crm_packages."Package" p ON p.id = b."packageId"
       WHERE ($1::text IS NULL OR b."assignedToId" = $1) ORDER BY b."createdAt" DESC LIMIT 5`,
      [repId]
    ),
    pool.query(
      `SELECT "lifecycleStatus"::text AS status, COUNT(*) AS count FROM crm_leads."Lead"
       WHERE ($1::text IS NULL OR "assignedToId" = $1) GROUP BY "lifecycleStatus"`,
      [repId]
    ),
  ]);

  res.json({
    success: true,
    data: {
      leads: {
        total: Number(leadsResult.rows[0].total),
        new: Number(leadsResult.rows[0].new_leads),
        converted: Number(leadsResult.rows[0].converted),
      },
      bookings: {
        total: Number(bookingsResult.rows[0].total),
        confirmed: Number(bookingsResult.rows[0].confirmed),
        pending: Number(bookingsResult.rows[0].pending),
      },
      revenue: {
        total: Number(revenueResult.rows[0].total_revenue || 0),
        collected: Number(revenueResult.rows[0].collected || 0),
      },
      packages: {
        total: Number(packagesResult.rows[0].total),
        published: Number(packagesResult.rows[0].published),
      },
      recentLeads: recentLeads.rows,
      recentBookings: recentBookings.rows,
      leadsByStatus: leadsByStatus.rows,
    },
  });
});
