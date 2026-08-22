/**
 * Packages Grid Component
 * Displays packages in a responsive grid layout
 */

import PackageCard from './PackageCard';

interface PackagesGridProps {
  packages: any[];
  onView: (pkg: any) => void;
  onEdit: (pkg: any) => void;
  onDownload: (pkg: any) => void;
  onDelete: (pkg: any) => void;
  onDuplicate: (pkg: any) => void;
}

const PackagesGrid = ({
  packages,
  onView,
  onEdit,
  onDownload,
  onDelete,
  onDuplicate,
}: PackagesGridProps) => {
  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground text-lg">No packages found</p>
        <p className="text-muted-foreground text-sm mt-1">
          Create your first package to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg._id || pkg.id}
          pkg={pkg}
          onView={onView}
          onEdit={onEdit}
          onDownload={onDownload}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
};

export default PackagesGrid;
