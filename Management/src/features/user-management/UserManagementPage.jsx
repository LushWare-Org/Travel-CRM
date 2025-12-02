import React, { useState, useMemo } from 'react';
import { Users, Shield, UserCheck, Building2, Lock } from 'lucide-react';
import { AdminManagement } from './components/AdminManagement';
import { SalesRepManagement } from './components/SalesRepManagement';
import { VendorManagement } from './components/VendorManagement';
import { WebsiteUsersManagement } from './components/WebsiteUsersManagement';
import { usePermission } from '../../contexts/PermissionContext';
import { getAccessibleTabs, getRolePluralLabel } from './utils/permissionUtils';

const UserManagementPage = () => {
  const permission = usePermission();
  const [activeTab, setActiveTab] = useState(null);

  const allTabs = [
    {
      id: 'admins',
      label: 'Manage Admins',
      icon: Shield,
      description: 'System administrators and permissions',
      color: 'purple',
      requiredPermission: 'manage_admins',
      component: AdminManagement,
    },
    {
      id: 'sales-reps',
      label: 'Sales Representatives',
      icon: UserCheck,
      description: 'Sales team and performance',
      color: 'blue',
      requiredPermission: 'manage_sales_reps',
      component: SalesRepManagement,
    },
    {
      id: 'vendors',
      label: 'Vendor Partners',
      icon: Building2,
      description: 'Hotels, travel agents, and service providers',
      color: 'indigo',
      requiredPermission: 'manage_vendors',
      component: VendorManagement,
    },
    {
      id: 'website-users',
      label: 'Website Users',
      icon: Users,
      description: 'Platform customers and bookings',
      color: 'cyan',
      requiredPermission: 'manage_users',
      component: WebsiteUsersManagement,
    }
  ];

  // Filter tabs based on user permissions
  const accessibleTabs = useMemo(() => {
    return allTabs.filter((tab) =>
      permission.hasPermission(tab.requiredPermission)
    );
  }, [permission]);

  // Set initial active tab to first accessible tab
  const currentActiveTab = useMemo(() => {
    if (!activeTab && accessibleTabs.length > 0) {
      return accessibleTabs[0].id;
    }
    return activeTab || null;
  }, [activeTab, accessibleTabs]);

  // Update activeTab when it changes
  const handleTabChange = (tabId) => {
    const tab = accessibleTabs.find((t) => t.id === tabId);
    if (tab && permission.hasPermission(tab.requiredPermission)) {
      setActiveTab(tabId);
    }
  };

  const colorClasses = {
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700'
  };

  const activeColorClasses = {
    purple: 'border-purple-500 bg-purple-50 text-purple-700',
    blue: 'border-blue-500 bg-blue-50 text-blue-700',
    indigo: 'border-indigo-500 bg-indigo-50 text-indigo-700',
    cyan: 'border-cyan-500 bg-cyan-50 text-cyan-700'
  };

  const renderContent = () => {
    const currentTab = accessibleTabs.find((t) => t.id === currentActiveTab);
    
    if (!currentTab) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Permission
          </h3>
          <p className="text-gray-600">
            You don't have permission to access any user management sections.
            <br />
            Contact your administrator to request access.
          </p>
        </div>
      );
    }

    const Component = currentTab.component;
    return <Component />;
  };

  const currentTab = allTabs.find((t) => t.id === currentActiveTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all system users, staff, vendors, and platform customers</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-20 z-10">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {accessibleTabs.length > 0 ? (
            accessibleTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = currentActiveTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 whitespace-nowrap border-2 ${
                    isActive
                      ? `border-b-2 bg-white shadow-sm ${
                          tab.color === 'purple' ? 'text-purple-700 border-purple-500' :
                          tab.color === 'blue' ? 'text-blue-700 border-blue-500' :
                          tab.color === 'indigo' ? 'text-indigo-700 border-indigo-500' :
                          'text-cyan-700 border-cyan-500'
                        }`
                      : `border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50`
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })
          ) : (
            <div className="w-full px-4 py-3 text-gray-600 text-center">
              <Lock className="w-4 h-4 inline mr-2" />
              No management sections available
            </div>
          )}
        </div>

        {/* Tab Description */}
        {currentTab && (
          <div className="mt-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-transparent rounded-lg">
            <p className="text-sm text-gray-600">{currentTab.description}</p>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-8 max-w-7xl mx-auto">
        {renderContent()}
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-gray-200 px-8 py-4 text-center text-sm text-gray-500 mt-8">
        <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  );
};

export default UserManagementPage;
