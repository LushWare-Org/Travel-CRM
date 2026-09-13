import { Clock, Calendar, BarChart2, Target } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../../../components/ui/tabs';

interface TimeRangeFilterProps {
  selectedRange: string;
  onRangeChange: (range: string) => void;
}

const timeRanges = [
  { id: 'daily', label: 'Daily', shortLabel: 'D', icon: Clock },
  { id: 'weekly', label: 'Weekly', shortLabel: 'W', icon: Calendar },
  { id: 'monthly', label: 'Monthly', shortLabel: 'M', icon: BarChart2 },
  { id: 'annual', label: 'Annual', shortLabel: 'Y', icon: Target },
];

const TimeRangeFilter = ({ selectedRange, onRangeChange }: TimeRangeFilterProps) => (
  <Tabs value={selectedRange} onValueChange={(value) => value && onRangeChange(String(value))}>
    <TabsList>
      {timeRanges.map((range) => (
        <TabsTrigger key={range.id} value={range.id} className="gap-1.5">
          <range.icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{range.label}</span>
          <span className="sm:hidden">{range.shortLabel}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

export default TimeRangeFilter;
