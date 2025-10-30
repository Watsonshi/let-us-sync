import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { CurrentTime } from '@/components/CurrentTime';
import { ControlPanel } from '@/components/ControlPanel';
import { FileUpload } from '@/components/FileUpload';
import { ScheduleTable } from '@/components/ScheduleTable';
import { SwimGroup, ScheduleConfig, FilterOptions, PlayerData } from '@/types/swimming';
import { parseExcelFile, buildGroupsFromRows, dayKeyOfEvent, dayLabelOfKey } from '@/utils/excelUtils';
import { parseMmSs, parseTimeInputToDate, moveOutOfLunch, addSecondsSkippingLunch, advanceCursor } from '@/utils/timeUtils';
import { parsePlayerCSV, getUniquePlayersFromCSV } from '@/utils/csvUtils';
import { Waves, Timer, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SwimmingSchedule = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [groups, setGroups] = useState<SwimGroup[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ScheduleConfig>({
    turnover: 20,
    lunchStart: '12:00',
    lunchEnd: '13:30',
    fallback: '06:00',
  });
  const [filters, setFilters] = useState<FilterOptions>({
    daySelect: '', // 改為空字串,表示未選擇任何天數
    ageGroupSelect: 'all',
    genderSelect: 'all',
    eventTypeSelect: 'all',
    playerSelect: 'all',
    playerSearch: '', // 選手名稱搜尋
  });

  // 自動載入資料
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const newGroups = await loadScheduleFromDatabase();
        if (newGroups.length > 0) {
          setGroups(newGroups);
          
          // 自動選擇第一天
          const firstDay = newGroups[0]?.dayKey;
          if (firstDay) {
            setFilters(prev => ({ ...prev, daySelect: firstDay }));
          }
        }
      } catch (error) {
        // 初次載入失敗不顯示錯誤訊息，讓使用者可以手動上傳
        console.log('初次載入資料庫資料失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 計算篩選選項
  const filterOptions = useMemo(() => {
    // 用 Map 去重，避免重複的 dayKey
    const dayMap = new Map();
    groups.forEach(g => {
      if (g.dayKey && g.dayLabel && !dayMap.has(g.dayKey)) {
        dayMap.set(g.dayKey, g.dayLabel);
      }
    });
    
    // 轉換為陣列並產生簡潔的 Day 標籤
    const days = Array.from(dayMap.entries()).map(([key, originalLabel], index) => ({
      key,
      label: `Day ${index + 1}`,
      originalLabel
    })).sort((a, b) => a.key.localeCompare(b.key));
    
    return {
      days,
      ageGroups: [...new Set(groups.map(g => g.ageGroup).filter(Boolean))].sort(),
      genders: [...new Set(groups.map(g => g.gender).filter(Boolean))].sort(),
      eventTypes: [...new Set(groups.map(g => g.eventType).filter(Boolean))].sort(),
      players: getUniquePlayersFromCSV(players),
    };
  }, [groups, players]);

  // 應用篩選和計算時間
  const processedGroups = useMemo(() => {
    console.log('processedGroups 計算中，groups 數量:', groups.length);
    console.log('當前選擇天數:', filters.daySelect);
    
    // 如果沒有載入資料或沒有選擇天數，返回空陣列
    if (!groups.length || !filters.daySelect) return [];

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
          const maxTime = Math.max(...sameEventGroups.map(group => group.avgSeconds));
          return { ...g, avgSeconds: maxTime };
        } else {
          return { ...g, avgSeconds: fallbackSeconds };
        }
      }
      return g;
    });

    // 先對完整資料按照項次和組次排序
    const allSorted = updatedGroups.sort((a, b) => {
      if (a.eventNo !== b.eventNo) return a.eventNo - b.eventNo;
      return a.heatNum - b.heatNum;
    });

    // 先基於完整資料計算所有時間
    const getDayStartTime = (dayKey: string) => {
      switch (dayKey) {
        case 'd1': return '09:00';
        case 'd2': return '08:15';
        case 'd3': return '08:15';
        default: return '08:15';
      }
    };

    let cursor: Date | null = null;
    let currentDay = '';
    
    const allWithTimes = allSorted.map((g, i) => {
      if (g.dayLabel && g.dayLabel !== currentDay) {
        currentDay = g.dayLabel;
        const dayStartTime = getDayStartTime(g.dayKey);
        cursor = parseTimeInputToDate(base, dayStartTime);
      }

      if (i > 0 && allSorted[i - 1].dayLabel === g.dayLabel) {
        const prev = allSorted[i - 1];
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

    // 然後應用篩選
    let filtered = allWithTimes;
    console.log('篩選前總組數:', filtered.length);
    console.log('篩選前項次範圍:', Math.min(...filtered.map(g => g.eventNo)), '-', Math.max(...filtered.map(g => g.eventNo)));
    
    if (filters.daySelect) {
      filtered = filtered.filter(g => g.dayKey === filters.daySelect);
      console.log('天數篩選後:', filtered.length, '組');
    }
    if (filters.ageGroupSelect && filters.ageGroupSelect !== 'all') filtered = filtered.filter(g => g.ageGroup === filters.ageGroupSelect);
    if (filters.genderSelect && filters.genderSelect !== 'all') filtered = filtered.filter(g => g.gender === filters.genderSelect);
    if (filters.eventTypeSelect && filters.eventTypeSelect !== 'all') filtered = filtered.filter(g => g.eventType === filters.eventTypeSelect);
    
    // 選手名單篩選（從載入的CSV檔案）
    if (filters.playerSelect && filters.playerSelect !== 'all') {
      // 正規化項目名稱的函數（移除空格差異）
      const normalizeEventName = (eventName: string) => {
        return eventName.replace(/\s+/g, ''); // 移除所有空格
      };
      
      filtered = filtered.filter(g => {
        // 使用正規化的項目名稱進行比較，並且要匹配組次
        const matchingPlayers = players.filter(p => {
          const ageGroupMatch = p.ageGroup === g.ageGroup;
          const genderMatch = p.gender === g.gender;
          const eventTypeMatch = normalizeEventName(p.eventType) === normalizeEventName(g.eventType);
          const playerNameMatch = p.playerName === filters.playerSelect;
          
          // 解析組次資訊 (例如 "1/5" -> heatNum: 1, heatTotal: 5)
          const heatParts = p.heat.split('/');
          const playerHeatNum = parseInt(heatParts[0]);
          const playerHeatTotal = parseInt(heatParts[1]);
          
          const heatMatch = g.heatNum === playerHeatNum && g.heatTotal === playerHeatTotal;
          
          return ageGroupMatch && genderMatch && eventTypeMatch && playerNameMatch && heatMatch;
        });
        
        return matchingPlayers.length > 0;
      });
    }

    // 選手名稱搜尋（模糊搜尋任何選手名稱）
    if (filters.playerSearch && filters.playerSearch.trim() !== '') {
      const searchTerm = filters.playerSearch.trim().toLowerCase();
      filtered = filtered.filter(g => {
        // 如果該組有選手姓名列表，則搜尋其中是否包含目標選手
        if (g.playerNames && g.playerNames.length > 0) {
          return g.playerNames.some(name => 
            name.toLowerCase().includes(searchTerm)
          );
        }
        
        // 也從載入的選手資料中搜尋
        const matchingPlayers = players.filter(p => {
          const normalizeEventName = (eventName: string) => {
            return eventName.replace(/\s+/g, '');
          };
          
          const ageGroupMatch = p.ageGroup === g.ageGroup;
          const genderMatch = p.gender === g.gender;
          const eventTypeMatch = normalizeEventName(p.eventType) === normalizeEventName(g.eventType);
          const playerNameMatch = p.playerName.toLowerCase().includes(searchTerm);
          
          const heatParts = p.heat.split('/');
          const playerHeatNum = parseInt(heatParts[0]);
          const playerHeatTotal = parseInt(heatParts[1]);
          
          const heatMatch = g.heatNum === playerHeatNum && g.heatTotal === playerHeatTotal;
          
          return ageGroupMatch && genderMatch && eventTypeMatch && playerNameMatch && heatMatch;
        });
        
        return matchingPlayers.length > 0;
      });
    }

    console.log('最終篩選結果:', filtered.length, '組');
    console.log('最終項次範圍:', filtered.length > 0 ? `${Math.min(...filtered.map(g => g.eventNo))}-${Math.max(...filtered.map(g => g.eventNo))}` : '無資料');
    return filtered;
  }, [groups, config, filters]);

  const handleFileSelect = async (file: File) => {
    // 檢查是否為管理員
    if (!isAdmin) {
      toast({
        title: "權限不足",
        description: "只有管理員可以上傳檔案",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const fallback = parseMmSs(config.fallback) ?? 360;
      const newGroups = await parseExcelFile(file, fallback);
      setGroups(newGroups);
      
      // 將資料寫入資料庫
      await saveScheduleToDatabase(newGroups);
      
      toast({
        title: "檔案載入成功",
        description: `成功載入 ${newGroups.length} 組比賽資料並更新資料庫`,
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

  const saveScheduleToDatabase = async (groups: SwimGroup[]) => {
    try {
      // 先刪除所有現有資料
      const { error: deleteError } = await supabase
        .from('swimming_schedule')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 刪除所有記錄
      
      if (deleteError) throw deleteError;

      // 準備要插入的資料
      const scheduleData = groups.flatMap(group => {
        // 如果該組有選手姓名列表，為每位選手建立一筆記錄
        if (group.playerNames && group.playerNames.length > 0) {
          return group.playerNames.map(playerName => ({
            item_number: group.eventNo,
            group_number: group.heatNum,
            age_group: group.ageGroup,
            gender: group.gender,
            event_name: group.eventType,
            participant_name: playerName,
            unit: '', // Excel 中沒有單位資訊，設為空
            registration_time: null, // 可以從 times 陣列取得，但目前設為 null
          }));
        } else {
          // 如果沒有選手姓名，建立一筆空記錄
          return [{
            item_number: group.eventNo,
            group_number: group.heatNum,
            age_group: group.ageGroup,
            gender: group.gender,
            event_name: group.eventType,
            participant_name: '',
            unit: '',
            registration_time: null,
          }];
        }
      });

      // 批次插入資料
      const { error: insertError } = await supabase
        .from('swimming_schedule')
        .insert(scheduleData);
      
      if (insertError) throw insertError;
      
      console.log(`成功寫入 ${scheduleData.length} 筆賽程資料到資料庫`);
    } catch (error) {
      console.error('寫入資料庫失敗:', error);
      throw new Error('更新資料庫失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  const loadScheduleFromDatabase = async (): Promise<SwimGroup[]> => {
    try {
      const { data, error } = await supabase
        .from('swimming_schedule')
        .select('*')
        .order('item_number', { ascending: true })
        .order('group_number', { ascending: true });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('資料庫中沒有賽程資料');
      }

      // 將資料庫資料轉換為 SwimGroup 格式
      const groupMap = new Map<string, SwimGroup>();
      
      data.forEach(row => {
        const key = `${row.item_number}|${row.group_number}`;
        
        if (!groupMap.has(key)) {
          // 從資料庫第一筆記錄推算 heatTotal
          const sameEvent = data.filter(r => r.item_number === row.item_number);
          const maxHeatNum = Math.max(...sameEvent.map(r => r.group_number));
          
          groupMap.set(key, {
            eventNo: row.item_number,
            heatNum: row.group_number,
            heatTotal: maxHeatNum,
            ageGroup: row.age_group,
            gender: row.gender,
            eventType: row.event_name,
            times: [],
            playerNames: [],
            avgSeconds: parseMmSs(row.registration_time || '') || 360,
            dayKey: dayKeyOfEvent(row.item_number),
            dayLabel: dayLabelOfKey(dayKeyOfEvent(row.item_number)),
          });
        }
        
        // 收集選手姓名
        if (row.participant_name && !groupMap.get(key)!.playerNames!.includes(row.participant_name)) {
          groupMap.get(key)!.playerNames!.push(row.participant_name);
        }
        
        // 收集成績時間
        const time = parseMmSs(row.registration_time || '');
        if (time) {
          groupMap.get(key)!.times.push(time);
        }
      });

      // 計算平均時間
      const groups = Array.from(groupMap.values()).map(g => ({
        ...g,
        avgSeconds: g.times.length ? Math.max(...g.times) : 360,
      }));

      // 處理無成績組別
      groups.forEach(g => {
        if (!g.times.length) {
          const sameEventGroups = groups.filter(other => 
            other.eventNo === g.eventNo && other.times.length > 0
          );
          
          if (sameEventGroups.length > 0) {
            const maxTime = Math.max(...sameEventGroups.map(group => group.avgSeconds));
            g.avgSeconds = maxTime;
          }
        }
      });

      return groups.sort((a, b) => a.eventNo - b.eventNo || a.heatNum - b.heatNum);
    } catch (error) {
      console.error('從資料庫載入失敗:', error);
      throw error;
    }
  };

  const handleLoadPlayerList = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/player-list.csv');
      if (!response.ok) {
        throw new Error(`無法載入選手名單: ${response.statusText}`);
      }
      
      const csvContent = await response.text();
      const playerData = parsePlayerCSV(csvContent);
      setPlayers(playerData);
      
      toast({
        title: "選手名單載入成功",
        description: `成功載入 ${getUniquePlayersFromCSV(playerData).length} 位選手資料`,
      });
    } catch (error) {
      console.error('載入選手名單失敗:', error);
      toast({
        title: "載入失敗",
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
      
      // 從資料庫載入賽程資料
      const newGroups = await loadScheduleFromDatabase();
      console.log('從資料庫載入組別數:', newGroups.length);
      console.log('前5組:', newGroups.slice(0, 5));
      setGroups(newGroups);
      
      const maxEventNo = Math.max(...newGroups.map(g => g.eventNo));
      console.log('最大項次:', maxEventNo);
      
      toast({
        title: "預設賽程載入成功",
        description: `成功從資料庫載入 ${newGroups.length} 組比賽資料（項次 1-${maxEventNo}）`,
      });
    } catch (error) {
      console.error('載入預設資料失敗:', error);
      let errorMsg = `載入預設賽程失敗：${error instanceof Error ? error.message : '未知錯誤'}`;
      
      if (error instanceof Error) {
        if (error.message.includes('資料庫中沒有賽程資料')) {
          errorMsg += '\n\n資料庫目前是空的，請先上傳 Excel 檔案來建立資料';
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
          <div className="sm:ml-auto flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {user.email}
                  {isAdmin && (
                    <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                      管理員
                    </span>
                  )}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    await signOut();
                    navigate('/auth');
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  登出
                </Button>
              </div>
            )}
            {!user && !authLoading && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/auth')}
              >
                登入
              </Button>
            )}
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
          players={filterOptions.players}
          onConfigChange={setConfig}
          onFilterChange={setFilters}
        />

        {/* File Upload */}
        {isAdmin && (
          <FileUpload
            onFileSelect={handleFileSelect}
            onLoadDefault={handleLoadDefault}
            onLoadPlayerList={handleLoadPlayerList}
            isLoading={isLoading}
          />
        )}
        
        {!isAdmin && !authLoading && (
          <div className="bg-background rounded-xl border border-border/50 p-6 shadow-sm text-center">
            <p className="text-muted-foreground">
              檔案上傳功能僅限管理員使用。請先 
              <button 
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline mx-1"
              >
                登入
              </button>
              以管理賽程資料。
            </p>
          </div>
        )}

        {/* Day Navigation */}
        {filterOptions.days.length > 0 && (
          <div className="bg-background rounded-xl border border-border/50 p-6 shadow-sm">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">選擇比賽天數</h2>
              <p className="text-sm text-muted-foreground">選擇要檢視的比賽日程</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
              {filterOptions.days.map((day) => (
                <Button
                  key={day.key}
                  variant={filters.daySelect === day.key ? "default" : "outline"}
                  size="lg"
                  onClick={() => setFilters(prev => ({ ...prev, daySelect: day.key }))}
                  className="min-w-24 transition-all duration-200 hover:scale-105"
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Table */}
        {filters.daySelect && processedGroups.length > 0 ? (
          <ScheduleTable
            groups={processedGroups}
            onActualEndChange={handleActualEndChange}
          />
        ) : groups.length > 0 && !filters.daySelect ? (
          <div className="text-center py-12">
            <div className="p-6 bg-muted/50 rounded-2xl inline-block">
              <div className="w-12 h-12 text-muted-foreground mx-auto mb-3 bg-secondary rounded-lg flex items-center justify-center">
                📅
              </div>
              <h3 className="text-lg font-medium text-muted-foreground">請選擇比賽天數</h3>
              <p className="text-sm text-muted-foreground mt-1">
                請在上方選擇要檢視的比賽日程
              </p>
            </div>
          </div>
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