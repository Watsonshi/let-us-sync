import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScheduleConfig, FilterOptions } from '@/types/swimming';
import { RotateCcw } from 'lucide-react';

interface ControlPanelProps {
  config: ScheduleConfig;
  filters: FilterOptions;
  ageGroups: string[];
  genders: string[];
  eventTypes: string[];
  players: string[]; // 新增：選手名單
  onConfigChange: (config: ScheduleConfig) => void;
  onFilterChange: (filters: FilterOptions) => void;
}

export const ControlPanel = ({
  config,
  filters,
  ageGroups,
  genders,
  eventTypes,
  players, // 新增：選手名單
  onConfigChange,
  onFilterChange,
}: ControlPanelProps) => {
  const resetFilters = () => {
    onFilterChange({
      daySelect: 'all',
      ageGroupSelect: 'all',
      genderSelect: 'all',
      eventTypeSelect: 'all',
      playerSelect: 'all',
      playerSearch: '', // 重置搜尋框
    });
  };

  return (
    <Card className="shadow-custom-md">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">賽程設定與篩選</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重置篩選
            </Button>
          </div>
          {/* 時間配置設定 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="lunchStart" className="text-sm font-medium">午休開始</Label>
              <Input
                id="lunchStart"
                type="time"
                value={config.lunchStart}
                onChange={(e) => onConfigChange({ ...config, lunchStart: e.target.value })}
                className="h-9 text-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lunchEnd" className="text-sm font-medium">午休結束</Label>
              <Input
                id="lunchEnd"
                type="time"
                value={config.lunchEnd}
                onChange={(e) => onConfigChange({ ...config, lunchEnd: e.target.value })}
                className="h-9 text-left"
              />
            </div>
          </div>

          {/* 篩選器 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

          <div className="space-y-2">
            <Label className="text-sm font-medium">天數篩選</Label>
            <Select 
              value={filters.daySelect} 
              onValueChange={(value) => onFilterChange({ ...filters, daySelect: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg z-50">
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="d1">第一天（114/09/19，五：1–28）</SelectItem>
                <SelectItem value="d2">第二天（114/09/20，六：29–82）</SelectItem>
                <SelectItem value="d3">第三天（114/09/21，日：83–136）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">年齡組篩選</Label>
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">性別篩選</Label>
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">比賽項目篩選</Label>
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">選手名單篩選</Label>
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

          <div className="space-y-2">
            <Label htmlFor="playerSearch" className="text-sm font-medium">選手名稱搜尋</Label>
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
        </div>
      </CardContent>
    </Card>
  );
};