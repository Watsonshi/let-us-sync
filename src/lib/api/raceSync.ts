import { supabase } from '@/integrations/supabase/client';

export interface RaceSyncStatus {
  id: string;
  current_event_no: number | null;
  inspection_event_no: number | null;
  raw_current_text: string | null;
  raw_inspection_text: string | null;
  last_synced_at: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeResult {
  currentEventNo: number | null;
  inspectionEventNo: number | null;
  rawCurrentText: string | null;
  rawInspectionText: string | null;
  success: boolean;
  error?: string;
  previousEventNo?: number | null;
  autoUpdatedEventNo?: number | null;
  message?: string;
}

/**
 * 呼叫 Edge Function 抓取外部比賽資訊
 */
export async function triggerRaceScrape(): Promise<ScrapeResult> {
  try {
    const { data, error } = await supabase.functions.invoke('scrape-race-info');

    if (error) {
      logger.error('Error invoking scrape-race-info:', error);
      return {
        success: false,
        error: error.message,
        currentEventNo: null,
        inspectionEventNo: null,
        rawCurrentText: null,
        rawInspectionText: null,
      };
    }

    return data as ScrapeResult;
  } catch (err) {
    logger.error('Error calling scrape-race-info:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      currentEventNo: null,
      inspectionEventNo: null,
      rawCurrentText: null,
      rawInspectionText: null,
    };
  }
}

/**
 * 從資料庫取得目前的同步狀態
 */
export async function getRaceSyncStatus(): Promise<RaceSyncStatus | null> {
  const { data, error } = await supabase
    .from('race_sync_status')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching race sync status:', error);
    return null;
  }

  return data as RaceSyncStatus | null;
}
