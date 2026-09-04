import { Search, X, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LifecycleStatus } from './LeadStatusBadge';

type FilterKey = 'all' | LifecycleStatus;

// Subset of the 10 lifecycle statuses worth a quick filter tab; dot colors
// reuse LeadStatusBadge's semantic grouping (muted/primary/success/destructive)
// so a status reads the same color here as it does on the lead's own badge,
// instead of each filter inventing its own hue.
const STATUSES: { key: FilterKey; label: string; shortLabel: string; dot: string }[] = [
  { key: 'all', label: 'All', shortLabel: 'All', dot: 'bg-muted-foreground' },
  { key: 'NEW', label: 'New', shortLabel: 'New', dot: 'bg-muted-foreground' },
  { key: 'PENDING_VERIFICATION', label: 'Pending Verification', shortLabel: 'Pend.', dot: 'bg-warning' },
  { key: 'DRAFTING', label: 'Drafting', shortLabel: 'Draft', dot: 'bg-muted-foreground' },
  { key: 'QUOTED', label: 'Quoted', shortLabel: 'Quot.', dot: 'bg-primary' },
  { key: 'APPROVED', label: 'Approved', shortLabel: 'Appr.', dot: 'bg-success' },
  { key: 'BOOKING_IN_PROGRESS', label: 'Booking', shortLabel: 'Book', dot: 'bg-primary' },
  { key: 'CONFIRMED', label: 'Confirmed', shortLabel: 'Conf.', dot: 'bg-success' },
  { key: 'CLOSED_LOST', label: 'Lost', shortLabel: 'Lost', dot: 'bg-destructive' },
];

const SOURCE_OPTIONS = [
  { id: 'website', label: 'Website' },
  { id: 'social_media', label: 'Social Media' },
  { id: 'phone_call', label: 'Phone Call' },
  { id: 'email', label: 'Email' },
  { id: 'referral', label: 'Referral' },
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'booking', label: 'Booking' },
  { id: 'chatbot', label: 'Chatbot' },
  { id: 'other', label: 'Other' },
];

const PLATFORM_OPTIONS = [
  { id: 'Website_Form', label: 'Website' },
  { id: 'Social_Media', label: 'Social' },
  { id: 'Phone_Call', label: 'Phone' },
  { id: 'Referral', label: 'Referral' },
  { id: 'Email', label: 'Email' },
  { id: 'Walk_in', label: 'Walk-in' },
  { id: 'Chatbot_Wizard', label: 'Chatbot' },
];

interface LeadFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterStatus: FilterKey;
  setFilterStatus: (value: FilterKey) => void;
  statusCounts: Record<string, number>;
  filterSources: string[];
  setFilterSources: (value: string[]) => void;
  filterPlatforms: string[];
  setFilterPlatforms: (value: string[]) => void;
  onAdvancedFilterClick: () => void;
}

const LeadFilters = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  statusCounts,
  filterSources,
  setFilterSources,
  filterPlatforms,
  setFilterPlatforms,
  onAdvancedFilterClick,
}: LeadFiltersProps) => {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, phone, destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(String(value) as FilterKey)}
            className="min-w-0"
          >
            <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide sm:w-fit">
              {STATUSES.map((status) => (
                <TabsTrigger key={status.key} value={status.key} className="gap-1.5">
                  <span className={`hidden sm:block w-2 h-2 rounded-full ${status.dot}`} />
                  <span className="sm:hidden">{status.shortLabel}</span>
                  <span className="hidden sm:inline">{status.label}</span>
                  <span className="px-1 sm:px-1.5 py-0.5 rounded bg-muted text-xs font-semibold text-muted-foreground">
                    {statusCounts[status.key] || 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            onClick={onAdvancedFilterClick}
            className="whitespace-nowrap sm:shrink-0"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-foreground mb-2">Source</label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((opt) => {
                const isSelected = filterSources.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setFilterSources(
                        isSelected
                          ? filterSources.filter((v) => v !== opt.id)
                          : [...filterSources, opt.id]
                      )
                    }
                    className={`h-8 px-3 rounded-lg text-sm font-medium transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-foreground mb-2">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((opt) => {
                const isSelected = filterPlatforms.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setFilterPlatforms(
                        isSelected
                          ? filterPlatforms.filter((v) => v !== opt.id)
                          : [...filterPlatforms, opt.id]
                      )
                    }
                    className={`h-8 px-3 rounded-lg text-sm font-medium transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LeadFilters;
