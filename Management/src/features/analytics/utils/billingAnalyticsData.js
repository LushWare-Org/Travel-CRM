/**
 * Mock data for Billing Analytics
 */

export const revenueData = [
  { month: "Jan", revenue: 12000, target: 15000, outstanding: 2000 },
  { month: "Feb", revenue: 15000, target: 15000, outstanding: 1500 },
  { month: "Mar", revenue: 14000, target: 15000, outstanding: 2500 },
  { month: "Apr", revenue: 18000, target: 15000, outstanding: 1000 },
  { month: "May", revenue: 16500, target: 15000, outstanding: 1800 },
  { month: "Jun", revenue: 19000, target: 15000, outstanding: 1200 },
];

export const paymentStatusData = [
  { name: "Paid", value: 68 },
  { name: "Partially Paid", value: 12 },
  { name: "Outstanding", value: 20 },
];

export const outstandingTrendData = [
  { month: "Jan", outstanding: 4200, pendingLeads: 28 },
  { month: "Feb", outstanding: 3500, pendingLeads: 24 },
  { month: "Mar", outstanding: 5100, pendingLeads: 35 },
  { month: "Apr", outstanding: 2800, pendingLeads: 18 },
  { month: "May", outstanding: 3600, pendingLeads: 22 },
  { month: "Jun", outstanding: 3100, pendingLeads: 19 },
];

export const invoiceBreakdownData = [
  { category: "Adventure Packages", revenue: 45000, invoices: 24 },
  { category: "Hotel Bookings", revenue: 38000, invoices: 32 },
  { category: "Activities", revenue: 22000, invoices: 28 },
  { category: "Transportation", revenue: 18000, invoices: 15 },
  { category: "Misc Services", revenue: 12000, invoices: 11 },
];
