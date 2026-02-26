/**
 * Analytics PDF Export Controller
 * Handles PDF generation for all analytics reports
 */

import asyncHandler from '../utils/asyncHandler.js';
import { generateAnalyticsPDF } from '../utils/analyticsPDFGenerator.js';
import Lead from '../models/lead.model.js';
import Invoice from '../models/invoice.model.js';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import Package from '../models/package.model.js';
import logger from '../config/logger.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Export Lead Analytics as PDF
 * @route POST /api/v1/analytics/leads/export-pdf
 * @access Private/Admin
 * @body {string} timeRange - 'daily', 'weekly', 'monthly', 'annual'
 * @body {Array} chartsSvg - Array of SVG chart data
 */
export const exportLeadAnalyticsPDF = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly', chartsSvg = [], summaryData = {} } = req.body;

  logger.info(`[Lead PDF Export] Starting export with ${chartsSvg.length} charts, time range: ${timeRange}`);
  logger.info('[Lead PDF Export] First chart sample:', chartsSvg[0] ? {
    title: chartsSvg[0].title,
    hasImageData: !!chartsSvg[0].imageData,
    imageDataLength: chartsSvg[0].imageData?.length,
  } : 'No charts');

  try {
    // Fetch lead statistics
    const statusCounts = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalsByStatus = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count || 0;
      return acc;
    }, {});

    const totalLeads = statusCounts.reduce((sum, item) => sum + (item.count || 0), 0);

    // Build stats
    const stats = [
      { label: 'Total Leads', value: totalLeads.toString() },
      { label: 'New', value: (totalsByStatus.new || 0).toString() },
      { label: 'Contacted', value: (totalsByStatus.contacted || 0).toString() },
      { label: 'Interested', value: (totalsByStatus.interested || 0).toString() },
      { label: 'Converted', value: (totalsByStatus.converted || 0).toString() },
    ];

    // Process charts
    const charts = chartsSvg.map((chart) => ({
      title: chart.title || 'Chart',
      imageData: chart.imageData,
      description: chart.description,
    }));

    // Generate PDF
    logger.info(`[Lead PDF Export] Generating PDF with ${charts.length} charts`);
    const pdfBuffer = await generateAnalyticsPDF({
      analyticsType: 'lead',
      title: 'Lead Analytics Report',
      timeRange,
      stats,
      charts,
      summary: { data: summaryData.data || [] },
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF generation produced empty buffer');
    }

    logger.info(`[Lead PDF Export] ✅ Generated PDF buffer: ${pdfBuffer.length} bytes`);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lead-analytics-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    logger.info(`[Lead PDF Export] Sending PDF response (${pdfBuffer.length} bytes)...`);
    res.end(pdfBuffer, 'binary');
  } catch (error) {
    logger.error('[Lead PDF Export] ❌ Error:', error.message);
    throw error;
  }
});

/**
 * Export Billing Analytics as PDF
 * @route POST /api/v1/analytics/billing/export-pdf
 * @access Private/Admin
 * @body {string} timeRange - 'daily', 'weekly', 'monthly', 'annual'
 * @body {Array} chartsSvg - Array of SVG chart data
 */
export const exportBillingAnalyticsPDF = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly', chartsSvg = [], summaryData = {} } = req.body;

  logger.info(`[Billing PDF Export] Starting export with ${chartsSvg.length} charts, time range: ${timeRange}`);

  try {
    // Fetch billing statistics
    const invoices = await Invoice.find();

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const outstandingAmount = totalRevenue - paidAmount;

    const paymentStatuses = invoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});

    // Build stats
    const stats = [
      { label: 'Total Revenue', value: `₹${(totalRevenue / 100000).toFixed(1)}L` },
      { label: 'Amount Paid', value: `₹${(paidAmount / 100000).toFixed(1)}L` },
      { label: 'Outstanding', value: `₹${(outstandingAmount / 100000).toFixed(1)}L` },
      { label: 'Total Invoices', value: invoices.length.toString() },
    ];

    // Process charts
    const charts = chartsSvg.map((chart) => ({
      title: chart.title || 'Chart',
      imageData: chart.imageData,
      description: chart.description,
    }));

    logger.info(`[Lead PDF Export] Processed ${charts.length} charts. First chart imageData length:`, charts[0]?.imageData?.length);

    // Generate PDF
    logger.info(`[Billing PDF Export] Generating PDF with ${charts.length} charts`);
    const pdfBuffer = await generateAnalyticsPDF({
      analyticsType: 'billing',
      title: 'Billing Analytics Report',
      timeRange,
      stats,
      charts,
      summary: { data: summaryData.data || [] },
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF generation produced empty buffer');
    }

    logger.info(`[Billing PDF Export] ✅ Generated PDF buffer: ${pdfBuffer.length} bytes`);

    // Set headers before sending
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="billing-analytics-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Use res.end() for binary data instead of res.send()
    logger.info(`[Billing PDF Export] Sending PDF response (${pdfBuffer.length} bytes)...`);
    res.end(pdfBuffer, 'binary');
  } catch (error) {
    logger.error('[Billing PDF Export] ❌ Error:', error.message);
    throw error;
  }
});

