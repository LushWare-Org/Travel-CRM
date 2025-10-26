import BillingService from '../services/billing.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

/**
 * @desc    Get comprehensive billing summary for a lead
 * @route   GET /api/v1/billing/summary/lead/:leadId
 * @access  Private
 */
export const getLeadBillingSummary = asyncHandler(async (req, res, next) => {
  const summary = await BillingService.getLeadBillingSummary(req.params.leadId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * @desc    Get financial reports
 * @route   GET /api/v1/billing/reports/financial
 * @access  Private (Admin, Accountant)
 */
export const getFinancialReports = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError('Please provide startDate and endDate', 400));
  }

  const reports = await BillingService.getFinancialReports(
    startDate,
    endDate,
    req.query,
  );

  res.status(200).json({
    success: true,
    data: reports,
  });
});

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/billing/dashboard
 * @access  Private (Admin, Staff)
 */
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  const Quotation = (await import('../models/quotation.model.js')).default;
  const Invoice = (await import('../models/invoice.model.js')).default;
  const PaymentReceipt = (await import('../models/paymentReceipt.model.js')).default;
  const CreditNote = (await import('../models/creditNote.model.js')).default;

  const [
    totalQuotations,
    pendingQuotations,
    totalInvoices,
    paidInvoices,
    overdueInvoices,
    totalRevenue,
    totalCollected,
    totalOutstanding,
    recentPayments,
    pendingApprovals,
  ] = await Promise.all([
    Quotation.countDocuments(),
    Quotation.countDocuments({ status: { $in: ['sent', 'viewed'] } }),
    Invoice.countDocuments({ status: { $ne: 'cancelled' } }),
    Invoice.countDocuments({ paymentStatus: 'paid' }),
    Invoice.countDocuments({
      status: { $in: ['sent', 'partial', 'overdue'] },
      dueDate: { $lt: new Date() },
    }),
    Invoice.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    PaymentReceipt.aggregate([
      { $match: { receiptStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Invoice.aggregate([
      { $match: { status: { $ne: 'cancelled' }, paymentStatus: { $ne: 'paid' } } },
      { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
    ]),
    PaymentReceipt.find({ receiptStatus: { $ne: 'cancelled' } })
      .populate('lead', 'name')
      .populate('invoice', 'invoiceNumber')
      .sort({ paymentDate: -1 })
      .limit(5),
    CreditNote.countDocuments({
      status: 'draft',
      approvalRequired: true,
      approvedAt: null,
      rejectedAt: null,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      quotations: {
        total: totalQuotations,
        pending: pendingQuotations,
      },
      invoices: {
        total: totalInvoices,
        paid: paidInvoices,
        overdue: overdueInvoices,
      },
      financial: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCollected: totalCollected[0]?.total || 0,
        totalOutstanding: totalOutstanding[0]?.total || 0,
        collectionRate:
          totalRevenue[0]?.total > 0
            ? (((totalCollected[0]?.total || 0) / (totalRevenue[0]?.total || 1)) * 100).toFixed(2)
            : 0,
      },
      recentPayments,
      pendingApprovals,
    },
  });

  return undefined;
});

/**
 * @desc    Get aging report (Outstanding invoices by age)
 * @route   GET /api/v1/billing/reports/aging
 * @access  Private (Admin, Accountant)
 */
export const getAgingReport = asyncHandler(async (req, res) => {
  const Invoice = (await import('../models/invoice.model.js')).default;

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [current, thirtyDays, sixtyDays, ninetyDays, overNinety] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          paymentStatus: { $ne: 'paid' },
          status: { $ne: 'cancelled' },
          dueDate: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$outstandingAmount' },
        },
      },
    ]),
    Invoice.aggregate([
      {
        $match: {
          paymentStatus: { $ne: 'paid' },
          status: { $ne: 'cancelled' },
          dueDate: { $gte: thirtyDaysAgo, $lt: today },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$outstandingAmount' },
        },
      },
    ]),
    Invoice.aggregate([
      {
        $match: {
          paymentStatus: { $ne: 'paid' },
          status: { $ne: 'cancelled' },
          dueDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$outstandingAmount' },
        },
      },
    ]),
    Invoice.aggregate([
      {
        $match: {
          paymentStatus: { $ne: 'paid' },
          status: { $ne: 'cancelled' },
          dueDate: { $gte: ninetyDaysAgo, $lt: sixtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$outstandingAmount' },
        },
      },
    ]),
    Invoice.aggregate([
      {
        $match: {
          paymentStatus: { $ne: 'paid' },
          status: { $ne: 'cancelled' },
          dueDate: { $lt: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$outstandingAmount' },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      current: current[0] || { count: 0, total: 0 },
      '1-30 days': thirtyDays[0] || { count: 0, total: 0 },
      '31-60 days': sixtyDays[0] || { count: 0, total: 0 },
      '61-90 days': ninetyDays[0] || { count: 0, total: 0 },
      'over 90 days': overNinety[0] || { count: 0, total: 0 },
    },
  });
});

/**
 * @desc    Get payment method breakdown
 * @route   GET /api/v1/billing/reports/payment-methods
 * @access  Private (Admin, Accountant)
 */
export const getPaymentMethodBreakdown = asyncHandler(async (req, res) => {
  const PaymentReceipt = (await import('../models/paymentReceipt.model.js')).default;

  const { startDate, endDate } = req.query;

  const matchQuery = { receiptStatus: { $ne: 'cancelled' } };

  if (startDate && endDate) {
    matchQuery.paymentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const breakdown = await PaymentReceipt.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: breakdown,
  });
});

/**
 * @desc    Get revenue trends
 * @route   GET /api/v1/billing/reports/revenue-trends
 * @access  Private (Admin, Accountant)
 */
export const getRevenueTrends = asyncHandler(async (req, res) => {
  const Invoice = (await import('../models/invoice.model.js')).default;
  const PaymentReceipt = (await import('../models/paymentReceipt.model.js')).default;

  const { period = 'monthly', year = new Date().getFullYear() } = req.query;

  let groupBy;
  if (period === 'monthly') {
    groupBy = { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
  } else if (period === 'quarterly') {
    groupBy = { quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } }, year: { $year: '$createdAt' } };
  } else {
    groupBy = { year: { $year: '$createdAt' } };
  }

  const [invoiceTrends, paymentTrends] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.quarter': 1 } },
    ]),
    PaymentReceipt.aggregate([
      {
        $match: {
          receiptStatus: { $ne: 'cancelled' },
          paymentDate: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.quarter': 1 } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      period,
      year,
      invoices: invoiceTrends,
      payments: paymentTrends,
    },
  });
});

