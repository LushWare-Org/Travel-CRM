/**
 * Header Statistics Component
 * Displays package statistics in a grid format
 * Cards are clickable to filter packages by status
 */

const PackageStats = ({ stats, onFilterChange, activeFilter }) => {
  const statItems = [
    {
      label: 'Total Packages',
      value: stats.total,
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100',
      filterValue: null,
    },
    {
      label: 'Published',
      value: stats.published,
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      filterValue: 'published',
    },
    {
      label: 'Draft',
      value: stats.draft,
      bgColor: 'bg-yellow-50',
      hoverColor: 'hover:bg-yellow-100',
      filterValue: 'draft',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, idx) => (
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
