import { Badge } from '@/components/ui/badge';
import { SMART_FILTER_PRESETS } from '../types';

interface Props {
  activeFilter?: string;
  onFilterClick: (filterId: string) => void;
}

export function RadarSmartFilters({ activeFilter, onFilterClick }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {SMART_FILTER_PRESETS.map(preset => (
        <Badge
          key={preset.id}
          variant={activeFilter === preset.id ? 'default' : 'outline'}
          className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/10 transition-colors"
          onClick={() => onFilterClick(preset.id)}
        >
          {preset.label}
        </Badge>
      ))}
    </div>
  );
}
