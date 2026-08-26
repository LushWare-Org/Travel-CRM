import { Package, CheckCircle, Sparkles, Star } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface PackageStatsProps {
  stats: {
    total: number;
    active: number;
    featured: number;
    avgRating: number;
  };
}

const PackageStats = ({ stats }: PackageStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon={Package} label="Total Packages" value={stats.total} color="muted" />
      <StatCard icon={CheckCircle} label="Active" value={stats.active} color="success" />
      <StatCard icon={Sparkles} label="Featured" value={stats.featured} color="primary" />
      <StatCard icon={Star} label="Avg. Rating" value={stats.avgRating} color="warning" />
    </div>
  );
};

export default PackageStats;
