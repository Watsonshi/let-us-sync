import { useState, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { CurrentTime } from '@/components/CurrentTime';
import { ControlPanel } from '@/components/ControlPanel';
import { FileUpload } from '@/components/FileUpload';
import { ScheduleTable } from '@/components/ScheduleTable';
import { SwimGroup, ScheduleConfig, FilterOptions } from '@/types/swimming';
import { parseExcelFile } from '@/utils/excelUtils';
import { parseMmSs, parseTimeInputToDate, moveOutOfLunch, addSecondsSkippingLunch, advanceCursor } from '@/utils/timeUtils';
import { Waves, Timer } from 'lucide-react';

const SwimmingSchedule = () => {
  const [groups, setGroups] = useState<SwimGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ScheduleConfig>({
    turnover: 10,
    lunchStart: '12:00',
    lunchEnd: '13:30',
    fallback: '06:00',
  });
  const [filters, setFilters] = useState<FilterOptions>({
    daySelect: '',
    ageGroupSelect: '',
    genderSelect: '',
    eventTypeSelect: '',
  });

  // 計算篩選選項
  const filterOptions = useMemo(() => {
    return {
      ageGroups: [...new Set(groups.map(g => g.ageGroup).filter(Boolean))].sort(),
      genders: [...new Set(groups.map(g => g.gender).filter(Boolean))].sort(),
      eventTypes: [...new Set(groups.map(g => g.eventType).filter(Boolean))].sort(),
    };
  }, [groups]);

  // 應用篩選和計算時間
  const processedGroups = useMemo(() => {
    if (!groups.length) return [];

    const base = new Date();
    const Ls = parseTimeInputToDate(base, config.lunchStart);
    const Le = parseTimeInputToDate(base, config.lunchEnd);
    const fallbackSeconds = parseMmSs(config.fallback) ?? 360;

    // 更新平均時間
    const updatedGroups = groups.map(g => {
      if (!g.times || g.times.length === 0) {
        const sameEventGroups = groups.filter(other =>
          other.eventNo === g.eventNo && other.times && other.times.length > 0
        );
        if (sameEventGroups.length > 0) {
          const totalAvg = sameEventGroups.reduce((sum, group) => sum + group.avgSeconds, 0) / sameEventGroups.length;
          return { ...g, avgSeconds: totalAvg };
        } else {
          return { ...g, avgSeconds: fallbackSeconds };
        }
      }
      return g;
    });

    // 應用篩選
    let filtered = updatedGroups;
    if (filters.daySelect) filtered = filtered.filter(g => g.dayKey === filters.daySelect);
    if (filters.ageGroupSelect) filtered = filtered.filter(g => g.ageGroup === filters.ageGroupSelect);
    if (filters.genderSelect) filtered = filtered.filter(g => g.gender === filters.genderSelect);
    if (filters.eventTypeSelect) filtered = filtered.filter(g => g.eventType === filters.eventTypeSelect);

    // 計算時間
    let cursor: Date | null = null;
    let currentDay = '';

    const getDayStartTime = (dayKey: string) => {
      if (dayKey === 'd1') return '09:00';
      return '08:15';
    };

    return filtered.map((g, i) => {
      if (g.dayLabel && g.dayLabel !== currentDay) {
        currentDay = g.dayLabel;
        const dayStartTime = getDayStartTime(g.dayKey);
        cursor = parseTimeInputToDate(base, dayStartTime);
      }

      if (i > 0 && filtered[i - 1].dayLabel === g.dayLabel) {
        const prev = filtered[i - 1];
        if (prev.actualEnd) {
          cursor = advanceCursor(prev.actualEnd, config.turnover, Ls, Le);
        }
      }

      cursor = moveOutOfLunch(cursor!, Ls, Le);
      const estStart = new Date(cursor!);
      const estEnd = addSecondsSkippingLunch(estStart, g.avgSeconds, Ls, Le);

      const updatedGroup = {
        ...g,
        scheduledStart: estStart,
        scheduledEnd: estEnd,
      };

      const displayEnd = g.actualEnd ?? estEnd;
      cursor = advanceCursor(displayEnd, config.turnover, Ls, Le);

      return updatedGroup;
    });
  }, [groups, config, filters]);

  const handleFileSelect = async (file: File) => {
    try {
      setIsLoading(true);
      const fallback = parseMmSs(config.fallback) ?? 360;
      const newGroups = await parseExcelFile(file, fallback);
      setGroups(newGroups);
      toast({
        title: "檔案載入成功",
        description: `成功載入 ${newGroups.length} 組比賽資料`,
      });
    } catch (error) {
      console.error('讀檔失敗:', error);
      toast({
        title: "讀檔失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDefault = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('解析結果.xlsx');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const blob = await response.blob();
      const file = new File([blob], '解析結果.xlsx');
      await handleFileSelect(file);
    } catch (error) {
      console.error('載入預設Excel失敗:', error);
      let errorMsg = `載入預設賽程失敗：${error instanceof Error ? error.message : '未知錯誤'}`;
      
      if (error instanceof Error && 
          (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        errorMsg += '\n\n可能原因：\n1. 請確認同目錄下有 解析結果.xlsx 檔案\n2. 如果是本地開啟，請使用 HTTP 服務器';
      }
      
      toast({
        title: "載入失敗",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActualEndChange = (groupIndex: number, time: string) => {
    if (!time) {
      // 清除實際結束時間
      const originalIndex = groups.findIndex(g => 
        processedGroups[groupIndex] && 
        g.eventNo === processedGroups[groupIndex].eventNo &&
        g.heatNum === processedGroups[groupIndex].heatNum &&
        g.heatTotal === processedGroups[groupIndex].heatTotal
      );
      
      if (originalIndex !== -1) {
        const newGroups = [...groups];
        delete newGroups[originalIndex].actualEnd;
        setGroups(newGroups);
      }
      return;
    }

    const base = new Date();
    const Ls = parseTimeInputToDate(base, config.lunchStart);
    const Le = parseTimeInputToDate(base, config.lunchEnd);
    let d = parseTimeInputToDate(base, time);
    d = moveOutOfLunch(d, Ls, Le);

    const originalIndex = groups.findIndex(g => 
      processedGroups[groupIndex] && 
      g.eventNo === processedGroups[groupIndex].eventNo &&
      g.heatNum === processedGroups[groupIndex].heatNum &&
      g.heatTotal === processedGroups[groupIndex].heatTotal
    );
    
    if (originalIndex !== -1) {
      const newGroups = [...groups];
      newGroups[originalIndex].actualEnd = d;
      setGroups(newGroups);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-2xl shadow-custom-glow">
              <Waves className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-primary">
                游泳比賽動態時間表
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Timer className="w-4 h-4" />
                即時動態 / 天數分組
              </p>
            </div>
          </div>
          <div className="sm:ml-auto">
            <CurrentTime />
          </div>
        </header>

        {/* Control Panel */}
        <ControlPanel
          config={config}
          filters={filters}
          ageGroups={filterOptions.ageGroups}
          genders={filterOptions.genders}
          eventTypes={filterOptions.eventTypes}
          onConfigChange={setConfig}
          onFilterChange={setFilters}
        />

        {/* File Upload */}
        <FileUpload
          onFileSelect={handleFileSelect}
          onLoadDefault={handleLoadDefault}
          isLoading={isLoading}
        />

        {/* Schedule Table */}
        {processedGroups.length > 0 ? (
          <ScheduleTable
            groups={processedGroups}
            onActualEndChange={handleActualEndChange}
          />
        ) : (
          <div className="text-center py-12">
            <div className="p-6 bg-muted/50 rounded-2xl inline-block">
              <div className="w-12 h-12 text-muted-foreground mx-auto mb-3 bg-secondary rounded-lg flex items-center justify-center">
                📊
              </div>
              <h3 className="text-lg font-medium text-muted-foreground">尚未載入賽程資料</h3>
              <p className="text-sm text-muted-foreground mt-1">
                請載入預設賽程或上傳Excel檔案
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwimmingSchedule;