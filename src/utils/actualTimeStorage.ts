// 管理實際結束時間的本地儲存

const STORAGE_KEY = 'swimming_actual_times';

interface ActualTimeRecord {
  [key: string]: string; // key: "eventNo_heatNum", value: ISO date string
}

/**
 * 儲存實際結束時間
 */
export const saveActualTime = (eventNo: number, heatNum: number, actualEnd: Date): void => {
  try {
    const key = `${eventNo}_${heatNum}`;
    const records = loadAllActualTimes();
    records[key] = actualEnd.toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('儲存實際時間失敗:', error);
  }
};

/**
 * 刪除實際結束時間
 */
export const removeActualTime = (eventNo: number, heatNum: number): void => {
  try {
    const key = `${eventNo}_${heatNum}`;
    const records = loadAllActualTimes();
    delete records[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('刪除實際時間失敗:', error);
  }
};

/**
 * 讀取特定項次組次的實際結束時間
 */
export const loadActualTime = (eventNo: number, heatNum: number): Date | null => {
  try {
    const key = `${eventNo}_${heatNum}`;
    const records = loadAllActualTimes();
    const timeStr = records[key];
    return timeStr ? new Date(timeStr) : null;
  } catch (error) {
    console.error('讀取實際時間失敗:', error);
    return null;
  }
};

/**
 * 讀取所有實際結束時間記錄
 */
export const loadAllActualTimes = (): ActualTimeRecord => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('讀取所有實際時間失敗:', error);
    return {};
  }
};

/**
 * 清除所有實際結束時間記錄
 */
export const clearAllActualTimes = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清除所有實際時間失敗:', error);
  }
};

/**
 * 取得已記錄實際時間的數量
 */
export const getActualTimeCount = (): number => {
  const records = loadAllActualTimes();
  return Object.keys(records).length;
};
