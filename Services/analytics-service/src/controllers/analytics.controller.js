import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getLeadAnalyticsOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = startDate && endDate
    ? `AND l."createdAt" BETWEEN '${new Date(startDate).toISOString()}' AND '${new Date(new Date(endDate).setHours(23,59,59,999)).toISOString()}'`
    : '';

  const [totalResult, byStatus, bySource, byPlatform, conversionRate, avgPerDay] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM crm_leads."Lead" l WHERE 1=1 ${dateFilter}`),
    pool.query(`SELECT status::text, COUNT(*) AS count FROM crm_leads."Lead" l WHERE 1=1 ${dateFilter} GROUP BY status ORDER BY count DESC`),
    pool.query(`SELECT source::text, COUNT(*) AS count FROM crm_leads."Lead" l WHERE 1=1 ${dateFilter} GROUP BY source ORDER BY count DESC`),
    pool.query(`SELECT platform::text, COUNT(*) AS count FROM crm_leads."Lead" l WHERE 1=1 ${dateFilter} GROUP BY platform ORDER BY count DESC`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'converted') AS converted, COUNT(*) AS total FROM crm_leads."Lead" l WHERE 1=1 ${dateFilter}`),
    pool.query(`SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count FROM crm_leads."Lead" WHERE 1=1 ${dateFilter} GROUP BY day ORDER BY day DESC LIMIT 30`),
  ]);

  const conv = conversionRate.rows[0];
  res.json({
    success: true,
    data: {
      total: Number(totalResult.rows[0].total),
      byStatus: byStatus.rows,
      bySource: bySource.rows,
      byPlatform: byPlatform.rows,
      conversionRate: conv.total > 0 ? (Number(conv.converted) / Number(conv.total)) * 100 : 0,
      convertedCount: Number(conv.converted),
      dailyTrend: avgPerDay.rows,
    },
  });
});

export const getBillingAnalyticsOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = startDate && endDate
    ? `AND i."createdAt" BETWEEN '${new Date(startDate).toISOString()}' AND '${new Date(new Date(endDate).setHours(23,59,59,999)).toISOString()}'`
    : '';

  const [revenue, byStatus, topCustomers, monthlyRevenue] = await Promise.all([
    pool.query(`SELECT SUM("totalAmount") AS billed, SUM("paidAmount") AS collected, SUM("outstandingAmount") AS outstanding FROM crm_billing."Invoice" i WHERE status != 'cancelled' ${dateFilter}`),
    pool.query(`SELECT status::text, COUNT(*) AS count, SUM("totalAmount") AS total FROM crm_billing."Invoice" i WHERE 1=1 ${dateFilter} GROUP BY status`),
    pool.query(`SELECT "customerName", "customerEmail", SUM("totalAmount") AS total FROM crm_billing."Invoice" i WHERE status != 'cancelled' ${dateFilter} GROUP BY "customerName","customerEmail" ORDER BY total DESC LIMIT 10`),
    pool.query(`SELECT DATE_TRUNC('month', "createdAt") AS month, SUM("totalAmount") AS revenue FROM crm_billing."Invoice" WHERE status != 'cancelled' GROUP BY month ORDER BY month DESC LIMIT 12`),
  ]);

  res.json({
    success: true,
    data: {
      revenue: revenue.rows[0],
      byStatus: byStatus.rows,
      topCustomers: topCustomers.rows,
      monthlyRevenue: monthlyRevenue.rows,
    },
  });
});

export const getPackageAnalyticsOverview = asyncHandler(async (req, res) => {
  const [total, byCategory, topBooked, avgRating, views] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "isActive" = true) AS active FROM crm_packages."Package"`),
    pool.query(`SELECT category::text, COUNT(*) AS count FROM crm_packages."Package" GROUP BY category ORDER BY count DESC`),
    pool.query(`SELECT id, name, destination, bookings, rating, "numReviews" FROM crm_packages."Package" ORDER BY bookings DESC LIMIT 10`),
    pool.query(`SELECT AVG(rating) AS avg_rating, SUM("numReviews") AS total_reviews FROM crm_packages."Package" WHERE "isActive" = true`),
    pool.query(`SELECT SUM(views) AS total_views FROM crm_packages."Package"`),
  ]);

  res.json({
    success: true,
    data: {
      total: Number(total.rows[0].total),
      active: Number(total.rows[0].active),
      byCategory: byCategory.rows,
      topBooked: topBooked.rows,
      avgRating: avgRating.rows[0].avg_rating,
      totalReviews: Number(avgRating.rows[0].total_reviews),
      totalViews: Number(views.rows[0].total_views || 0),
    },
  });
});

export const getUserAnalyticsOverview = asyncHandler(async (req, res) => {
  const [total, byRole, recent] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "isActive" = true) AS active FROM crm_users."User"`),
    pool.query(`SELECT role::text, COUNT(*) AS count FROM crm_users."User" GROUP BY role ORDER BY count DESC`),
    pool.query(`SELECT id, name, email, role::text, "createdAt" FROM crm_users."User" ORDER BY "createdAt" DESC LIMIT 10`),
  ]);

  res.json({
    success: true,
    data: {
      total: Number(total.rows[0].total),
      active: Number(total.rows[0].active),
      byRole: byRole.rows,
      recentUsers: recent.rows,
    },
  });
});

export const getSalesRepPersonalPerformance = asyncHandler(async (req, res) => {
  const repId = req.user.id;
  const [leads, converted, bookings, recentLeads] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM crm_leads."Lead" WHERE "assignedToId" = $1`, [repId]),
    pool.query(`SELECT COUNT(*) AS count FROM crm_leads."Lead" WHERE "assignedToId" = $1 AND status = 'converted'`, [repId]),
    pool.query(`SELECT COUNT(*) AS count FROM crm_bookings."Booking" WHERE "assignedToId" = $1`, [repId]),
    pool.query(`SELECT id, name, email, status::text, "createdAt" FROM crm_leads."Lead" WHERE "assignedToId" = $1 ORDER BY "createdAt" DESC LIMIT 10`, [repId]),
  ]);

  const totalLeads = Number(leads.rows[0].total);
  const convertedLeads = Number(converted.rows[0].count);
  res.json({
    success: true,
    data: {
      totalLeads,
      convertedLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
      totalBookings: Number(bookings.rows[0].count),
      recentLeads: recentLeads.rows,
    },
  });
});

export const getWebsiteAnalyticsOverview = asyncHandler(async (req, res) => {
  const [packageViews, bookings, leads, topPackages] = await Promise.all([
    pool.query(`SELECT SUM(views) AS total_views FROM crm_packages."Package"`),
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "bookingStatus" = 'confirmed') AS confirmed FROM crm_bookings."Booking"`),
    pool.query(`SELECT COUNT(*) AS total, source::text FROM crm_leads."Lead" GROUP BY source ORDER BY total DESC`),
    pool.query(`SELECT id, name, destination, views, bookings, rating FROM crm_packages."Package" WHERE "isActive" = true ORDER BY views DESC LIMIT 10`),
  ]);

  res.json({
    success: true,
    data: {
      totalPageViews: Number(packageViews.rows[0].total_views || 0),
      bookings: bookings.rows[0],
      leadsBySource: leads.rows,
      topPackages: topPackages.rows,
    },
  });
});
