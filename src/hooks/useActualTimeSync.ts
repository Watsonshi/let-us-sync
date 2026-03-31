import { logger } from '@/lib/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadAllActualTimesFromDb, saveActualTimeToDb, removeActualTimeFromDb, clearAllActualTimesFromDb, getActualTimeCountFromDb } from '@/utils/actualTimeSync';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface ActualTimeRecord {
  id: string;
  event_no: number;
  heat_num: number;
  actual_end: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseActualTimeSyncResult {
  actualTimes: Map<string, Date>;
  isLoading: boolean;
  error: string | null;
  actualTimeCount: number;
  saveActualTime: (eventNo: number, heatNum: number, actualEnd: Date) => Promise<boolean>;
  removeActualTime: (eventNo: number, heatNum: number) => Promise<boolean>;
  clearAllActualTimes: () => Promise<boolean>;
  getActualTime: (eventNo: number, heatNum: number) => Date | undefined;
}

export function useActualTimeSync(): UseActualTimeSyncResult {
  const [actualTimes, setActualTimes] = useState<Map<string, Date>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualTimeCount, setActualTimeCount] = useState(0);

  // 初始載入資料
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { data, error: loadError } = await loadAllActualTimesFromDb();
      
      if (loadError) {
        setError(loadError);
      } else {
        setActualTimes(data);
        setActualTimeCount(data.size);
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  // 訂閱 Realtime 更新
  useEffect(() => {
    const channel = supabase
      .channel('actual-times-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'actual_times' },
        (payload: RealtimePostgresChangesPayload<ActualTimeRecord>) => {
          logger.log('Realtime 更新:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as ActualTimeRecord;
            const key = `${record.event_no}_${record.heat_num}`;
            
            setActualTimes(prev => {
              const newMap = new Map(prev);
              newMap.set(key, new Date(record.actual_end));
              return newMap;
            });
            
            setActualTimeCount(prev => {
              // 如果是新增，數量+1；如果是更新，數量不變
              if (payload.eventType === 'INSERT') {
                return prev + 1;
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as ActualTimeRecord;
            const key = `${record.event_no}_${record.heat_num}`;
            
            setActualTimes(prev => {
              const newMap = new Map(prev);
              newMap.delete(key);
              return newMap;
            });
            
            setActualTimeCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 儲存實際結束時間
  const saveActualTime = useCallback(async (
    eventNo: number,
    heatNum: number,
    actualEnd: Date
  ): Promise<boolean> => {
    const { success, error: saveError } = await saveActualTimeToDb(eventNo, heatNum, actualEnd);
    
    if (saveError) {
      setError(saveError);
      return false;
    }
    
    // Realtime 會自動更新本地狀態，這裡不需要手動更新
    return success;
  }, []);

  // 移除實際結束時間
  const removeActualTime = useCallback(async (
    eventNo: number,
    heatNum: number
  ): Promise<boolean> => {
    const { success, error: removeError } = await removeActualTimeFromDb(eventNo, heatNum);
    
    if (removeError) {
      setError(removeError);
      return false;
    }
    
    // Realtime 會自動更新本地狀態
    return success;
  }, []);

  // 清除所有實際結束時間
  const clearAllActualTimes = useCallback(async (): Promise<boolean> => {
    const { success, error: clearError } = await clearAllActualTimesFromDb();
    
    if (clearError) {
      setError(clearError);
      return false;
    }
    
    // 清除成功後，重新載入資料以確保狀態同步
    const { data } = await loadAllActualTimesFromDb();
    setActualTimes(data);
    setActualTimeCount(data.size);
    
    return success;
  }, []);

  // 取得特定組別的實際結束時間
  const getActualTime = useCallback((eventNo: number, heatNum: number): Date | undefined => {
    const key = `${eventNo}_${heatNum}`;
    return actualTimes.get(key);
  }, [actualTimes]);

  return {
    actualTimes,
    isLoading,
    error,
    actualTimeCount,
    saveActualTime,
    removeActualTime,
    clearAllActualTimes,
    getActualTime,
  };
}
