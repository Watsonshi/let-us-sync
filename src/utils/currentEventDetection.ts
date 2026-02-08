import { SwimGroup } from '@/types/swimming';

/**
 * 統一的「當前比賽組別」判定邏輯
 * 
 * 核心規則：
 * 1. 找到最後一個有 actualEnd 的組別 → 下一個就是「當前比賽」
 *    （不再用時間跳過後續組別，因為預估時間已根據 actualEnd 重算）
 * 2. 若無任何 actualEnd，則依據當前時間判定
 * 3. 若全部已結束，回傳 -1
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

  // 有已完成的組別 → 下一個即為當前比賽
  if (lastFinishedIndex >= 0) {
    const nextIndex = lastFinishedIndex + 1;
    return nextIndex < groups.length ? nextIndex : -1;
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
