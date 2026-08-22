/**
 * Header Statistics Component
 * Displays package statistics in a grid format
 * Cards are clickable to filter packages by status
 *
 * For SalesReps: Only shows Published count (they can only see published packages)
 * For Admins: Shows Total, Published, Draft, and Archived packages
 */

import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '@/lib/utils';

interface PackageStatsProps {
  stats: { total?: number; active?: number; featured?: number };
  onFilterChange: (filterValue: string | null) => void;
  activeFilter: string | null;
}

const PackageStats = ({ stats, onFilterChange, activeFilter }: PackageStatsProps) => {
  const { user } = useAuth();
  const isSalesRep = user?.role === 'salesRep';

  const statItems = [
    {
      label: 'Total Packages',
      value: stats.total,
      color: 'muted',
      filterValue: null,
      showFor: ['admin', 'superAdmin', 'staff'], // Only show for admins/staff
    },
    {
      label: 'Active',
      value: stats.active ?? 0,
      color: 'success',
      filterValue: 'active',
      showFor: ['admin', 'superAdmin', 'staff', 'salesRep'],
    },
    {
      label: 'Inactive',
      value: (stats.total ?? 0) - (stats.active ?? 0),
      color: 'warning',
      filterValue: 'inactive',
      showFor: ['admin', 'superAdmin', 'staff'],
    },
    {
      label: 'Featured',
      value: stats.featured ?? 0,
      color: 'primary',
      filterValue: 'featured',
      showFor: ['admin', 'superAdmin', 'staff'],
    },
  ] as const;

  // Filter stat items based on user role
  const visibleStats = statItems.filter(item => item.showFor.includes(user?.role as any));

  const colorClasses: Record<string, string> = {
    muted: 'bg-muted hover:bg-muted/70',
    success: 'bg-success/10 hover:bg-success/20',
    warning: 'bg-warning/10 hover:bg-warning/20',
    primary: 'bg-primary/10 hover:bg-primary/20',
  };

  return (
    <div className={cn(
      'grid gap-4',
      isSalesRep
        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        : 'grid-cols-2 md:grid-cols-4'
    )}>
      {visibleStats.map((item, idx) => (
        <button
          type="button"
          key={idx}
          onClick={() => onFilterChange(item.filterValue)}
          className={cn(
            colorClasses[item.color],
            'rounded-lg p-3 text-left transition-colors',
            activeFilter === item.filterValue && 'ring-2 ring-ring'
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-foreground mt-1">{item.value}</p>
        </button>
      ))}
    </div>
  );
};

export default PackageStats;
