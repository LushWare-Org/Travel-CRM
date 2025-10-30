import React from 'react';
import { FileText, Receipt, DollarSign } from 'lucide-react';

const TabNavigation = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    {
      id: 'quotations',
      label: 'Quotations',
      icon: FileText,
      count: counts.quotations,
      color: 'blue',
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: Receipt,
      count: counts.invoices,
      color: 'green',
    },
    {
      id: 'receipts',
      label: 'Payment Receipts',
      icon: DollarSign,
      count: counts.receipts,
      color: 'purple',
    },
  ];

  const colorClasses = {
    blue: {
      active: 'border-blue-500 text-blue-600 bg-blue-50',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      badge: 'bg-blue-100 text-blue-600',
    },
    green: {
      active: 'border-green-500 text-green-600 bg-green-50',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      badge: 'bg-green-100 text-green-600',
    },
    purple: {
      active: 'border-purple-500 text-purple-600 bg-purple-50',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      badge: 'bg-purple-100 text-purple-600',
    },
  };

  return (
    <div className="border-b border-gray-200 bg-white shadow-sm">
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const colors = colorClasses[tab.color];
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                transition-all duration-200 ease-in-out
                ${isActive ? colors.active : colors.inactive}
              `}
            >
              <Icon
                className={`
                  -ml-0.5 mr-2 h-5 w-5
                  ${isActive ? `text-${tab.color}-500` : 'text-gray-400 group-hover:text-gray-500'}
                `}
              />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`
                    ml-3 py-0.5 px-2.5 rounded-full text-xs font-medium
                    ${isActive ? colors.badge : 'bg-gray-100 text-gray-600'}
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default TabNavigation;
