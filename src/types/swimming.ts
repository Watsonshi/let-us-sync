export interface SwimGroup {
  eventNo: number;
  heatNum: number;
  heatTotal: number;
  ageGroup: string;
  gender: string;
  eventType: string;
  times: number[];
  avgSeconds: number;
  dayKey: string;
  dayLabel: string;
  actualStart?: Date;
  actualEnd?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
}

export interface DayRule {
  key: string;
  label: string;
  start: number;
  end: number;
}

export interface FilterOptions {
  daySelect: string;
  ageGroupSelect: string;
  genderSelect: string;
  eventTypeSelect: string;
}

export interface ScheduleConfig {
  turnover: number;
  lunchStart: string;
  lunchEnd: string;
  fallback: string;
}