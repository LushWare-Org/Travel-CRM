/**
 * Multi-Select Dropdown Component
 * Allows selecting multiple items from a dropdown with tags display
 */

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label?: string;
  options?: Option[];
  selectedValues?: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

const MultiSelectDropdown = ({
  label,
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'Select items...',
  allowCustom = false,
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (value: string) => {
    const isSelected = selectedValues.includes(value);
    if (isSelected) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleRemoveTag = (value: string) => {
    onChange(selectedValues.filter((v) => v !== value));
  };

  const handleAddCustom = () => {
    if (customInput.trim() && !selectedValues.includes(customInput.trim())) {
      onChange([...selectedValues, customInput.trim()]);
      setCustomInput('');
    }
  };

  const getDisplayLabel = (value: string) => {
    const option = options.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          {label}
        </label>
      )}

      {/* Selected Tags */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedValues.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              {getDisplayLabel(value)}
              <button
                type="button"
                onClick={() => handleRemoveTag(value)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-full px-2.5 border border-input rounded-lg bg-transparent cursor-pointer hover:border-ring/50 focus-visible:ring-3 focus-visible:ring-ring/50 flex items-center justify-between text-sm"
      >
        <span className="text-foreground">
          {selectedValues.length === 0
            ? placeholder
            : `${selectedValues.length} selected`}
        </span>
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-dropdown max-h-60 overflow-y-auto">
          {/* Search Input */}
          <div className="sticky top-0 bg-popover border-b border-border p-2">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleToggleOption(option.value)}
                    className={cn(
                      'px-3 py-2 cursor-pointer hover:bg-muted flex items-center justify-between',
                      isSelected && 'bg-accent'
                    )}
                  >
                    <span className="text-sm text-foreground">{option.label}</span>
                    {isSelected && (
                      <span className="text-primary font-semibold">✓</span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No options found
              </div>
            )}
          </div>

          {/* Custom Input Section */}
          {allowCustom && (
            <div className="border-t border-border p-2 bg-muted">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustom();
                    }
                  }}
                  placeholder="Add custom item..."
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  type="button"
                  onClick={handleAddCustom}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
