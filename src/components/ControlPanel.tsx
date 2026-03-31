import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScheduleConfig, FilterOptions } from '@/types/swimming';
import { RotateCcw, Eraser, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ControlPanelProps {
  config: ScheduleConfig;
  filters: FilterOptions;
  ageGroups: string[];
  genders: string[];
  eventTypes: string[];
  units: string[];
  players: string[];
  onConfigChange: (config: ScheduleConfig) => void;
  onFilterChange: (filters: FilterOptions) => void;
  onClearActualTimes?: () => void;
  actualTimeCount?: number;
}

export const ControlPanel = ({
  config,
  filters,
  ageGroups,
  genders,
  eventTypes,
  units,
  players,
  onConfigChange,
  onFilterChange,
  onClearActualTimes,
  actualTimeCount = 0,
}: ControlPanelProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const resetFilters = () => {
    onFilterChange({
      daySelect: 'all',
      ageGroupSelect: 'all',
      genderSelect: 'all',
      eventTypeSelect: 'all',
      unitSelect: 'all',
      playerSelect: 'all',
      playerSearch: '',
    });
  };

  const activeFilterCount = [
    filters.ageGroupSelect !== 'all' && filters.ageGroupSelect,
    filters.genderSelect !== 'all' && filters.genderSelect,
    filters.eventTypeSelect !== 'all' && filters.eventTypeSelect,
    filters.unitSelect !== 'all' && filters.unitSelect,
    filters.playerSelect !== 'all' && filters.playerSelect,
    filters.playerSearch?.trim(),
  ].filter(Boolean).length;

  const filterContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">年齡組</Label>
        <Select 
          value={filters.ageGroupSelect} 
          onValueChange={(value) => onFilterChange({ ...filters, ageGroupSelect: value })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="全部年齡組" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50">
            <SelectItem value="all">全部年齡組</SelectItem>
            {ageGroups.map((age) => (
              <SelectItem key={age} value={age}>{age}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">性別</Label>
        <Select 
          value={filters.genderSelect} 
          onValueChange={(value) => onFilterChange({ ...filters, genderSelect: value })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="全部性別" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50">
            <SelectItem value="all">全部性別</SelectItem>
            {genders.map((gender) => (
              <SelectItem key={gender} value={gender}>{gender}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">比賽項目</Label>
        <Select 
          value={filters.eventTypeSelect} 
          onValueChange={(value) => onFilterChange({ ...filters, eventTypeSelect: value })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="全部項目" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50">
            <SelectItem value="all">全部項目</SelectItem>
            {eventTypes.map((eventType) => (
              <SelectItem key={eventType} value={eventType}>{eventType}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">參賽單位</Label>
        <Select 
          value={filters.unitSelect} 
          onValueChange={(value) => onFilterChange({ ...filters, unitSelect: value })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="全部單位" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50 max-h-60 overflow-y-auto">
            <SelectItem value="all">全部單位</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">選手名單</Label>
        <Select 
          value={filters.playerSelect} 
          onValueChange={(value) => onFilterChange({ ...filters, playerSelect: value })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="全部選手" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50 max-h-60 overflow-y-auto">
            <SelectItem value="all" className="text-base">全部選手</SelectItem>
            {players.map((player) => (
              <SelectItem key={player} value={player} className="text-base">{player}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="playerSearch" className="text-xs font-medium text-muted-foreground">選手搜尋</Label>
        <Input
          id="playerSearch"
          type="text"
          placeholder="輸入選手姓名"
          value={filters.playerSearch}
          onChange={(e) => onFilterChange({ ...filters, playerSearch: e.target.value })}
          className="h-9"
        />
      </div>
    </div>
  );

  return (
    <Card className="shadow-custom-md overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <h3 className="text-base font-semibold">篩選條件</h3>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 px-2 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  重置
                </Button>
              )}
              {onClearActualTimes && actualTimeCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onClearActualTimes}
                  className="h-8 px-2 text-xs"
                >
                  <Eraser className="w-3.5 h-3.5 mr-1" />
                  清除時間 ({actualTimeCount})
                </Button>
              )}
            </div>
          </div>

          {/* Filters - collapsible on mobile */}
          {isMobile ? (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between h-9">
                  <span className="text-sm">
                    {isOpen ? '收合篩選' : '展開篩選'}
                    {activeFilterCount > 0 && !isOpen && ` (${activeFilterCount} 個啟用)`}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                {filterContent}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            filterContent
          )}
        </div>
      </CardContent>
    </Card>
  );
};
