import { Calendar, Globe, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const platformOptions = [
  { id: 'Website Form', label: 'Website' },
  { id: 'Social Media', label: 'Social' },
  { id: 'Phone Call', label: 'Phone' },
  { id: 'Referral', label: 'Referral' },
  { id: 'Email', label: 'Email' },
  { id: 'Walk-in', label: 'Walk-in' },
];

interface FilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filterTravelDateStart: string;
  setFilterTravelDateStart: (value: string) => void;
  filterTravelDateEnd: string;
  setFilterTravelDateEnd: (value: string) => void;
  filterPlatforms: string[];
  setFilterPlatforms: (value: string[]) => void;
}

const FilterDialog = ({
  isOpen,
  onClose,
  filterTravelDateStart,
  setFilterTravelDateStart,
  filterTravelDateEnd,
  setFilterTravelDateEnd,
  filterPlatforms,
  setFilterPlatforms,
}: FilterDialogProps) => {
  const handlePlatformToggle = (platform: string) => {
    if (filterPlatforms.includes(platform)) {
      setFilterPlatforms(filterPlatforms.filter((p) => p !== platform));
    } else {
      setFilterPlatforms([...filterPlatforms, platform]);
    }
  };

  const clearFilters = () => {
    setFilterTravelDateStart('');
    setFilterTravelDateEnd('');
    setFilterPlatforms([]);
  };

  const hasActiveFilters = filterTravelDateStart || filterTravelDateEnd || filterPlatforms.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Travel Date Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Travel Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <Input
                  type="date"
                  value={filterTravelDateStart}
                  onChange={(e) => setFilterTravelDateStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <Input
                  type="date"
                  value={filterTravelDateEnd}
                  onChange={(e) => setFilterTravelDateEnd(e.target.value)}
                  min={filterTravelDateStart || undefined}
                />
              </div>
            </div>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Lead Source
            </label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((platform) => {
                const isSelected = filterPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`flex h-8 items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Active filters:
                {filterTravelDateStart && ` From ${filterTravelDateStart}`}
                {filterTravelDateEnd && ` To ${filterTravelDateEnd}`}
                {filterPlatforms.length > 0 && ` • ${filterPlatforms.length} source(s)`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters} className="flex-1">
            Clear All
          </Button>
          <Button onClick={onClose} className="flex-1">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilterDialog;