/**
 * @desc    Get top customers by revenue
 * @route   GET /api/v1/billing/reports/top-customers
 * @access  Private (Admin, Accountant)
 */
export const getTopCustomers = asyncHandler(async (req, res) => {
  const Invoice = (await import('../models/invoice.model.js')).default;

  const { limit = 10 } = req.query;

  const topCustomers = await Invoice.aggregate([
    {
      $match: { status: { $ne: 'cancelled' } },
    },
    {
      $group: {
        _id: '$lead',
        totalInvoiced: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        invoiceCount: { $sum: 1 },
      },
    },
    {
      $sort: { totalInvoiced: -1 },
    },
    {
      $limit: parseInt(limit, 10),
    },
    {
      $lookup: {
        from: 'leads',
        localField: '_id',
        foreignField: '_id',
        as: 'leadInfo',
      },
    },
    {
      $unwind: '$leadInfo',
    },
    {
      $project: {
        _id: 1,
        name: '$leadInfo.name',
        email: '$leadInfo.email',
        phone: '$leadInfo.phone',
        totalInvoiced: 1,
        totalPaid: 1,
        invoiceCount: 1,
        outstanding: { $subtract: ['$totalInvoiced', '$totalPaid'] },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: topCustomers,
  });
});

/**
 * @desc    Export billing data
 * @route   GET /api/v1/billing/export
 * @access  Private (Admin, Accountant)
 */
export const exportBillingData = asyncHandler(async (req, res, next) => {
  const {
    type, startDate, endDate,
  } = req.query;

  if (!type || !startDate || !endDate) {
    return next(new AppError('Please provide type, startDate, and endDate', 400));
  }

  // TODO: Implement CSV/Excel export
  // For now, returning JSON

  let data;
  const dateFilter = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  if (type === 'quotations') {
    const Quotation = (await import('../models/quotation.model.js')).default;
    data = await Quotation.find(dateFilter)
      .populate('lead', 'name email phone')
      .lean();
  } else if (type === 'invoices') {
    const Invoice = (await import('../models/invoice.model.js')).default;
    data = await Invoice.find(dateFilter)
      .populate('lead', 'name email phone')
      .lean();
  } else if (type === 'receipts') {
    const PaymentReceipt = (await import('../models/paymentReceipt.model.js')).default;
    data = await PaymentReceipt.find({
      paymentDate: dateFilter.createdAt,
    })
      .populate('lead', 'name email phone')
      .populate('invoice', 'invoiceNumber')
      .lean();
  } else if (type === 'credit-notes') {
    const CreditNote = (await import('../models/creditNote.model.js')).default;
    data = await CreditNote.find(dateFilter)
      .populate('lead', 'name email phone')
      .populate('invoice', 'invoiceNumber')
      .lean();
  } else {
    return next(new AppError('Invalid export type', 400));
  }

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });

  return undefined;
});
