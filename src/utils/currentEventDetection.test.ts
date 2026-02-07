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
    // Should return index 2 (first group without actualEnd after last finished)
    expect(findCurrentEventIndex(groups, time(8, 25))).toBe(2);
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
    // time 8:07 is between groups
    expect(findCurrentEventIndex(groups, time(8, 7))).toBe(1);
  });

  it('handles gap in actualEnd (non-contiguous completion)', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 8) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20) }), // no actualEnd
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30) }),
    ];
    // Last actualEnd is index 0, so current should be index 1
    expect(findCurrentEventIndex(groups, time(8, 25))).toBe(1);
  });

  it('returns -1 when all groups are in the past and none has actualEnd', () => {
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20) }),
    ];
    expect(findCurrentEventIndex(groups, time(18, 0))).toBe(-1);
  });

  it('actualEnd-based detection takes priority over time-based', () => {
    // Scenario: actualEnd set for first 3 groups, but current time still falls within group 1's range
    // (e.g., actualEnd was set manually in advance)
    const groups = [
      makeGroup({ eventNo: 1, heatNum: 1, scheduledStart: time(8, 0), scheduledEnd: time(8, 10), actualEnd: time(8, 5) }),
      makeGroup({ eventNo: 1, heatNum: 2, scheduledStart: time(8, 10), scheduledEnd: time(8, 20), actualEnd: time(8, 12) }),
      makeGroup({ eventNo: 2, heatNum: 1, scheduledStart: time(8, 20), scheduledEnd: time(8, 30), actualEnd: time(8, 22) }),
      makeGroup({ eventNo: 2, heatNum: 2, scheduledStart: time(8, 30), scheduledEnd: time(8, 40) }),
    ];
    // Even though time(8,5) falls in group 0's range, actualEnd says group 3 is current
    expect(findCurrentEventIndex(groups, time(8, 5))).toBe(3);
  });
});