/**
 * Export User Analytics as PDF
 * @route POST /api/v1/analytics/users/export-pdf
 * @access Private/Admin
 * @body {string} timeRange - 'daily', 'weekly', 'monthly', 'annual'
 * @body {Array} chartsSvg - Array of SVG chart data
 */
export const exportUserAnalyticsPDF = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly', chartsSvg = [], summaryData = {} } = req.body;

  // Fetch user statistics
  const users = await User.find();
  const usersWithBookings = await Booking.distinct('userId');
  const userRoles = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  // Build stats
  const stats = [
    { label: 'Total Users', value: users.length.toString() },
    { label: 'Customers', value: (userRoles.customer || 0).toString() },
    { label: 'Sales Reps', value: (userRoles.salesRep || 0).toString() },
    { label: 'Users with Bookings', value: usersWithBookings.length.toString() },
  ];

  // Process charts
  const charts = chartsSvg.map((chart) => ({
    title: chart.title || 'Chart',
    imageData: chart.imageData,
    description: chart.description,
  }));

  // Generate PDF
  const pdfBuffer = await generateAnalyticsPDF({
    analyticsType: 'user',
    title: 'User Analytics Report',
    timeRange,
    stats,
    charts,
    summary: { data: summaryData.data || [] },
  });

  logger.info(`[User PDF Export] ✅ Generated PDF buffer: ${pdfBuffer.length} bytes`);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="user-analytics-${Date.now()}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.end(pdfBuffer, 'binary');
});

/**
 * Export Package Analytics as PDF
 * @route POST /api/v1/analytics/packages/export-pdf
 * @access Private/Admin
 * @body {string} timeRange - 'daily', 'weekly', 'monthly', 'annual'
 * @body {Array} chartsSvg - Array of SVG chart data
 */
export const exportPackageAnalyticsPDF = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly', chartsSvg = [], summaryData = {} } = req.body;

  // Fetch package statistics
  const packages = await Package.find();
  const publishedPackages = packages.filter((p) => p.isPublished).length;
  const leads = await Lead.countDocuments();
  const bookings = await Booking.countDocuments();

  // Build stats
  const stats = [
    { label: 'Total Packages', value: packages.length.toString() },
    { label: 'Published', value: publishedPackages.toString() },
    { label: 'Inquiries', value: leads.toString() },
    { label: 'Conversions', value: bookings.toString() },
  ];

  // Process charts
  const charts = chartsSvg.map((chart) => ({
    title: chart.title || 'Chart',
    imageData: chart.imageData,
    description: chart.description,
  }));

  // Generate PDF
  const pdfBuffer = await generateAnalyticsPDF({
    analyticsType: 'package',
    title: 'Package Analytics Report',
    timeRange,
    stats,
    charts,
    summary: { data: summaryData.data || [] },
  });

  logger.info(`[Package PDF Export] ✅ Generated PDF buffer: ${pdfBuffer.length} bytes`);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="package-analytics-${Date.now()}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.end(pdfBuffer, 'binary');
});

/**
 * Export Website Analytics as PDF
 * @route POST /api/v1/analytics/website/export-pdf
 * @access Private/Admin
 * @body {string} timeRange - 'daily', 'weekly', 'monthly', 'annual'
 * @body {Array} chartsSvg - Array of SVG chart data
 */
export const exportWebsiteAnalyticsPDF = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly', chartsSvg = [], summaryData = {} } = req.body;

  // Fetch website statistics
  const leads = await Lead.find();
  const bookings = await Booking.find();

  const totalLeads = leads.length;
  const totalBookings = bookings.length;
  const conversionRate = totalLeads > 0 ? ((totalBookings / totalLeads) * 100).toFixed(1) : '0';

  // Get unique destinations from leads
  const uniqueDestinations = new Set(leads.map((l) => l.destination).filter(Boolean));

  // Build stats
  const stats = [
    { label: 'Total Searches', value: totalLeads.toString() },
    { label: 'Total Bookings', value: totalBookings.toString() },
    { label: 'Conversion Rate', value: `${conversionRate}%` },
    { label: 'Unique Destinations', value: uniqueDestinations.size.toString() },
  ];

  // Process charts
  const charts = chartsSvg.map((chart) => ({
    title: chart.title || 'Chart',
    imageData: chart.imageData,
    description: chart.description,
  }));

  // Generate PDF
  const pdfBuffer = await generateAnalyticsPDF({
    analyticsType: 'website',
    title: 'Website Analytics Report',
    timeRange,
    stats,
    charts,
    summary: { data: summaryData.data || [] },
  });

  logger.info(`[Website PDF Export] ✅ Generated PDF buffer: ${pdfBuffer.length} bytes`);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="website-analytics-${Date.now()}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.end(pdfBuffer, 'binary');
});
