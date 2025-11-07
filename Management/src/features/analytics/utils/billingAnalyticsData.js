/**
 * Mock data for Billing Analytics
 * Supports daily, weekly, monthly, and annual time ranges
 */

// Daily Revenue Data (last 30 days)
const dailyRevenueData = [
  { label: "Nov 1", revenue: 1200, target: 1500, outstanding: 200, potentialRevenue: 450 },
  { label: "Nov 2", revenue: 1500, target: 1500, outstanding: 150, potentialRevenue: 420 },
  { label: "Nov 3", revenue: 1400, target: 1500, outstanding: 250, potentialRevenue: 480 },
  { label: "Nov 4", revenue: 1800, target: 1500, outstanding: 100, potentialRevenue: 350 },
  { label: "Nov 5", revenue: 1650, target: 1500, outstanding: 180, potentialRevenue: 520 },
  { label: "Nov 6", revenue: 1900, target: 1500, outstanding: 120, potentialRevenue: 380 },
  { label: "Nov 7", revenue: 1550, target: 1500, outstanding: 190, potentialRevenue: 410 },
];

// Weekly Revenue Data
const weeklyRevenueData = [
  { label: "Week 1", revenue: 9000, target: 10500, outstanding: 1200, potentialRevenue: 2850 },
  { label: "Week 2", revenue: 11500, target: 10500, outstanding: 950, potentialRevenue: 2650 },
  { label: "Week 3", revenue: 10200, target: 10500, outstanding: 1400, potentialRevenue: 3100 },
  { label: "Week 4", revenue: 12800, target: 10500, outstanding: 800, potentialRevenue: 2400 },
];

// Monthly Revenue Data
export const revenueData = [
  { month: "Jan", revenue: 12000, target: 15000, outstanding: 2000, potentialRevenue: 4500 },
  { month: "Feb", revenue: 15000, target: 15000, outstanding: 1500, potentialRevenue: 3800 },
  { month: "Mar", revenue: 14000, target: 15000, outstanding: 2500, potentialRevenue: 5200 },
  { month: "Apr", revenue: 18000, target: 15000, outstanding: 1000, potentialRevenue: 3500 },
  { month: "May", revenue: 16500, target: 15000, outstanding: 1800, potentialRevenue: 4800 },
  { month: "Jun", revenue: 19000, target: 15000, outstanding: 1200, potentialRevenue: 4200 },
];

// Annual Revenue Data
const annualRevenueData = [
  { year: "2020", revenue: 165000, target: 180000, outstanding: 18000, potentialRevenue: 52000 },
  { year: "2021", revenue: 198000, target: 180000, outstanding: 22000, potentialRevenue: 58000 },
  { year: "2022", revenue: 245000, target: 240000, outstanding: 28000, potentialRevenue: 72000 },
  { year: "2023", revenue: 312000, target: 300000, outstanding: 35000, potentialRevenue: 85000 },
  { year: "2024", revenue: 418000, target: 400000, outstanding: 42000, potentialRevenue: 98000 },
];

// Daily Outstanding Data
const dailyOutstandingData = [
  { label: "Nov 1", outstanding: 420, pendingLeads: 28, potentialRevenue: 8500 },
  { label: "Nov 2", outstanding: 350, pendingLeads: 24, potentialRevenue: 7200 },
  { label: "Nov 3", outstanding: 510, pendingLeads: 35, potentialRevenue: 9800 },
  { label: "Nov 4", outstanding: 280, pendingLeads: 18, potentialRevenue: 6500 },
  { label: "Nov 5", outstanding: 360, pendingLeads: 22, potentialRevenue: 8100 },
  { label: "Nov 6", outstanding: 310, pendingLeads: 19, potentialRevenue: 7600 },
  { label: "Nov 7", outstanding: 420, pendingLeads: 28, potentialRevenue: 8900 },
];

// Weekly Outstanding Data
const weeklyOutstandingData = [
  { label: "Week 1", outstanding: 1920, pendingLeads: 128, potentialRevenue: 32500 },
  { label: "Week 2", outstanding: 1650, pendingLeads: 110, potentialRevenue: 28200 },
  { label: "Week 3", outstanding: 2180, pendingLeads: 145, potentialRevenue: 38700 },
  { label: "Week 4", outstanding: 1480, pendingLeads: 95, potentialRevenue: 22100 },
];

