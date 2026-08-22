/**
 * Destination Selector Component
 * User-friendly destination picker with popular and categorized destinations
 */

import { useState } from 'react';
import { Search, MapPin, Globe, ChevronDown } from 'lucide-react';
import {
  POPULAR_INTERNATIONAL,
  OTHER_INTERNATIONAL,
} from '../utils/countries';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Destination {
  value: string;
  label: string;
}

interface DestinationSelectorProps {
  value?: string;
  onChange: (event: { target: { name: string; value: string } }) => void;
  name?: string;
}

const DestinationSelector = ({ value, onChange, name = 'destination' }: DestinationSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('popular-international');

  // Filter destinations based on search
  const getFilteredDestinations = (destinations: Destination[]) => {
    if (!searchTerm) return destinations;
    return destinations.filter((dest) =>
      dest.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSelect = (destination: { label: string }) => {
    onChange({ target: { name, value: destination.label } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const renderDestinationGrid = (destinations: Destination[], emptyMessage: string) => {
    const filtered = getFilteredDestinations(destinations);

    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2">
        {filtered.map((dest) => (
          <button
            key={dest.value}
            type="button"
            onClick={() => handleSelect(dest)}
            className={cn(
              'px-3 py-2 text-sm text-left rounded-md transition-colors',
              value === dest.label
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-muted hover:bg-accent text-foreground hover:text-accent-foreground border border-border'
            )}
          >
            {dest.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Selected Value Display / Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-full px-2.5 border border-input rounded-lg bg-transparent cursor-pointer flex items-center justify-between hover:border-ring/50 transition-colors text-sm"
      >
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-muted-foreground" />
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {value || 'Select Destination'}
          </span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-[5] w-full mt-2 bg-popover border border-border rounded-lg shadow-dropdown">
          {/* Search Bar */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search destinations..."
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(String(v))} className="px-3 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="popular-international">
                <Globe size={14} />
                Popular Destinations
              </TabsTrigger>
              <TabsTrigger value="other-international">
                <MapPin size={14} />
                More Destinations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="popular-international">
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Globe size={12} />
                Popular International Destinations
              </div>
              {renderDestinationGrid(POPULAR_INTERNATIONAL, 'No destinations found')}
            </TabsContent>

            <TabsContent value="other-international">
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Globe size={12} />
                More International Destinations
              </div>
              {renderDestinationGrid(OTHER_INTERNATIONAL, 'No destinations found')}
            </TabsContent>
          </Tabs>

          {/* Custom Input Option */}
          <div className="p-3 border-t border-border bg-muted mt-1">
            <div className="text-xs text-muted-foreground mb-2">Don't see your destination?</div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type custom destination..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const target = e.target as HTMLInputElement;
                    const customValue = target.value.trim();
                    if (customValue) {
                      handleSelect({ label: customValue });
                      target.value = '';
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[4]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default DestinationSelector;
