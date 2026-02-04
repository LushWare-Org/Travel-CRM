import React, { useState, useMemo } from 'react';
import { Users, Shield, UserCheck, Building2, Lock, Sparkles, ChevronRight, BarChart3, Settings } from 'lucide-react';
import { AdminManagement } from './components/AdminManagement';
import { SalesRepManagement } from './components/SalesRepManagement';
import { VendorManagement } from './components/VendorManagement';
import { WebsiteUsersManagement } from './components/WebsiteUsersManagement';
import { usePermission } from '../../contexts/PermissionContext';

/**
 * UserManagementPage - Redesigned
 * Modern layout with left sidebar navigation and unique component structure
 */
const UserManagementPage = () => {
  const permission = usePermission();
  const [activeTab, setActiveTab] = useState(null);

  const allTabs = [
    {
      id: 'admins',
      label: 'Administrators',
      shortLabel: 'Admins',
      icon: Shield,
      description: 'Manage system admins and their permissions',
      color: 'purple',
      gradient: 'from-purple-500 to-violet-600',
      lightBg: 'bg-purple-50',
      requiredPermission: 'manage_admins',
      component: AdminManagement,
    },
    {
      id: 'sales-reps',
      label: 'Sales Representatives',
      shortLabel: 'Sales Reps',
      icon: UserCheck,
      description: 'Sales team management and performance tracking',
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
      lightBg: 'bg-blue-50',
      requiredPermission: 'manage_sales_reps',
      component: SalesRepManagement,
    },
    {
      id: 'vendors',
      label: 'Vendor Partners',
      shortLabel: 'Vendors',
      icon: Building2,
      description: 'Hotels, agents, and service providers',
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600',
      lightBg: 'bg-emerald-50',
      requiredPermission: 'manage_vendors',
      component: VendorManagement,
    },
    {
      id: 'website-users',
      label: 'Website Users',
      shortLabel: 'Customers',
      icon: Users,
      description: 'Platform customers and their bookings',
      color: 'cyan',
      gradient: 'from-cyan-500 to-sky-600',
      lightBg: 'bg-cyan-50',
      requiredPermission: 'manage_users',
      component: WebsiteUsersManagement,
    }
  ];

  const accessibleTabs = useMemo(() => {
    return allTabs.filter((tab) =>
      permission.hasPermission(tab.requiredPermission)
    );
  }, [permission]);

  const currentActiveTab = useMemo(() => {
    if (!activeTab && accessibleTabs.length > 0) {
      return accessibleTabs[0].id;
    }
    return activeTab || null;
  }, [activeTab, accessibleTabs]);

  const handleTabChange = (tabId) => {
    const tab = accessibleTabs.find((t) => t.id === tabId);
    if (tab && permission.hasPermission(tab.requiredPermission)) {
      setActiveTab(tabId);
    }
  };

  const currentTab = allTabs.find((t) => t.id === currentActiveTab);

  const renderContent = () => {
    const tab = accessibleTabs.find((t) => t.id === currentActiveTab);

    if (!tab) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Access Restricted
          </h3>
          <p className="text-slate-500 max-w-md">
            You don't have permission to access any user management sections.
            Contact your administrator for access.
          </p>
        </div>
      );
    }

    const Component = tab.component;
    return <Component />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative flex">
        {/* Left Sidebar Navigation */}
        <aside className="w-72 min-h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200/60 sticky top-0 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">User Management</h1>
                <p className="text-xs text-slate-500">Manage all users</p>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="flex gap-2 mt-4">
              <div className="flex-1 bg-slate-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-slate-800">{accessibleTabs.length}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sections</p>
              </div>
              <div className="flex-1 bg-slate-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-emerald-600">Active</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Status</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 p-4 space-y-2">
            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              User Categories
            </p>

            {accessibleTabs.length > 0 ? (
              accessibleTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = currentActiveTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full group rounded-xl transition-all duration-300 ${isActive
                        ? 'shadow-lg'
                        : 'hover:bg-slate-50'
                      }`}
                  >
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isActive
                        ? `bg-gradient-to-r ${tab.gradient} text-white`
                        : 'text-slate-600'
                      }`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive
                          ? 'bg-white/20'
                          : tab.lightBg
                        }`}>
                        <TabIcon className={`w-5 h-5 ${isActive ? 'text-white' : `text-${tab.color}-600`}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium text-sm ${isActive ? 'text-white' : 'text-slate-700'}`}>
                          {tab.shortLabel}
                        </p>
                        <p className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                          {tab.description.split(' ').slice(0, 3).join(' ')}...
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-white/80' : 'text-slate-300 group-hover:translate-x-1'
                        }`} />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-slate-400">
                <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sections available</p>
              </div>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200/60">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-semibold text-violet-600">Pro Tip</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Use filters and search to quickly find users. Export data for reports.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          {/* Content Header */}
          {currentTab && (
            <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/60 px-8 py-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTab.gradient} flex items-center justify-center shadow-lg`}>
                    <currentTab.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{currentTab.label}</h2>
                    <p className="text-sm text-slate-500">{currentTab.description}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <BarChart3 className="w-5 h-5 text-slate-600" />
                  </button>
                  <button className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content Body */}
          <div className="p-8">
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 text-center text-xs text-slate-400 border-t border-slate-200/60">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserManagementPage;
