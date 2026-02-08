import { describe, it, expect } from 'vitest';
import { findCurrentEventIndex } from '@/utils/currentEventDetection';
import { SwimGroup } from '@/types/swimming';

const makeGroup = (overrides: Partial<SwimGroup> & { eventNo: number; heatNum: number }): SwimGroup => ({
  heatTotal: 3,
  ageGroup: '',
  gender: '',
  eventType: '',
  times: [],
  avgSeconds: 120,
  dayKey: 'd1',
  dayLabel: 'Day 1',
  ...overrides,
});

const time = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

describe('findCurrentEventIndex', () => {
  it('returns -1 for empty groups', () => {
    expect(findCurrentEventIndex([], new Date())).toBe(-1);
  });

  it('returns index after last actualEnd group', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 9) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20), actualEnd: time(8, 18) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30) }),
      makeGroup({ eventNo: 2, heatNum: 2, scheduledStart: time(8, 30), scheduledEnd: time(8, 40) }),
    ];
    // 最後有 actualEnd 的是 index 1 → 當前比賽 = index 2
    expect(findCurrentEventIndex(groups, time(8, 25))).toBe(2);
  });

  it('highlight stays on next group regardless of time', () => {
    // 即使當前時間已超過 index 2 的預估結束，高亮仍停在 index 2
    // 因為只有使用者手動輸入 actualEnd 才會推進
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 9) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20), actualEnd: time(8, 18) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30) }),
      makeGroup({ eventNo: 2, heatNum: 2, scheduledStart: time(8, 30), scheduledEnd: time(8, 40) }),
    ];
    // 即使 now=9:00 遠超過 index 2 的 scheduledEnd，高亮仍在 index 2
    expect(findCurrentEventIndex(groups, time(9, 0))).toBe(2);
  });

  it('returns -1 when all groups have actualEnd', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 9) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20), actualEnd: time(8, 18) }),
    ];
    expect(findCurrentEventIndex(groups, time(8, 25))).toBe(-1);
  });

  it('uses time-based detection when no actualEnd exists', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30) }),
    ];
    expect(findCurrentEventIndex(groups, time(8, 15))).toBe(1);
  });

  it('finds first upcoming group when current time is between groups', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 5) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 10), scheduledEnd: time(8, 15) }),
    ];
    expect(findCurrentEventIndex(groups, time(8, 7))).toBe(1);
  });

  it('returns -1 when all groups are in the past and none has actualEnd', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20) }),
    ];
    expect(findCurrentEventIndex(groups, time(18, 0))).toBe(-1);
  });

  it('actualEnd-based detection takes priority over time-based', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 5) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20), actualEnd: time(8, 12) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30), actualEnd: time(8, 22) }),
      makeGroup({ eventNo: 2, heatNum: 2, scheduledStart: time(8, 30), scheduledEnd: time(8, 40) }),
    ];
    // 最後有 actualEnd 的是 index 2 → 當前比賽 = index 3
    expect(findCurrentEventIndex(groups, time(8, 5))).toBe(3);
  });
});
