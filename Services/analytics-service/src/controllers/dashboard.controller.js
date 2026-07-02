import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    leadsResult,
    bookingsResult,
    revenueResult,
    packagesResult,
    recentLeads,
    recentBookings,
    leadsByStatus,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'new') AS new_leads, COUNT(*) FILTER (WHERE status = 'converted') AS converted FROM crm_leads."Lead"`),
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "bookingStatus" = 'confirmed') AS confirmed, COUNT(*) FILTER (WHERE "bookingStatus" = 'pending') AS pending FROM crm_bookings."Booking"`),
    pool.query(`SELECT SUM("totalAmount") AS total_revenue, SUM("paidAmount") AS collected FROM crm_billing."Invoice" WHERE status != 'cancelled'`),
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "isActive" = true AND status = 'published') AS published FROM crm_packages."Package"`),
    pool.query(`SELECT id, name, email, status::text, source::text, "createdAt" FROM crm_leads."Lead" ORDER BY "createdAt" DESC LIMIT 5`),
    pool.query(`SELECT b.id, b."numberOfTravelers", b."bookingStatus"::text, b."totalAmount", b."createdAt", p.name AS "packageName" FROM crm_bookings."Booking" b LEFT JOIN crm_packages."Package" p ON p.id = b."packageId" ORDER BY b."createdAt" DESC LIMIT 5`),
    pool.query(`SELECT status::text, COUNT(*) AS count FROM crm_leads."Lead" GROUP BY status`),
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
