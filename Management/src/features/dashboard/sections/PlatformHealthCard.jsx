import { Users, TrendingUp, DollarSign, Activity, Briefcase, Eye } from 'lucide-react';
import StatCard from '../../analytics/components/Common/StatCard';

/**
 * Platform Health Card - Redesigned
 * Shows key metrics at a glance based on user role and permissions
 * Compact grid layout with enhanced visual hierarchy
 */
const PlatformHealthCard = ({ leadData, billingData, userData, packageData, isSalesRep }) => {
  // Extract stats based on available data
  const leadStats = leadData?.stats || {};
  const billingStats = billingData?.stats || {};
  const userStats = userData?.stats || {};

  // Calculate trends (simplified - in real scenario would come from API)
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return '+0%';
    const change = ((current - previous) / previous) * 100;
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  const stats = [];

  // All roles see Total Leads
  stats.push({
    title: 'Total Leads',
    value: leadStats.totalLeads || '0',
    icon: Activity,
    color: 'blue',
    trend: '+12%', // Placeholder - would come from API
    description: 'All leads in pipeline'
  });

  // All roles see Active Packages (from package data if available)
  const packageStats = packageData?.stats || {};
  if (packageStats.totalItineraries !== undefined) {
    stats.push({
      title: 'Active Packages',
      value: packageStats.totalItineraries || '0',
      icon: Briefcase,
      color: 'green',
      trend: '+5%', // Placeholder
      description: 'Current available packages'
    });
  }

  // Admin with manage_billing sees Monthly Revenue
  if (billingData) {
    stats.push({
      title: 'Monthly Revenue',
      value: `₹${(billingStats.totalRevenue / 100000).toFixed(1)}L`,
      icon: DollarSign,
      color: 'purple',
      trend: '+23%', // Placeholder
      description: 'Paid invoices this month'
    });

    stats.push({
      title: 'Outstanding',
      value: `₹${(billingStats.totalOutstanding / 100000).toFixed(1)}L`,
      icon: Eye,
      color: 'orange',
      trend: '-15%', // Placeholder
      description: 'Pending payments'
    });
  }

  // Admin (not salesRep) sees User Metrics
  if (userData && !isSalesRep) {
    stats.push({
      title: 'Total Users',
      value: userStats.totalUsers || '0',
      icon: Users,
      color: 'indigo',
      trend: '+8%', // Placeholder
      description: 'Registered users'
    });

    stats.push({
      title: 'Active Users',
      value: userStats.activeUsers || '0',
      icon: TrendingUp,
      color: 'cyan',
      trend: '+12%', // Placeholder
      description: 'Users with activity'
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          label={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          trend={stat.trend}
        />
      ))}
    </div>
  );
};

export default PlatformHealthCard;
