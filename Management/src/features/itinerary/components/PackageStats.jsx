/**
 * Header Statistics Component
 * Displays package statistics in a grid format
 */

const PackageStats = ({ stats }) => {
  const statItems = [
    {
      label: 'Total Packages',
      value: stats.total,
      bgColor: 'bg-gray-50',
    },
    {
      label: 'Published',
      value: stats.published,
      bgColor: 'bg-green-50',
    },
    {
      label: 'Total Bookings',
      value: stats.totalBookings,
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Avg. Rating',
      value: `${stats.avgRating}★`,
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, idx) => (
        <div key={idx} className={`${item.bgColor} rounded-lg p-3`}>
          <p className="text-xs text-gray-600 font-medium">{item.label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export default PackageStats;
