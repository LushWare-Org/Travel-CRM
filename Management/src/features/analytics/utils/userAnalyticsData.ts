/**
 * Mock data for User Analytics
 * Includes monthly, weekly, and yearly data for comprehensive time range analysis
 */

interface UserGrowthPoint {
  newUsers: number;
  purchased: number;
  salesReps: number;
}

// ============= MONTHLY DATA =============
export const userGrowthData: (UserGrowthPoint & { month: string })[] = [
  { month: 'Jan', newUsers: 45, purchased: 12, salesReps: 28 },
  { month: 'Feb', newUsers: 52, purchased: 16, salesReps: 32 },
  { month: 'Mar', newUsers: 48, purchased: 14, salesReps: 30 },
  { month: 'Apr', newUsers: 61, purchased: 20, salesReps: 38 },
  { month: 'May', newUsers: 55, purchased: 18, salesReps: 34 },
  { month: 'Jun', newUsers: 67, purchased: 24, salesReps: 42 },
];

// ============= WEEKLY DATA (Last 12 weeks) =============
export const weeklyUserGrowthData: (UserGrowthPoint & { week: string })[] = [
  { week: 'W1', newUsers: 8, purchased: 2, salesReps: 5 },
  { week: 'W2', newUsers: 11, purchased: 3, salesReps: 7 },
  { week: 'W3', newUsers: 13, purchased: 4, salesReps: 8 },
  { week: 'W4', newUsers: 9, purchased: 2, salesReps: 6 },
  { week: 'W5', newUsers: 12, purchased: 3, salesReps: 8 },
  { week: 'W6', newUsers: 14, purchased: 5, salesReps: 9 },
  { week: 'W7', newUsers: 10, purchased: 3, salesReps: 6 },
  { week: 'W8', newUsers: 15, purchased: 4, salesReps: 10 },
  { week: 'W9', newUsers: 11, purchased: 3, salesReps: 7 },
  { week: 'W10', newUsers: 16, purchased: 6, salesReps: 11 },
  { week: 'W11', newUsers: 13, purchased: 4, salesReps: 8 },
  { week: 'W12', newUsers: 17, purchased: 5, salesReps: 12 },
];

// ============= YEARLY DATA (Last 5 years) =============
export const yearlyUserGrowthData: (UserGrowthPoint & { year: string })[] = [
  { year: '2020', newUsers: 420, purchased: 108, salesReps: 280 },
  { year: '2021', newUsers: 580, purchased: 156, salesReps: 385 },
  { year: '2022', newUsers: 745, purchased: 210, salesReps: 495 },
  { year: '2023', newUsers: 892, purchased: 268, salesReps: 595 },
  { year: '2024', newUsers: 1124, purchased: 342, salesReps: 742 },
];

// ============= SALES REP DATA =============
export const revenueByRepData = [
  { rep: 'Sarah Johnson', revenue: 52000 },
  { rep: 'John Smith', revenue: 45000 },
  { rep: 'Emma Davis', revenue: 42000 },
  { rep: 'Mike Wilson', revenue: 38000 },
  { rep: 'James Brown', revenue: 28000 },
];

// ============= USER TYPE DISTRIBUTION =============
export const userTypeDistributionData = [
  { name: 'Website Users', value: 2450 },
  { name: 'Registered Users', value: 1240 },
  { name: 'Converted Users', value: 342 },
];

// ============= AGGREGATION FUNCTIONS =============

/**
 * Get user growth data based on selected time range
 */
export const getUserGrowthByTimeRange = (timeRange: string) => {
  switch (timeRange) {
    case 'weekly':
      return weeklyUserGrowthData;
    case 'yearly':
      return yearlyUserGrowthData;
    case 'monthly':
    default:
      return userGrowthData;
  }
};

/**
 * Get aggregated stats based on selected time range
 */
export const getAggregatedUserStats = (timeRange: string) => {
  let data: UserGrowthPoint[];
  switch (timeRange) {
    case 'weekly':
      data = weeklyUserGrowthData;
      break;
    case 'yearly':
      data = yearlyUserGrowthData;
      break;
    case 'monthly':
    default:
      data = userGrowthData;
  }

  const totalNewUsers = data.reduce((sum, item) => sum + item.newUsers, 0);
  const totalPurchased = data.reduce((sum, item) => sum + item.purchased, 0);
  const avgSalesReps = Math.round(data.reduce((sum, item) => sum + item.salesReps, 0) / data.length);
  const conversionRate = totalNewUsers > 0 ? ((totalPurchased / totalNewUsers) * 100).toFixed(1) : 0;

  // Calculate trend (current vs previous period)
  const lastPeriod: Partial<UserGrowthPoint> = data[data.length - 1] || {};
  const previousPeriod: Partial<UserGrowthPoint> = data[data.length - 2] || {};

  const usersTrend = previousPeriod.newUsers
    ? (((lastPeriod.newUsers! - previousPeriod.newUsers) / previousPeriod.newUsers) * 100).toFixed(1)
    : 0;

  const purchasedTrend = previousPeriod.purchased
    ? (((lastPeriod.purchased! - previousPeriod.purchased) / previousPeriod.purchased) * 100).toFixed(1)
    : 0;

  return {
    totalNewUsers,
    totalPurchased,
    avgSalesReps,
    conversionRate,
    usersTrend,
    purchasedTrend,
    lastPeriodNewUsers: lastPeriod.newUsers || 0,
    lastPeriodPurchased: lastPeriod.purchased || 0,
  };
};