// Monthly Outstanding Data
export const outstandingTrendData = [
  { month: "Jan", outstanding: 4200, pendingLeads: 28, potentialRevenue: 8500 },
  { month: "Feb", outstanding: 3500, pendingLeads: 24, potentialRevenue: 7200 },
  { month: "Mar", outstanding: 5100, pendingLeads: 35, potentialRevenue: 9800 },
  { month: "Apr", outstanding: 2800, pendingLeads: 18, potentialRevenue: 6500 },
  { month: "May", outstanding: 3600, pendingLeads: 22, potentialRevenue: 8100 },
  { month: "Jun", outstanding: 3100, pendingLeads: 19, potentialRevenue: 7600 },
];

// Annual Outstanding Data
const annualOutstandingData = [
  { year: "2020", outstanding: 18000, pendingLeads: 120, potentialRevenue: 32000 },
  { year: "2021", outstanding: 22000, pendingLeads: 145, potentialRevenue: 42000 },
  { year: "2022", outstanding: 28000, pendingLeads: 185, potentialRevenue: 58000 },
  { year: "2023", outstanding: 35000, pendingLeads: 225, potentialRevenue: 72000 },
  { year: "2024", outstanding: 42000, pendingLeads: 280, potentialRevenue: 85000 },
];

export const paymentStatusData = [
  { name: "Paid", value: 68 },
  { name: "Partially Paid", value: 12 },
  { name: "Outstanding", value: 20 },
];

export const invoiceBreakdownData = [
  { category: "Adventure Packages", revenue: 45000, invoices: 24 },
  { category: "Hotel Bookings", revenue: 38000, invoices: 32 },
  { category: "Activities", revenue: 22000, invoices: 28 },
  { category: "Transportation", revenue: 18000, invoices: 15 },
  { category: "Misc Services", revenue: 12000, invoices: 11 },
];

/**
 * Get revenue data based on time range
 * @param {string} timeRange - 'daily', 'weekly', 'monthly', or 'annual'
 * @returns {Array} Revenue data for the selected time range
 */
export const getRevenueData = (timeRange) => {
  switch (timeRange) {
    case "daily":
      return dailyRevenueData;
    case "weekly":
      return weeklyRevenueData;
    case "annual":
      return annualRevenueData;
    case "monthly":
    default:
      return revenueData;
  }
};

/**
 * Get outstanding data based on time range
 * @param {string} timeRange - 'daily', 'weekly', 'monthly', or 'annual'
 * @returns {Array} Outstanding data for the selected time range
 */
export const getOutstandingData = (timeRange) => {
  switch (timeRange) {
    case "daily":
      return dailyOutstandingData;
    case "weekly":
      return weeklyOutstandingData;
    case "annual":
      return annualOutstandingData;
    case "monthly":
    default:
      return outstandingTrendData;
  }
};

/**
 * Calculate aggregated statistics based on time range
 * @param {string} timeRange - 'daily', 'weekly', 'monthly', or 'annual'
 * @returns {Object} Statistics object
 */
export const getAggregatedStats = (timeRange) => {
  const revenueDataSet = getRevenueData(timeRange);
  const outstandingDataSet = getOutstandingData(timeRange);

  if (!revenueDataSet || revenueDataSet.length === 0) {
    return { totalRevenue: 0, totalOutstanding: 0, totalPotentialRevenue: 0, pendingInvoices: 0 };
  }

  const totalRevenue = revenueDataSet.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalOutstanding = outstandingDataSet.reduce((sum, item) => sum + (item.outstanding || 0), 0);
  const totalPotentialRevenue = revenueDataSet.reduce((sum, item) => sum + (item.potentialRevenue || 0), 0);
  const pendingInvoices = outstandingDataSet.reduce((sum, item) => sum + (item.pendingLeads || 0), 0);

  return {
    totalRevenue,
    totalOutstanding,
    totalPotentialRevenue,
    pendingInvoices,
  };
};
