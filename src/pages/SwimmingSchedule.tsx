import { useState, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { CurrentTime } from '@/components/CurrentTime';
import { ControlPanel } from '@/components/ControlPanel';
import { FileUpload } from '@/components/FileUpload';
import { ScheduleTable } from '@/components/ScheduleTable';
import { SwimGroup, ScheduleConfig, FilterOptions } from '@/types/swimming';
import { parseExcelFile, buildGroupsFromRows } from '@/utils/excelUtils';
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
    daySelect: 'all',
    ageGroupSelect: 'all',
    genderSelect: 'all',
    eventTypeSelect: 'all',
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
    if (filters.daySelect && filters.daySelect !== 'all') filtered = filtered.filter(g => g.dayKey === filters.daySelect);
    if (filters.ageGroupSelect && filters.ageGroupSelect !== 'all') filtered = filtered.filter(g => g.ageGroup === filters.ageGroupSelect);
    if (filters.genderSelect && filters.genderSelect !== 'all') filtered = filtered.filter(g => g.gender === filters.genderSelect);
    if (filters.eventTypeSelect && filters.eventTypeSelect !== 'all') filtered = filtered.filter(g => g.eventType === filters.eventTypeSelect);

    // 按照項次和組次排序確保正確的時間順序
    filtered = filtered.sort((a, b) => {
      if (a.eventNo !== b.eventNo) return a.eventNo - b.eventNo;
      return a.heatNum - b.heatNum;
    });

    // 調試：檢查篩選結果
    console.log('篩選後的前5個項目:', filtered.slice(0, 5).map(g => ({
      eventNo: g.eventNo,
      heatNum: g.heatNum,
      ageGroup: g.ageGroup,
      gender: g.gender,
      eventType: g.eventType,
      dayKey: g.dayKey
    })));

    // 計算時間
    let cursor: Date | null = null;
    let currentDay = '';

    const getDayStartTime = (dayKey: string) => {
      switch (dayKey) {
        case 'd1': return '09:00';
        case 'd2': return '08:15';
        case 'd3': return '08:15';
        default: return '08:15';
      }
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
      
      // 載入JSON格式的預設資料
      const jsonResponse = await fetch('/sample-data.json');
      if (!jsonResponse.ok) {
        throw new Error(`HTTP ${jsonResponse.status}: ${jsonResponse.statusText}`);
      }
      
      const jsonData = await jsonResponse.json();
      console.log('JSON資料筆數:', jsonData.length);
      console.log('JSON前5筆:', jsonData.slice(0, 5));
      console.log('JSON項次範圍:', Math.min(...jsonData.map((d: any) => parseInt(d.項次))), '-', Math.max(...jsonData.map((d: any) => parseInt(d.項次))));
      
      const fallback = parseMmSs(config.fallback) ?? 360;
      const newGroups = buildGroupsFromRows(jsonData, fallback);
      console.log('解析後組別數:', newGroups.length);
      console.log('解析後前5組:', newGroups.slice(0, 5));
      setGroups(newGroups);
      
      // 檢查載入的項次範圍
      const maxEventNo = Math.max(...newGroups.map(g => g.eventNo));
      console.log('最大項次:', maxEventNo);
      
      toast({
        title: "預設賽程載入成功",
        description: `成功載入 ${newGroups.length} 組比賽資料（項次 1-${maxEventNo}）`,
      });
    } catch (error) {
      console.error('載入預設資料失敗:', error);
      let errorMsg = `載入預設賽程失敗：${error instanceof Error ? error.message : '未知錯誤'}`;
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMsg += '\n\n可能原因：\n1. 網路連線問題\n2. 預設資料檔案缺失';
        }
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