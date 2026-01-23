import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { CurrentTime } from '@/components/CurrentTime';
import { ControlPanel } from '@/components/ControlPanel';
import { FileUpload } from '@/components/FileUpload';
import { ScheduleTable } from '@/components/ScheduleTable';
import { CurrentRaceCard } from '@/components/CurrentRaceCard';
import { SwimGroup, ScheduleConfig, FilterOptions, PlayerData } from '@/types/swimming';
import { parseExcelFile, buildGroupsFromRows, dayKeyOfEvent, dayLabelOfKey } from '@/utils/excelUtils';
import { parseMmSs, parseTimeInputToDate, addSeconds } from '@/utils/timeUtils';
import { parsePlayerCSV, getUniquePlayersFromCSV } from '@/utils/csvUtils';
import { saveActualTime, removeActualTime, loadActualTime, clearAllActualTimes, getActualTimeCount } from '@/utils/actualTimeStorage';
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
    fallback: '06:00',
  });
  const [filters, setFilters] = useState<FilterOptions>({
    daySelect: '', // 改為空字串,表示未選擇任何天數
    ageGroupSelect: 'all',
    genderSelect: 'all',
    eventTypeSelect: 'all',
    unitSelect: 'all', // 新增：參賽單位篩選
    playerSelect: 'all',
    playerSearch: '', // 選手名稱搜尋
  });
  const [actualTimeVersion, setActualTimeVersion] = useState(0);

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
    
    // 轉換為陣列，使用完整的日期標籤
    const days = Array.from(dayMap.entries()).map(([key, originalLabel]) => ({
      key,
      label: originalLabel, // 使用完整的日期標籤，例如「第一天（114/10/31，五）」
      originalLabel
    })).sort((a, b) => a.key.localeCompare(b.key));
    
    // 從 Excel 解析的 groups 中提取所有選手名單和單位
    const allPlayersFromExcel = new Set<string>();
    const allUnitsFromExcel = new Set<string>();
    
    groups.forEach(g => {
      if (g.playerData && g.playerData.length > 0) {
        g.playerData.forEach(p => {
          // 收集所有單位
          if (p.unit) allUnitsFromExcel.add(p.unit);
          
          // 如果有選擇單位，只收集該單位的選手
          if (p.name) {
            if (!filters.unitSelect || filters.unitSelect === 'all' || p.unit === filters.unitSelect) {
              allPlayersFromExcel.add(p.name);
            }
          }
        });
      }
      // 舊格式兼容：如果沒有 playerData，使用 playerNames
      if (g.playerNames && g.playerNames.length > 0 && (!filters.unitSelect || filters.unitSelect === 'all')) {
        g.playerNames.forEach(name => allPlayersFromExcel.add(name));
      }
    });
    
    // 合併 Excel 和 CSV 的選手名單（優先使用 Excel 的）
    // 如果有選擇單位，CSV 選手不加入
    const csvPlayers = (!filters.unitSelect || filters.unitSelect === 'all') ? getUniquePlayersFromCSV(players) : [];
    const combinedPlayers = [
      ...Array.from(allPlayersFromExcel),
      ...csvPlayers.filter(name => !allPlayersFromExcel.has(name))
    ].sort((a, b) => a.localeCompare(b, 'zh-TW'));
    
    return {
      days,
      ageGroups: [...new Set(groups.map(g => g.ageGroup).filter(Boolean))].sort(),
      genders: [...new Set(groups.map(g => g.gender).filter(Boolean))].sort(),
      eventTypes: [...new Set(groups.map(g => g.eventType).filter(Boolean))].sort(),
      units: Array.from(allUnitsFromExcel).sort((a, b) => a.localeCompare(b, 'zh-TW')), // 新增：單位列表
      players: combinedPlayers,
    };
  }, [groups, players, filters.unitSelect]);

  // 應用篩選和計算時間
  const processedGroups = useMemo(() => {
    // 如果沒有載入資料或沒有選擇天數，返回空陣列
    if (!groups.length || !filters.daySelect) return [];

    const base = new Date();
    const fallbackSeconds = parseMmSs(config.fallback) ?? 360;

    // 更新平均時間
    const updatedGroups = groups.map(g => {
      if (!g.times || g.times.length === 0) {
        const sameEventGroups = groups.filter(other =>
          other.eventNo === g.eventNo && other.times && other.times.length > 0
        );
        if (sameEventGroups.length > 0) {
          // 過濾掉 null/undefined/NaN 值，避免 Math.max 返回錯誤結果
          const validTimes = sameEventGroups
            .map(group => group.avgSeconds)
            .filter(time => time != null && !isNaN(time) && time > 0);

          if (validTimes.length > 0) {
            const maxTime = Math.max(...validTimes);
            return { ...g, avgSeconds: maxTime };
          }
        }
        return { ...g, avgSeconds: fallbackSeconds };
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

      // 確保 cursor 已初始化（防止第一筆資料沒有 dayLabel 的情況）
      if (!cursor) {
        cursor = parseTimeInputToDate(base, '08:15');
      }

      if (i > 0 && allSorted[i - 1].dayLabel === g.dayLabel) {
        const prev = allSorted[i - 1];
        if (prev.actualEnd) {
          cursor = addSeconds(prev.actualEnd, config.turnover);
        }
      }

      const estStart = new Date(cursor);
      const estEnd = addSeconds(estStart, g.avgSeconds);

      const updatedGroup = {
        ...g,
        scheduledStart: estStart,
        scheduledEnd: estEnd,
        actualEnd: g.actualEnd,
      };

      const displayEnd = g.actualEnd ?? estEnd;
      cursor = addSeconds(displayEnd, config.turnover);

      return updatedGroup;
    });

    // 然後應用篩選
    let filtered = allWithTimes;
    
    if (filters.daySelect) {
      filtered = filtered.filter(g => g.dayKey === filters.daySelect);
    }
    if (filters.ageGroupSelect && filters.ageGroupSelect !== 'all') filtered = filtered.filter(g => g.ageGroup === filters.ageGroupSelect);
    if (filters.genderSelect && filters.genderSelect !== 'all') filtered = filtered.filter(g => g.gender === filters.genderSelect);
    if (filters.eventTypeSelect && filters.eventTypeSelect !== 'all') filtered = filtered.filter(g => g.eventType === filters.eventTypeSelect);
    
    // 參賽單位篩選
    if (filters.unitSelect && filters.unitSelect !== 'all') {
      filtered = filtered.filter(g => {
        // 檢查該組的選手資料中是否有該單位的選手
        if (g.playerData && g.playerData.length > 0) {
          return g.playerData.some(p => p.unit === filters.unitSelect);
        }
        return false;
      });
    }
    
    // 選手名單篩選（從 Excel 解析的選手名單）
    if (filters.playerSelect && filters.playerSelect !== 'all') {
      filtered = filtered.filter(g => {
        // 檢查該組的選手名單中是否包含所選選手
        if (g.playerNames && g.playerNames.length > 0) {
          return g.playerNames.includes(filters.playerSelect);
        }
        
        // 如果沒有選手名單，再從 CSV 資料中查找（向後兼容）
        if (players.length > 0) {
          const normalizeEventName = (eventName: string) => {
            return eventName.replace(/\s+/g, ''); // 移除所有空格
          };
          
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
        }
        
        return false;
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
    
    // 自動隱藏已完賽組別，只保留當前比賽組別前15項
    if (filtered.length > 15) {
      const now = new Date();
      
      // 找到當前正在比賽的組別（當前時間在 scheduledStart 和 scheduledEnd 之間）
      // 或者找到即將比賽的組別（當前時間還沒到 scheduledStart）
      let currentGroupIndex = filtered.findIndex(g => {
        const start = g.scheduledStart;
        const end = g.actualEnd || g.scheduledEnd;
        return now >= start && now <= end;
      });
      
      // 如果找不到正在比賽的組別，找到第一個還沒開始的組別
      if (currentGroupIndex === -1) {
        currentGroupIndex = filtered.findIndex(g => now < g.scheduledStart);
      }
      
      // 如果還是找不到（所有組別都已結束），顯示最後15項
      if (currentGroupIndex === -1) {
        filtered = filtered.slice(-15);
      } else {
        // 保留當前組別及其前14項（共15項）到結尾
        const startIndex = Math.max(0, currentGroupIndex - 14);
        filtered = filtered.slice(startIndex);
      }
    }
    
    return filtered;
  }, [groups, config, filters, actualTimeVersion]);

  // 計算當前比賽組別和準備檢錄組別
  const { currentGroup, inspectionGroup } = useMemo(() => {
    const now = new Date();
    
    console.log('=== 檢查當前比賽組別 ===');
    console.log('當前時間:', now.toLocaleTimeString());
    console.log('processedGroups 數量:', processedGroups.length);
    
    // 找到當前正在比賽的組別（當前時間在 scheduledStart 和 actualEnd/scheduledEnd 之間）
    const currentIndex = processedGroups.findIndex((g, idx) => {
      const start = g.scheduledStart;
      const end = g.actualEnd || g.scheduledEnd;
      const isInRange = now >= start && now <= end;
      
      if (idx < 5) { // 只顯示前5組的資訊
        console.log(`組別 ${idx}: 項次${g.eventNo} ${g.heatNum}/${g.heatTotal}`);
        console.log(`  scheduledStart: ${start.toLocaleTimeString()}`);
        console.log(`  scheduledEnd: ${g.scheduledEnd.toLocaleTimeString()}`);
        console.log(`  actualEnd: ${g.actualEnd ? g.actualEnd.toLocaleTimeString() : '無'}`);
        console.log(`  使用的結束時間: ${end.toLocaleTimeString()}`);
        console.log(`  是否在範圍內: ${isInRange}`);
      }
      
      return isInRange;
    });
    
    console.log('找到的 currentIndex:', currentIndex);
    
    // 如果找不到正在比賽的組別，找到第一個還沒開始的組別
    const currentIdx = currentIndex === -1 
      ? processedGroups.findIndex(g => now < g.scheduledStart)
      : currentIndex;
    
    console.log('最終的 currentIdx:', currentIdx);
    
    const current = currentIdx !== -1 ? processedGroups[currentIdx] : null;
    
    if (current) {
      console.log('當前比賽組別:', `項次${current.eventNo} ${current.heatNum}/${current.heatTotal}`);
    }
    
    // 準備檢錄組別為當前組別往後第10組
    const inspectionIdx = currentIdx !== -1 ? currentIdx + 10 : -1;
    const inspection = inspectionIdx !== -1 && inspectionIdx < processedGroups.length 
      ? processedGroups[inspectionIdx] 
      : null;
    
    return {
      currentGroup: current,
      inspectionGroup: inspection
    };
  }, [processedGroups]);

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
        // 如果該組有選手資料（包含姓名和成績），為每位選手建立一筆記錄
        if (group.playerData && group.playerData.length > 0) {
          return group.playerData.map((player: any) => ({
            item_number: group.eventNo,
            group_number: group.heatNum,
            age_group: group.ageGroup,
            gender: group.gender,
            event_name: group.eventType,
            participant_name: player.name,
            unit: player.unit || '', // 使用選手的單位
            registration_time: player.timeStr || null, // 使用選手的報名成績
          }));
        }
        // 如果只有選手姓名列表（舊格式兼容）
        else if (group.playerNames && group.playerNames.length > 0) {
          return group.playerNames.map((playerName: string) => ({
            item_number: group.eventNo,
            group_number: group.heatNum,
            age_group: group.ageGroup,
            gender: group.gender,
            event_name: group.eventType,
            participant_name: playerName,
            unit: '',
            registration_time: null,
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
    } catch (error) {
      throw new Error('更新資料庫失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  const loadScheduleFromDatabase = async (): Promise<SwimGroup[]> => {
    try {
      // 分批載入所有資料以避免 Supabase 的預設限制
      let allData: any[] = [];
      let hasMore = true;
      let offset = 0;
      const batchSize = 1000;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('swimming_schedule')
          .select('*')
          .order('item_number', { ascending: true })
          .order('group_number', { ascending: true })
          .range(offset, offset + batchSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = allData.concat(data);
          offset += batchSize;
          hasMore = data.length === batchSize; // 如果返回數量少於批次大小，表示已經是最後一批
        } else {
          hasMore = false;
        }
      }
      
      if (allData.length === 0) {
        throw new Error('資料庫中沒有賽程資料');
      }

      // 將資料庫資料轉換為 SwimGroup 格式
      const groupMap = new Map<string, SwimGroup>();
      
      allData.forEach(row => {
        const key = `${row.item_number}|${row.group_number}`;
        
        if (!groupMap.has(key)) {
          // 從資料庫第一筆記錄推算 heatTotal
          const sameEvent = allData.filter(r => r.item_number === row.item_number && r.group_number === row.group_number);
          const allGroupsInEvent = allData.filter(r => r.item_number === row.item_number);
          const maxHeatNum = Math.max(...allGroupsInEvent.map(r => r.group_number));
          
          groupMap.set(key, {
            eventNo: row.item_number,
            heatNum: row.group_number,
            heatTotal: maxHeatNum,
            ageGroup: row.age_group,
            gender: row.gender,
            eventType: row.event_name,
            times: [],
            playerNames: [],
            playerData: [], // 新增 playerData 陣列
            avgSeconds: parseMmSs(row.registration_time || '') || 360,
            dayKey: dayKeyOfEvent(row.item_number),
            dayLabel: dayLabelOfKey(dayKeyOfEvent(row.item_number)),
          });
        }
        
        const group = groupMap.get(key)!;
        
        // 收集選手姓名和完整資料
        if (row.participant_name) {
          // 收集到 playerNames（向後兼容）
          if (!group.playerNames!.includes(row.participant_name)) {
            group.playerNames!.push(row.participant_name);
          }
          
          // 收集到 playerData（包含 unit 和成績）
          if (!group.playerData) {
            group.playerData = [];
          }
          const time = parseMmSs(row.registration_time || '');
          group.playerData.push({
            name: row.participant_name,
            timeStr: row.registration_time || '',
            unit: row.unit || '', // 加入單位資訊
            time: time, // 加入解析後的時間（秒數）
          });
        }
        
        // 收集成績時間
        const time = parseMmSs(row.registration_time || '');
        if (time) {
          group.times.push(time);
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

      const sortedGroups = groups.sort((a, b) => a.eventNo - b.eventNo || a.heatNum - b.heatNum);
      
      // 從 localStorage 載入實際結束時間並合併到 groups
      const groupsWithActualTimes = sortedGroups.map(group => {
        const actualEnd = loadActualTime(group.eventNo, group.heatNum);
        return actualEnd ? { ...group, actualEnd } : group;
      });
      
      return groupsWithActualTimes;
    } catch (error) {
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
      setGroups(newGroups);
      
      const maxEventNo = Math.max(...newGroups.map(g => g.eventNo));
      
      toast({
        title: "預設賽程載入成功",
        description: `成功從資料庫載入 ${newGroups.length} 組比賽資料（項次 1-${maxEventNo}）`,
      });
    } catch (error) {
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
    const targetGroup = processedGroups[groupIndex];
    if (!targetGroup) return;

    if (!time) {
      // 清除實際結束時間
      const originalIndex = groups.findIndex(g => 
        g.eventNo === targetGroup.eventNo &&
        g.heatNum === targetGroup.heatNum &&
        g.heatTotal === targetGroup.heatTotal
      );
      
      if (originalIndex !== -1) {
        const newGroups = [...groups];
        delete newGroups[originalIndex].actualEnd;
        setGroups(newGroups);
        
        // 從 localStorage 移除
        removeActualTime(targetGroup.eventNo, targetGroup.heatNum);
        
        // 強制重新計算 processedGroups
        setActualTimeVersion(v => v + 1);
      }
      return;
    }

    const base = new Date();
    const d = parseTimeInputToDate(base, time);

    const originalIndex = groups.findIndex(g => 
      g.eventNo === targetGroup.eventNo &&
      g.heatNum === targetGroup.heatNum &&
      g.heatTotal === targetGroup.heatTotal
    );
    
    if (originalIndex !== -1) {
      const newGroups = [...groups];
      newGroups[originalIndex].actualEnd = d;
      setGroups(newGroups);
      
      console.log('=== 更新實際結束時間 ===');
      console.log(`項次 ${targetGroup.eventNo} 組次 ${targetGroup.heatNum}`);
      console.log('新的實際結束時間:', d.toLocaleTimeString());
      
      // 同步寫入 localStorage
      saveActualTime(targetGroup.eventNo, targetGroup.heatNum, d);
      
      // 強制重新計算 processedGroups
      setActualTimeVersion(v => v + 1);
    }
  };

  const handleClearActualTimes = () => {
    if (window.confirm('確定要清除所有手動設定的實際結束時間嗎？')) {
      clearAllActualTimes();
      // 清除當前 groups 中的所有 actualEnd
      const newGroups = groups.map(g => {
        const { actualEnd, ...rest } = g;
        return rest;
      });
      setGroups(newGroups);
      
      // 強制重新計算 processedGroups
      setActualTimeVersion(v => v + 1);
      
      toast({
        title: "已清除實際時間",
        description: "所有手動設定的實際結束時間已清除",
      });
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
          units={filterOptions.units}
          players={filterOptions.players}
          onConfigChange={setConfig}
          onFilterChange={setFilters}
          onClearActualTimes={handleClearActualTimes}
          actualTimeCount={getActualTimeCount()}
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

        {/* Current Race Card */}
        {filters.daySelect && processedGroups.length > 0 && (
          <CurrentRaceCard 
            currentGroup={currentGroup}
            inspectionGroup={inspectionGroup}
          />
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