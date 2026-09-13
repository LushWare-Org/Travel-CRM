import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface UserTableHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFilterClick: () => void;
  filterCount?: number;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}

const UserTableHeader = ({
  searchTerm,
  onSearchChange,
  onFilterClick,
  filterCount = 0,
  title,
  subtitle,
  disabled = false,
}: UserTableHeaderProps) => {
  return (
    <div className="mb-6 rounded-lg border border-border bg-card px-6 py-4 shadow-card">
      <div className="mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            disabled={disabled}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" disabled={disabled} onClick={onFilterClick}>
          <Filter className="size-4" />
          Filters
          {filterCount > 0 && (
            <Badge variant="default" className="ml-1">
              {filterCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
};

export default UserTableHeader;
