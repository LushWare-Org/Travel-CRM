/**
 * Activity Selector Component
 * Allows selecting from predefined activities and adding custom ones
 */

import { useState, useMemo } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { ACTIVITY_CATEGORIES } from '../utils/activities';
import { getActivitiesForDestination } from '../utils/destinationActivities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ActivitySelectorProps {
  activities?: string[] | string;
  onChange: (activities: string[]) => void;
  destination?: string | null;
}

const ActivitySelector = ({
  activities = [],
  onChange,
  destination = null,
}: ActivitySelectorProps) => {
  const [showSelector, setShowSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customActivity, setCustomActivity] = useState('');

  // Convert activities to array if it's a string
  const activitiesArray = Array.isArray(activities)
    ? activities
    : (typeof activities === 'string' ? activities.split(',').map(a => a.trim()).filter(Boolean) : []);

  // Destination-specific activities (memoized for performance)
  const availableActivities = useMemo(() => {
    return getActivitiesForDestination(destination, true);
  }, [destination]);

  // Filter activities based on category and search
  const filteredActivities = availableActivities.filter((activity: any) => {
    const matchesCategory = selectedCategory === 'all' || activity.category === selectedCategory;
    const matchesSearch = activity.label.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddActivity = (activityLabel: string) => {
    if (!activitiesArray.includes(activityLabel)) {
      onChange([...activitiesArray, activityLabel]);
    }
  };

  const handleRemoveActivity = (activityToRemove: string) => {
    onChange(activitiesArray.filter((a) => a !== activityToRemove));
  };

  const handleAddCustomActivity = () => {
    const trimmed = customActivity.trim();
    if (trimmed && !activitiesArray.includes(trimmed)) {
      onChange([...activitiesArray, trimmed]);
      setCustomActivity('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomActivity();
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Activities */}
      {activitiesArray.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activitiesArray.map((activity, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              {activity}
              <button
                type="button"
                onClick={() => handleRemoveActivity(activity)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Toggle Selector Button */}
      <Button
        type="button"
        onClick={() => setShowSelector(!showSelector)}
        size="sm"
      >
        <Plus size={16} />
        {showSelector ? 'Hide Activity Selector' : 'Add Activities'}
      </Button>

      {/* Activity Selector Panel */}
      {showSelector && (
        <div className="border border-border rounded-lg p-4 bg-muted space-y-4">
          {/* Custom Activity Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Add Custom Activity
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type custom activity name..."
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddCustomActivity}
                disabled={!customActivity.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Select from Predefined Activities
            </label>

            {/* Search and Category Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search activities..."
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => ACTIVITY_CATEGORIES.find((c: any) => c.value === v)?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_CATEGORIES.map((category: any) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activities Grid */}
            <div className="max-h-64 overflow-y-auto border border-border rounded-md bg-card">
              {filteredActivities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                  {filteredActivities.map((activity: any) => {
                    const isSelected = activitiesArray.includes(activity.label);
                    return (
                      <button
                        key={activity.value}
                        type="button"
                        onClick={() => handleAddActivity(activity.label)}
                        disabled={isSelected}
                        className={cn(
                          'px-3 py-2 text-left text-sm rounded-md transition-colors',
                          isSelected
                            ? 'bg-success/10 text-success cursor-not-allowed'
                            : 'bg-muted hover:bg-accent text-foreground'
                        )}
                      >
                        {activity.label}
                        {isSelected && <span className="ml-2 text-xs">✓ Added</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No activities found. Try different search terms or category.
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="text-xs text-muted-foreground mt-2">
              Showing {filteredActivities.length} of {availableActivities.length} activities
              {destination && <span className="ml-1 text-primary">(filtered for {destination})</span>}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {activitiesArray.length === 0 && !showSelector && (
        <p className="text-xs text-muted-foreground">
          Click "Add Activities" to select from predefined list or add custom activities
        </p>
      )}
    </div>
  );
};

export default ActivitySelector;
