import { logger } from '@/lib/logger';
// 管理實際結束時間的資料庫同步

import { supabase } from '@/integrations/supabase/client';

export interface ActualTimeRecord {
  id: string;
  event_no: number;
  heat_num: number;
  actual_end: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 儲存實際結束時間到資料庫
 */
export const saveActualTimeToDb = async (
  eventNo: number,
  heatNum: number,
  actualEnd: Date
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // 使用 upsert 來處理新增或更新
    const { error } = await supabase
      .from('actual_times')
      .upsert(
        {
          event_no: eventNo,
          heat_num: heatNum,
          actual_end: actualEnd.toISOString(),
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'event_no,heat_num',
        }
      );

    if (error) {
      logger.error('儲存實際時間到資料庫失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('儲存實際時間失敗:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知錯誤' };
  }
};

/**
 * 從資料庫刪除實際結束時間
 */
export const removeActualTimeFromDb = async (
  eventNo: number,
  heatNum: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('actual_times')
      .delete()
      .eq('event_no', eventNo)
      .eq('heat_num', heatNum);

    if (error) {
      logger.error('刪除實際時間失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('刪除實際時間失敗:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知錯誤' };
  }
};

/**
 * 從資料庫讀取所有實際結束時間
 */
export const loadAllActualTimesFromDb = async (): Promise<{
  data: Map<string, Date>;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('actual_times')
      .select('*');

    if (error) {
      logger.error('讀取實際時間失敗:', error);
      return { data: new Map(), error: error.message };
    }

    const timeMap = new Map<string, Date>();
    if (data) {
      data.forEach((record: ActualTimeRecord) => {
        const key = `${record.event_no}_${record.heat_num}`;
        timeMap.set(key, new Date(record.actual_end));
      });
    }

    return { data: timeMap };
  } catch (error) {
    logger.error('讀取實際時間失敗:', error);
    return { data: new Map(), error: error instanceof Error ? error.message : '未知錯誤' };
  }
};

/**
 * 清除所有實際結束時間（僅限管理員）
 */
export const clearAllActualTimesFromDb = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const { error } = await supabase
      .from('actual_times')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 刪除所有記錄

    if (error) {
      logger.error('清除所有實際時間失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('清除所有實際時間失敗:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知錯誤' };
  }
};

/**
 * 從資料庫讀取實際時間數量
 */
export const getActualTimeCountFromDb = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('actual_times')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.error('讀取實際時間數量失敗:', error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    logger.error('讀取實際時間數量失敗:', error);
    return 0;
  }
};
