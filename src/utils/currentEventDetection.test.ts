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

  it('highlights next group after last actualEnd', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 9) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20), actualEnd: time(8, 18) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30) }),
      makeGroup({ eventNo: 2, heatNum: 2, scheduledStart: time(8, 30), scheduledEnd: time(8, 40) }),
    ];
    // now=8:25, 在 index 2 的區間內 → 高亮 index 2
    expect(findCurrentEventIndex(groups, time(8, 25))).toBe(2);
  });

  it('advances highlight by time when user has not entered actualEnd', () => {
    // actualEnd 停在 index 1，但時間已超過 index 2 的預估結束
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 9) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20), actualEnd: time(8, 18) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30) }),
      makeGroup({ eventNo: 2, heatNum: 2, scheduledStart: time(8, 30), scheduledEnd: time(8, 40) }),
    ];
    // now=8:35, index 2 的 scheduledEnd(8:30) 已過 → 跳到 index 3
    expect(findCurrentEventIndex(groups, time(8, 35))).toBe(3);
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

  it('actualEnd-based start takes priority over time-based', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 5) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20), actualEnd: time(8, 12) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30), actualEnd: time(8, 22) }),
      makeGroup({ eventNo: 2, heatNum: 2, scheduledStart: time(8, 30), scheduledEnd: time(8, 40) }),
    ];
    // 最後 actualEnd 在 index 2，index 3 的 scheduledEnd(8:40) 未過 → 高亮 index 3
    expect(findCurrentEventIndex(groups, time(8, 5))).toBe(3);
  });

  it('skips multiple groups when time has advanced far', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 8) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30) }),
      makeGroup({ eventNo: 2, heatNum: 2, scheduledStart: time(8, 30), scheduledEnd: time(8, 40) }),
    ];
    // actualEnd 在 index 0，now=8:25 → index 1 的 scheduledEnd(8:20) 已過，跳到 index 2
    expect(findCurrentEventIndex(groups, time(8, 25))).toBe(2);
  });
});
