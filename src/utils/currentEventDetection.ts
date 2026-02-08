import { SwimGroup } from '@/types/swimming';

/**
 * 統一的「當前比賽組別」判定邏輯
 * 
 * 核心規則：
 * 1. 以最後一個有 actualEnd 的組別為起點
 * 2. 從起點的下一組開始，配合系統時間：
 *    - 若該組的預估結束時間尚未到達 → 就是當前比賽（高亮）
 *    - 若該組的預估結束時間已過但沒有 actualEnd → 繼續往後找
 *      （代表預估時間已過但使用者尚未確認，按時間推進）
 * 3. 若無任何 actualEnd，純粹依據系統時間判定
 * 4. 若全部已結束，回傳 -1
 */
export function findCurrentEventIndex(groups: SwimGroup[], now: Date): number {
  if (groups.length === 0) return -1;

  // 1. 找到最後一個有 actualEnd 的組別
  let lastFinishedIndex = -1;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].actualEnd) {
      lastFinishedIndex = i;
    }
  }

  // 2. 從起點往後，配合時間找當前比賽
  const searchStart = lastFinishedIndex >= 0 ? lastFinishedIndex + 1 : 0;

  if (searchStart >= groups.length) return -1; // 全部完成

  // 從 searchStart 開始找：第一個「預估結束時間尚未到達」的組別
  for (let i = searchStart; i < groups.length; i++) {
    const group = groups[i];
    // 如果沒有 scheduledEnd 或目前時間還沒超過預估結束 → 當前比賽
    if (!group.scheduledEnd || now < group.scheduledEnd) {
      return i;
    }
  }

  // 所有後續組別的預估結束時間都已過
  return -1;
}
