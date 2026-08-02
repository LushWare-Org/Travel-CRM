/**
 * Header Statistics Component
 * Displays package statistics in a grid format
 * Cards are clickable to filter packages by status
 * 
 * For SalesReps: Only shows Published count (they can only see published packages)
 * For Admins: Shows Total, Published, Draft, and Archived packages
 */

import { useAuth } from '../../../contexts/AuthContext';

const PackageStats = ({ stats, onFilterChange, activeFilter }) => {
  const { user } = useAuth();
  const isSalesRep = user?.role === 'salesRep';

  const statItems = [
    {
      label: 'Total Packages',
      value: stats.total,
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100',
      filterValue: null,
      showFor: ['admin', 'superAdmin', 'staff'], // Only show for admins/staff
    },
    {
      label: 'Active',
      value: stats.active ?? 0,
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      filterValue: 'active',
      showFor: ['admin', 'superAdmin', 'staff', 'salesRep'],
    },
    {
      label: 'Inactive',
      value: (stats.total ?? 0) - (stats.active ?? 0),
      bgColor: 'bg-yellow-50',
      hoverColor: 'hover:bg-yellow-100',
      filterValue: 'inactive',
      showFor: ['admin', 'superAdmin', 'staff'],
    },
    {
      label: 'Featured',
      value: stats.featured ?? 0,
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      filterValue: 'featured',
      showFor: ['admin', 'superAdmin', 'staff'],
    },
  ];

  // Filter stat items based on user role
  const visibleStats = statItems.filter(item => item.showFor.includes(user?.role));

  return (
    <div className={`grid gap-4 ${
      isSalesRep 
        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
        : 'grid-cols-2 md:grid-cols-4'
    }`}>
      {visibleStats.map((item, idx) => (
        <div
          key={idx}
          onClick={() => onFilterChange(item.filterValue)}
          className={`${
            activeFilter === item.filterValue
              ? 'ring-2 ring-blue-500'
              : ''
          } ${item.bgColor} ${item.hoverColor} rounded-lg p-3 cursor-pointer transition-all transform hover:scale-105`}
        >
          <p className="text-xs text-gray-600 font-medium">{item.label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export default PackageStats;
