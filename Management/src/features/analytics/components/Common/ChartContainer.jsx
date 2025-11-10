/**
 * ChartContainer Component
 * Wrapper for chart sections with title and description
 */
const ChartContainer = ({ title, description, children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow ${className}`}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
};

export default ChartContainer;
