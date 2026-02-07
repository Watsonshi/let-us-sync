import { SwimGroup } from '@/types/swimming';

/**
 * 統一的「當前比賽組別」判定邏輯
 * 
 * 優先順序：
 * 1. 找到最後一個有 actualEnd 的組別，下一個即為當前比賽
 * 2. 若無任何 actualEnd，則依據當前時間落在哪個組別的 scheduledStart ~ scheduledEnd 區間
 * 3. 若當前時間不在任何區間內，找第一個尚未開始的組別
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

  // 如果有已完成的組別，從下一個開始用時間判斷是否也已超過預估結束
  if (lastFinishedIndex >= 0) {
    const nextIndex = lastFinishedIndex + 1;
    if (nextIndex >= groups.length) {
      // 所有組別都已完成
      return -1;
    }

    // 從 nextIndex 開始，若該組的 scheduledEnd 已過且沒有 actualEnd，繼續往後找
    for (let i = nextIndex; i < groups.length; i++) {
      const group = groups[i];
      // 如果這組沒有 scheduledEnd 或當前時間還沒超過預估結束，就是當前比賽
      if (!group.scheduledEnd || now < group.scheduledEnd) {
        return i;
      }
    }

    // 所有後續組別的預估結束時間都已過
    return -1;
  }

  // 2. 沒有任何 actualEnd，用時間判斷
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!group.scheduledStart || !group.scheduledEnd) continue;
    if (now >= group.scheduledStart && now < group.scheduledEnd) {
      return i;
    }
  }

  // 3. 找第一個尚未開始的組別
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group.scheduledStart && now < group.scheduledStart) {
      return i;
    }
  }

  // 4. 全部已結束
  return -1;
}
