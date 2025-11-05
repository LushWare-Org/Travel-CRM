import React, { useState } from 'react';
import { Users, Shield, UserCheck, Building2 } from 'lucide-react';
import { AdminManagement } from './components/AdminManagement';
import { SalesRepManagement } from './components/SalesRepManagement';
import { VendorManagement } from './components/VendorManagement';
import { WebsiteUsersManagement } from './components/WebsiteUsersManagement';

const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState('admins');

  const tabs = [
    {
      id: 'admins',
      label: 'Manage Admins',
      icon: Shield,
      description: 'System administrators and permissions',
      color: 'purple'
    },
    {
      id: 'sales-reps',
      label: 'Sales Representatives',
      icon: UserCheck,
      description: 'Sales team and performance',
      color: 'blue'
    },
    {
      id: 'vendors',
      label: 'Vendor Partners',
      icon: Building2,
      description: 'Hotels, travel agents, and service providers',
      color: 'indigo'
    },
    {
      id: 'website-users',
      label: 'Website Users',
      icon: Users,
      description: 'Platform customers and bookings',
      color: 'cyan'
    }
  ];

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
    switch (activeTab) {
      case 'admins':
        return <AdminManagement />;
      case 'sales-reps':
        return <SalesRepManagement />;
      case 'vendors':
        return <VendorManagement />;
      case 'website-users':
        return <WebsiteUsersManagement />;
      default:
        return null;
    }
  };

  const currentTab = tabs.find(t => t.id === activeTab);

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
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
          })}
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
