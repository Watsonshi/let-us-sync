import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RaceSyncStatus, triggerRaceScrape, getRaceSyncStatus, ScrapeResult } from '@/lib/api/raceSync';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRaceSyncStatusOptions {
  /**
   * 是否啟用自動輪詢（每 N 毫秒抓取一次外部資料）
   */
  autoPolling?: boolean;
  /**
   * 輪詢間隔（毫秒），預設 10000 (10 秒)
   */
  pollingInterval?: number;
  /**
   * 當項次變更時的回調
   */
  onEventChange?: (previousEventNo: number, newEventNo: number) => void;
}

interface UseRaceSyncStatusResult {
  /** 目前的同步狀態 */
  syncStatus: RaceSyncStatus | null;
  /** 是否正在載入 */
  isLoading: boolean;
  /** 是否正在同步（抓取外部資料） */
  isSyncing: boolean;
  /** 錯誤訊息 */
  error: string | null;
  /** 最後一次同步結果 */
  lastScrapeResult: ScrapeResult | null;
  /** 手動觸發同步 */
  triggerSync: () => Promise<ScrapeResult>;
  /** 開始自動輪詢 */
  startPolling: () => void;
  /** 停止自動輪詢 */
  stopPolling: () => void;
  /** 是否正在輪詢中 */
  isPolling: boolean;
}

export function useRaceSyncStatus(options: UseRaceSyncStatusOptions = {}): UseRaceSyncStatusResult {
  const { autoPolling = false, pollingInterval = 10000, onEventChange } = options;

  const [syncStatus, setSyncStatus] = useState<RaceSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScrapeResult, setLastScrapeResult] = useState<ScrapeResult | null>(null);
  const [isPolling, setIsPolling] = useState(autoPolling);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousEventNoRef = useRef<number | null>(null);

  // 初始載入資料
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await getRaceSyncStatus();
      if (data) {
        setSyncStatus(data);
        previousEventNoRef.current = data.current_event_no;
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  // 訂閱 Realtime 更新
  useEffect(() => {
    const channel = supabase
      .channel('race-sync-status-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'race_sync_status' },
        (payload: RealtimePostgresChangesPayload<RaceSyncStatus>) => {
          console.log('Race sync status Realtime update:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new as RaceSyncStatus;
            setSyncStatus(newData);

            // 檢查項次是否變更
            if (
              onEventChange &&
              previousEventNoRef.current !== null &&
              newData.current_event_no !== null &&
              previousEventNoRef.current !== newData.current_event_no
            ) {
              onEventChange(previousEventNoRef.current, newData.current_event_no);
            }

            previousEventNoRef.current = newData.current_event_no;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onEventChange]);

  // 觸發同步
  const triggerSync = useCallback(async (): Promise<ScrapeResult> => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await triggerRaceScrape();
      setLastScrapeResult(result);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      const failResult: ScrapeResult = {
        success: false,
        error: errorMsg,
        currentEventNo: null,
        inspectionEventNo: null,
        rawCurrentText: null,
        rawInspectionText: null,
      };
      setLastScrapeResult(failResult);
      return failResult;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 開始輪詢
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    setIsPolling(true);
    pollingRef.current = setInterval(() => {
      triggerSync();
    }, pollingInterval);

    // 立即執行一次
    triggerSync();
  }, [pollingInterval, triggerSync]);

  // 停止輪詢
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // 自動輪詢
  useEffect(() => {
    if (autoPolling) {
      startPolling();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [autoPolling, startPolling]);

  return {
    syncStatus,
    isLoading,
    isSyncing,
    error,
    lastScrapeResult,
    triggerSync,
    startPolling,
    stopPolling,
    isPolling,
  };
}
