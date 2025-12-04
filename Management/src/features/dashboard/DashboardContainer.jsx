import { useState, useEffect } from 'react';
import { usePermission } from '../../contexts/PermissionContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import AnalyticsService from '../../services/analytics.service';
import PlatformHealthCard from './sections/PlatformHealthCard';
import LeadFunnelSection from './sections/LeadFunnelSection';
import PackageDistributionSection from './sections/PackageDistributionSection';
import RevenuePerformanceSection from './sections/RevenuePerformanceSection';
import UserAnalyticsSection from './sections/UserAnalyticsSection';
import SalesRepPerformanceCard from './sections/SalesRepPerformanceCard';
import TimeRangeFilter from '../analytics/components/Common/TimeRangeFilter';
import { LoadingSpinner, ErrorBanner } from './components/LoadingSpinner';

const DashboardContainer = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Analytics data
  const [leadData, setLeadData] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [packageData, setPackageData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [salesRepData, setSalesRepData] = useState(null);

  // Determine if user can view reports
  const canViewReports = hasPermission('view_reports') || user?.role === 'superAdmin';
  const canViewBilling = hasPermission('manage_billing') || user?.role === 'superAdmin';
  const canViewUsers = (hasPermission('view_reports') || user?.role === 'superAdmin') && user?.role !== 'salesRep';
  const isSalesRep = user?.role === 'salesRep';

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build API requests based on permissions
        const requests = [];

        // All roles can see lead analytics
        requests.push(
          AnalyticsService.getLeadAnalyticsOverview(timeRange)
            .then(data => setLeadData(data))
            .catch(err => {
              console.error('Lead analytics error:', err);
              toast.error('Failed to load lead analytics');
            })
        );

        // All roles can see package analytics
        requests.push(
          AnalyticsService.getPackageAnalyticsOverview(timeRange)
            .then(data => setPackageData(data))
            .catch(err => {
              console.error('Package analytics error:', err);
              toast.error('Failed to load package analytics');
            })
        );

        // Only admins with manage_billing can see billing
        if (canViewBilling) {
          requests.push(
            AnalyticsService.getBillingAnalyticsOverview(timeRange)
              .then(data => setBillingData(data))
              .catch(err => {
                console.error('Billing analytics error:', err);
                toast.error('Failed to load billing analytics');
              })
          );
        }

        // Only admins (not salesReps) can see user analytics
        if (canViewUsers) {
          requests.push(
            AnalyticsService.getUserAnalyticsOverview(timeRange)
              .then(data => setUserData(data))
              .catch(err => {
                console.error('User analytics error:', err);
                toast.error('Failed to load user analytics');
              })
          );
        }

        // Only salesReps can see their personal performance
        if (isSalesRep) {
          requests.push(
            AnalyticsService.getSalesRepPerformance(timeRange)
              .then(data => setSalesRepData(data))
              .catch(err => {
                console.error('SalesRep performance error:', err);
                toast.error('Failed to load your performance data');
              })
          );
        }

        // Wait for all requests to complete
        await Promise.all(requests);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
        toast.error('Error loading dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange, canViewBilling, canViewUsers, isSalesRep]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your platform overview.</p>
          </div>
          <div>
            <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error Banner */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* SalesRep Personal Performance - Show prominently at top */}
        {isSalesRep && <SalesRepPerformanceCard data={salesRepData} />}

        {/* Platform Health Stat Cards - All Roles */}
        <PlatformHealthCard
          leadData={leadData}
          billingData={canViewBilling ? billingData : null}
          userData={canViewUsers ? userData : null}
          packageData={packageData}
          isSalesRep={isSalesRep}
        />

        {/* Charts Grid - Responsive layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Lead Funnel - All Roles */}
          <div className="lg:col-span-2">
            <LeadFunnelSection data={leadData} />
          </div>

          {/* Package Distribution - All Roles */}
          <div>
            <PackageDistributionSection data={packageData} />
          </div>
        </div>

        {/* Revenue Performance - Admin with manage_billing only */}
        {canViewBilling && (
          <div className="mb-8">
            <RevenuePerformanceSection data={billingData} />
          </div>
        )}

        {/* User Analytics - Admin only (not salesRep) */}
        {canViewUsers && (
          <div className="mb-8">
            <UserAnalyticsSection data={userData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardContainer;
